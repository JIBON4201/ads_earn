import { BotContext, BotMiddleware } from '../bot.js';
import { ik } from '../utils/keyboard.js';
import { getAllTiers, getCurrentTier, initiateUpgrade, confirmUpgrade } from '../services/vipService.js';
import { logActivity } from '../services/transactionService.js';
import { logger } from '../utils/logger.js';

const BACK_KEYBOARD = ik([[['🔙 Main Menu', 'menu:main']]]);

/**
 * VIP upgrade handler — shows current tier and available upgrades.
 */
export const vipHandler: BotMiddleware = async (ctx) => {
  const user = ctx.dbUser!;

  const tiers = await getAllTiers();
  const currentTier = await getCurrentTier(user.vipLevel);

  if (tiers.length === 0) {
    if (ctx.callbackQuery) {
      await ctx.editMessageText('👑 No VIP tiers available at the moment.', { reply_markup: BACK_KEYBOARD });
    } else {
      await ctx.reply('👑 No VIP tiers available at the moment.', { reply_markup: BACK_KEYBOARD });
    }
    return;
  }

  let msg = `👑 *VIP Upgrade Center*\n\n`;
  msg += `Your current level: *Level ${user.vipLevel}*${currentTier ? ` — ${currentTier.name}` : ''}\n\n`;
  msg += `*Available Tiers:*\n\n`;

  const buttons: Array<Array<[string, string]>> = [];

  for (const tier of tiers) {
    const isCurrent = tier.level === user.vipLevel;
    const isLower = tier.level < user.vipLevel;
    const icon = isCurrent ? '✅' : isLower ? '✓' : '⬆️';

    msg += `${icon} *Level ${tier.level} — ${tier.name}*\n`;
    msg += `   💵 Price: ${tier.price} TK\n`;
    msg += `   📊 Daily Limit: ${tier.dailyAdLimit} ads\n`;
    msg += `   🚀 Reward Boost: +${tier.rewardBoost}%\n\n`;

    if (!isCurrent && !isLower) {
      buttons.push([[`👑 Upgrade to ${tier.name} (${tier.price} TK)`, `vip:upgrade:${tier.level}`]]);
    }
  }

  buttons.push([['🔙 Main Menu', 'menu:main']]);
  const keyboard = ik(buttons);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
  } else {
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
};

/**
 * Handle VIP upgrade selection callback.
 */
export const vipUpgradeCallback: BotMiddleware = async (ctx) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const match = ctx.callbackQuery.data.match(/^vip:upgrade:(\d+)$/);
  if (!match) return;

  const toLevel = parseInt(match[1], 10);
  const user = ctx.dbUser!;

  try {
    const { payment, tier } = await initiateUpgrade(user.id, toLevel);

    const keyboard = ik([
      [[`✅ Confirm Payment (${tier.price} TK)`, `vip:confirm:${payment.id}`], ['❌ Cancel', 'menu:vip']],
      [['🔙 Main Menu', 'menu:main']],
    ]);

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      `💳 *Confirm VIP Upgrade*\n\n` +
      `Upgrading from Level ${payment.fromLevel} → *Level ${tier.level} ${tier.name}*\n` +
      `💵 Amount: *${tier.price} TK*\n\n` +
      `🪙 Daily Ad Limit: ${tier.dailyAdLimit}\n` +
      `🚀 Reward Boost: +${tier.rewardBoost}%\n\n` +
      `*In production, you would be redirected to bKash/Nagad/Rocket.*\n` +
      `Click "Confirm Payment" to simulate payment.`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'INVALID_UPGRADE') {
      await ctx.answerCbQuery('Invalid upgrade!', { show_alert: true });
    } else if (msg === 'TIER_NOT_FOUND') {
      await ctx.answerCbQuery('Tier not found!', { show_alert: true });
    } else if (msg === 'PENDING_PAYMENT_EXISTS') {
      await ctx.answerCbQuery('You already have a pending payment! Complete it first.', { show_alert: true });
    } else {
      logger.error('vipUpgradeCallback error', { error: msg, userId: user.id });
      await ctx.answerCbQuery('An error occurred. Please try again.');
    }
  }
};

/**
 * Handle VIP payment confirmation callback.
 */
export const vipConfirmCallback: BotMiddleware = async (ctx) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const match = ctx.callbackQuery.data.match(/^vip:confirm:(.+)$/);
  if (!match) return;

  const paymentId = match[1];
  const user = ctx.dbUser!;

  try {
    const { tier } = await confirmUpgrade(paymentId);

    await logActivity(user.telegramId, 'vip_upgrade', { paymentId, toLevel: tier.level, tierName: tier.name });

    const keyboard = ik([
      [['🎬 Watch Ad', 'menu:watch_ad'], ['🔙 Main Menu', 'menu:main']],
    ]);

    await ctx.answerCbQuery('🎉 VIP Upgrade successful!');
    await ctx.editMessageText(
      `🎉 *VIP Upgrade Successful!*\n\n` +
      `You are now *${tier.name} (Level ${tier.level})*!\n\n` +
      `📊 New Daily Ad Limit: *${tier.dailyAdLimit}*\n` +
      `🚀 New Reward Boost: *+${tier.rewardBoost}%*\n\n` +
      `Start earning more now!`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('vipConfirmCallback error', { error: msg, paymentId });
    await ctx.answerCbQuery('Payment confirmation failed. Please try again.');
  }
};