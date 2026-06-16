import { BotContext, BotMiddleware } from '../bot.js';
import { ik } from '../utils/keyboard.js';
import { mainMenuKeyboard } from './start.js';

const BALANCE_KEYBOARD = ik([
  [['💸 Withdraw', 'menu:withdraw'], ['🎬 Watch Ad', 'menu:watch_ad']],
  [['🔙 Main Menu', 'menu:main']],
]);

/**
 * /balance command and balance button handler.
 */
export const balanceHandler: BotMiddleware = async (ctx) => {
  const user = ctx.dbUser!;

  const text =
    `💰 *Your Balance*\n\n` +
    `🪙 Available Balance: *${user.balance.toFixed(2)} TK*\n` +
    `📊 Total Earned: *${user.totalEarned.toFixed(2)} TK*\n` +
    `👑 VIP Level: *${user.vipLevel}*\n\n` +
    `Keep watching ads to earn more!`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: BALANCE_KEYBOARD });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: BALANCE_KEYBOARD });
  }
};

/**
 * Main menu callback (back button).
 */
export const mainMenuCallback: BotMiddleware = async (ctx) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  await ctx.answerCbQuery();

  const user = ctx.dbUser!;
  const text =
    `👋 Welcome back, ${user.firstName}!\n\n` +
    `🪙 Balance: *${user.balance.toFixed(2)} TK*\n` +
    `💰 Total Earned: *${user.totalEarned.toFixed(2)} TK*\n` +
    `👑 VIP Level: *${user.vipLevel}*\n\n` +
    `What would you like to do?`;

  await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard() });
};