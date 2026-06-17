import { BotContext, BotMiddleware } from '../bot.js';
import { prisma } from '../db.js';
import { registerUser } from '../services/userService.js';
import { createFraudAlert, checkIpAbuse } from '../services/fraudService.js';
import { logActivity } from '../services/transactionService.js';
import { logger } from '../utils/logger.js';

/**
 * Auth middleware: ensures user is registered in DB.
 */
export const authMiddleware: BotMiddleware = async (ctx, next) => {
  if (!ctx.from || !ctx.chat) {
    return next();
  }

  const telegramId = ctx.from.id;
  const chatId = ctx.chat.id;

  try {
    // Check if user exists
    let user = await prisma.botUser.findUnique({ where: { telegramId } });

    // Handle /start command — may need to register
    if (!user) {
      // Extract referral code from /start payload
      let referralCode: string | undefined;
      if (ctx.message && 'text' in ctx.message) {
        const match = ctx.message.text.match(/^\/start\s+(.+)$/);
        if (match && match[1]) {
          referralCode = match[1];
          // Skip generic payloads
          if (['start', 'help', 'menu'].includes(referralCode.toLowerCase())) {
            referralCode = undefined;
          }
        }
      }

      try {
        user = await registerUser({
          telegramId,
          username: ctx.from.username ?? null,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name ?? null,
          chatId,
          referredBy: referralCode,
        });
        logger.info(`New user registered: ${telegramId} (@${ctx.from.username || 'no-username'})`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith('DEVICE_LIMIT')) {
          await ctx.reply('🚫 Maximum account limit reached for this device. You can only have 2 accounts per device.');
          await createFraudAlert({
            telegramId,
            type: 'multi_account',
            severity: 'high',
            details: { action: 'register', message: msg },
          });
          return;
        }
        throw err;
      }
    }

    // Check if blocked
    if (user.isBlocked) {
      await ctx.reply(`🚫 Your account has been restricted.\nReason: ${user.blockReason || 'Violation of terms'}`);
      return;
    }

    // Attach user to context
    ctx.dbUser = {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      balance: user.balance,
      totalEarned: user.totalEarned,
      vipLevel: user.vipLevel,
      referralCode: user.referralCode,
      referralCount: user.referralCount,
      referredBy: user.referredBy,
      isBlocked: user.isBlocked,
    };

    // Check IP abuse (fire and forget)
    const ipAddr = user.ipAddress ?? '';
    if (ipAddr) {
      checkIpAbuse(ipAddr, user.id).then(async (isAbuse) => {
        if (isAbuse) {
          await createFraudAlert({
            userId: user.id,
            telegramId,
            type: 'ip_abuse',
            severity: 'medium',
            details: { ip: ipAddr },
          });
        }
      }).catch(() => {});
    }

    // Log activity
    logActivity(telegramId, ctx.updateType, { chatId }, user.ipAddress ?? undefined).catch(() => {});

    return next();
  } catch (err) {
    logger.error('Auth middleware error', { error: String(err), telegramId });
    await ctx.reply('⚠️ Could not verify your account. Please try again.');
  }
};