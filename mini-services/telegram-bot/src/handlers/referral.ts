import { BotContext, BotMiddleware } from '../bot.js';
import { ik } from '../utils/keyboard.js';
import { prisma } from '../db.js';
import { logActivity } from '../services/transactionService.js';

/**
 * Referral handler — shows referral link and stats.
 */
export const referralHandler: BotMiddleware = async (ctx) => {
  const user = ctx.dbUser!;

  const botUsername = (ctx as any).botInfo?.username || 'AdEarnBot';
  const referralLink = `https://t.me/${botUsername}?start=${user.referralCode}`;

  const referredUsers = await prisma.botUser.findMany({
    where: { referredBy: user.referralCode },
    select: { id: true, firstName: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const referralTransactions = await prisma.transaction.findMany({
    where: { userId: user.id, type: 'referral_bonus' },
    select: { amount: true },
  });

  const totalReferralEarnings = referralTransactions.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

  let msg = `🎁 *Referral Program*\\n\\n`;
  msg += `🔗 *Your Referral Link:*\\n${referralLink}\\n\\n`;
  msg += `📊 *Your Stats:*\\n`;
  msg += `👥 Total Referrals: *${user.referralCount}*\\n`;
  msg += `💰 Referral Earnings: *${totalReferralEarnings.toFixed(2)} TK*\\n\\n`;

  if (referredUsers.length > 0) {
    msg += `*Recent Referrals:*\\n`;
    for (const ref of referredUsers) {
      msg += `  • ${ref.firstName} — ${ref.createdAt.toLocaleDateString()}\\n`;
    }
    msg += '\\n';
  }

  msg += `Share your link with friends and earn bonus points for each referral!`;

  const keyboard = ik([
    [[`📋 Copy Link`, `referral:copy:${user.referralCode}`]],
    [['🔙 Main Menu', 'menu:main']],
  ]);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
  } else {
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
};

/**
 * Handle copy referral link callback.
 */
export const referralCopyCallback: BotMiddleware = async (ctx) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const match = ctx.callbackQuery.data.match(/^referral:copy:(.+)$/);
  if (!match) return;

  const referralCode = match[1];
  const botUsername = (ctx as any).botInfo?.username || 'AdEarnBot';
  const referralLink = `https://t.me/${botUsername}?start=${referralCode}`;

  try {
    await ctx.answerCbQuery(referralLink, { show_alert: true });
  } catch {
    await ctx.answerCbQuery('Link copied! Check above.');
  }

  await logActivity(ctx.dbUser!.telegramId, 'referral_link_copied', { referralCode });
};