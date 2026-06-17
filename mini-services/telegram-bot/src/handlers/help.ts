import { BotContext, BotMiddleware } from '../bot.js';
import { ik } from '../utils/keyboard.js';

const HELP_TEXT = `❓ *Help & FAQ*\n\n` +
  `*How does AdEarn work?*\n` +
  `1️⃣ Watch sponsored ads\n` +
  `2️⃣ Earn points for each ad\n` +
  `3️⃣ Withdraw your earnings via bKash/Nagad/Rocket\n\n` +
  `*How to watch ads?*\n` +
  `Tap "🎬 Watch Ad" from the main menu, click "Watch Now",\n` +
  `open the ad link, wait the required time, then click "I Watched It".\n\n` +
  `*What is VIP?*\n` +
  `VIP members get higher daily ad limits and bonus reward percentages!\n\n` +
  `*How do referrals work?*\n` +
  `Share your unique referral link. When someone joins via your link,\n` +
  `you earn a bonus reward automatically!\n\n` +
  `*Minimum withdrawal:* 50 TK\n` +
  `*Payment methods:* bKash, Nagad, Rocket\n` +
  `*Processing time:* 24-48 hours\n\n` +
  `*Need more help?*\n` +
  `Contact support: @AdEarnSupport`;

/**
 * /help command and help button handler.
 */
export const helpHandler: BotMiddleware = async (ctx) => {
  const keyboard = ik([[['🔙 Main Menu', 'menu:main']]]);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(HELP_TEXT, { parse_mode: 'Markdown', reply_markup: keyboard });
  } else {
    await ctx.reply(HELP_TEXT, { parse_mode: 'Markdown', reply_markup: keyboard });
  }
};