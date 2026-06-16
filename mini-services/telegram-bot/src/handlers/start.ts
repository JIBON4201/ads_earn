import { BotContext, BotMiddleware } from '../bot.js';
import { ik } from '../utils/keyboard.js';

const MENU_KEYBOARD = ik([
  [['🎬 Watch Ad', 'menu:watch_ad'], ['💰 Balance', 'menu:balance']],
  [['👑 VIP Upgrade', 'menu:vip'], ['💸 Withdraw', 'menu:withdraw']],
  [['🎁 Referral', 'menu:referral'], ['❓ Help', 'menu:help']],
]);

export function mainMenuKeyboard() {
  return MENU_KEYBOARD;
}

/**
 * /start command handler.
 */
export const startHandler: BotMiddleware = async (ctx) => {
  const user = ctx.dbUser!;

  const isNew = ctx.message && 'text' in ctx.message
    ? /^\/start\s+.+$/.test(ctx.message.text)
    : false;

  const isNewUser = user.totalEarned === 0 && user.balance === 0;

  if (isNewUser || isNew) {
    await ctx.reply(
      `🎉 Welcome to *AdEarn Bot*, ${user.firstName}!\\n\\n` +
      `Earn real money by watching ads. Watch → Earn → Withdraw!\\n\\n` +
      `🪙 Your balance: *${user.balance.toFixed(2)} TK*\\n` +
      `👑 VIP Level: *${user.vipLevel}*\\n\\n` +
      `Choose an option below to get started:`,
      { parse_mode: 'Markdown', reply_markup: MENU_KEYBOARD },
    );
  } else {
    await ctx.reply(
      `👋 Welcome back, ${user.firstName}!\\n\\n` +
      `🪙 Balance: *${user.balance.toFixed(2)} TK*\\n` +
      `💰 Total Earned: *${user.totalEarned.toFixed(2)} TK*\\n` +
      `👑 VIP Level: *${user.vipLevel}*\\n\\n` +
      `What would you like to do?`,
      { parse_mode: 'Markdown', reply_markup: MENU_KEYBOARD },
    );
  }
};