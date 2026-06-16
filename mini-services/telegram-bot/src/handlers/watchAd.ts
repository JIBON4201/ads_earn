import { BotContext, BotMiddleware } from '../bot.js';
import { ik } from '../utils/keyboard.js';
import { getAvailableAds, startWatchingAd, completeAdWatch } from '../services/adService.js';
import { logActivity } from '../services/transactionService.js';
import { mainMenuKeyboard } from './start.js';
import { logger } from '../utils/logger.js';

const BACK_KEYBOARD = ik([[['🔙 Main Menu', 'menu:main']]]);

/**
 * Show available ads and start the watch flow.
 */
export const watchAdHandler: BotMiddleware = async (ctx) => {
  const user = ctx.dbUser!;

  const { ads, todayWatchCount, dailyLimit, limitReached } = await getAvailableAds(user.id, user.vipLevel);

  if (limitReached) {
    const keyboard = ik([
      [['👑 Upgrade VIP for more', 'menu:vip']],
      [['🔙 Main Menu', 'menu:main']],
    ]);
    const text =
      `⏰ *Daily Ad Limit Reached*\\n\\n` +
      `You have watched *${todayWatchCount}/${dailyLimit}* ads today.\\n\\n` +
      `Upgrade your VIP level to increase your daily limit!`;
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
    return;
  }

  if (ads.length === 0) {
    const text =
      `📭 *No Ads Available*\\n\\n` +
      `There are no active ads at the moment. Please check back later!`;
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: BACK_KEYBOARD });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: BACK_KEYBOARD });
    }
    return;
  }

  const ad = ads[0];
  const remaining = dailyLimit - todayWatchCount;

  const keyboard = ik([
    [[`▶️ Watch Now (${ad.requiredSeconds}s)`, `ad:watch:${ad.id}`]],
    [['🔙 Main Menu', 'menu:main']],
  ]);

  const text =
    `🎬 *Watch Ad & Earn*\\n\\n` +
    `📌 *${ad.title}*\\n` +
    `💰 Reward: *${ad.rewardPoints.toFixed(2)} TK*\\n` +
    `⏱ Duration: *${ad.requiredSeconds} seconds*\\n` +
    `📊 Today: *${todayWatchCount}/${dailyLimit}* (remaining: ${remaining})\\n\\n` +
    `Click "Watch Now" to start watching this ad.`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
};

/**
 * Handle the "Watch Now" callback — starts the ad session.
 */
export const adWatchCallback: BotMiddleware = async (ctx) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const match = ctx.callbackQuery.data.match(/^ad:watch:(.+)$/);
  if (!match) return;

  const adId = match[1];
  const user = ctx.dbUser!;

  try {
    const { watch, ad } = await startWatchingAd(user.id, adId);

    const keyboard = ik([
      [[`✅ I Watched It (${ad.requiredSeconds}s)`, `ad:claim:${watch.id}:${ad.requiredSeconds}`]],
      [['❌ Cancel', 'menu:watch_ad']],
    ]);

    await ctx.answerCbQuery('▶️ Ad session started! Watch the ad now.');
    await ctx.editMessageText(
      `▶️ *Ad Session Started*\\n\\n` +
      `📌 *${ad.title}*\\n` +
      `💰 Reward: *${ad.rewardPoints.toFixed(2)} TK*\\n\\n` +
      `1️⃣ Open the ad link below\\n` +
      `2️⃣ Watch for *${ad.requiredSeconds} seconds*\\n` +
      `3️⃣ Click "I Watched It" to claim your reward\\n\\n` +
      `🔗 [Open Ad](${ad.url})\\n\\n` +
      `⏳ Waiting for you to finish...`,
      {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        reply_markup: keyboard,
      },
    );

    await logActivity(user.telegramId, 'ad_watch_start', { adId, watchId: watch.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'ALREADY_WATCHED_TODAY') {
      await ctx.answerCbQuery('You already watched this ad today!', { show_alert: true });
    } else if (msg === 'AD_NOT_FOUND') {
      await ctx.answerCbQuery('This ad is no longer available.', { show_alert: true });
    } else {
      logger.error('adWatchCallback error', { error: msg, adId, userId: user.id });
      await ctx.answerCbQuery('An error occurred. Please try again.');
    }
  }
};

/**
 * Handle the "I Watched It" callback — validates time and grants reward.
 */
export const adClaimCallback: BotMiddleware = async (ctx) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const match = ctx.callbackQuery.data.match(/^ad:claim:([^:]+):(\d+)$/);
  if (!match) return;

  const watchId = match[1];
  const user = ctx.dbUser!;

  try {
    const { pointsEarned, boost, adTitle } = await completeAdWatch(watchId, user.id, user.vipLevel);

    const boostText = boost > 0 ? ` (with ${boost}% VIP boost!)` : '';

    const keyboard = ik([
      [['🎬 Watch Another', 'menu:watch_ad'], ['💰 Balance', 'menu:balance']],
      [['🔙 Main Menu', 'menu:main']],
    ]);

    await ctx.answerCbQuery(`🎉 +${pointsEarned.toFixed(2)} TK earned!`);

    await ctx.editMessageText(
      `✅ *Reward Claimed!*\\n\\n` +
      `📌 Ad: *${adTitle}*\\n` +
      `💰 Earned: *+${pointsEarned.toFixed(2)} TK*${boostText}\\n` +
      `🪙 New Balance: *${(user.balance + pointsEarned).toFixed(2)} TK*\\n\\n` +
      `Great job! Keep watching ads to earn more!`,
      { parse_mode: 'Markdown', reply_markup: keyboard },
    );

    await logActivity(user.telegramId, 'ad_reward_claimed', { watchId, pointsEarned, boost });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'ALREADY_CLAIMED') {
      await ctx.answerCbQuery('You already claimed this reward!', { show_alert: true });
    } else if (msg.startsWith('TOO_EARLY')) {
      const seconds = msg.split(':')[1];
      await ctx.answerCbQuery(`⏳ Please wait at least ${seconds} seconds before claiming!`, { show_alert: true });
    } else if (msg === 'WATCH_NOT_FOUND') {
      await ctx.answerCbQuery('Watch session not found.', { show_alert: true });
    } else {
      logger.error('adClaimCallback error', { error: msg, watchId, userId: user.id });
      await ctx.answerCbQuery('An error occurred. Please try again.');
    }
  }
};