import { BotContext, BotMiddleware } from '../bot.js';
import { ik } from '../utils/keyboard.js';
import { getMinWithdrawal, createWithdrawal, PaymentMethod } from '../services/withdrawalService.js';
import { logActivity } from '../services/transactionService.js';
import { logger } from '../utils/logger.js';

const CANCEL_KEYBOARD = ik([[['❌ Cancel', 'menu:main']]]);

// Simple in-memory state for withdrawal flow (per-user)
const withdrawState = new Map<number, { step: string; data: Record<string, string> }>();

/**
 * Withdraw handler — initiates the withdrawal flow.
 */
export const withdrawHandler: BotMiddleware = async (ctx) => {
  const user = ctx.dbUser!;
  const minWithdrawal = await getMinWithdrawal();

  withdrawState.delete(user.telegramId);
  withdrawState.set(user.telegramId, { step: 'awaiting_amount', data: {} });

  const text =
    `💸 *Withdraw Funds*\\n\\n` +
    `🪙 Your Balance: *${user.balance.toFixed(2)} TK*\\n` +
    `📊 Minimum Withdrawal: *${minWithdrawal} TK*\\n\\n` +
    `Please enter the amount you want to withdraw (in TK):`;

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: CANCEL_KEYBOARD });
  } else {
    await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: CANCEL_KEYBOARD });
  }
};

/**
 * Handle text messages in the withdrawal flow.
 */
export const withdrawTextHandler: BotMiddleware = async (ctx) => {
  if (!ctx.message || !('text' in ctx.message)) return;
  const user = ctx.dbUser!;

  const state = withdrawState.get(user.telegramId);
  if (!state) return;

  const text = ctx.message.text.trim();

  switch (state.step) {
    case 'awaiting_amount': {
      const amount = parseFloat(text);
      const minWithdrawal = await getMinWithdrawal();

      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Please enter a valid amount (numbers only).');
        return;
      }

      if (amount < minWithdrawal) {
        await ctx.reply(`❌ Minimum withdrawal is ${minWithdrawal} TK. Please enter a higher amount.`);
        return;
      }

      if (amount > user.balance) {
        await ctx.reply(`❌ Insufficient balance! Your balance is ${user.balance.toFixed(2)} TK.`);
        return;
      }

      state.data.amount = amount.toFixed(2);
      state.step = 'awaiting_method';

      await ctx.reply(
        `💵 Amount: *${amount.toFixed(2)} TK*\\n\\n` +
        `Select your payment method:`,
        {
          parse_mode: 'Markdown',
          reply_markup: ik([
            [['📱 bKash', 'withdraw:method:bkash'], ['📱 Nagad', 'withdraw:method:nagad']],
            [['📱 Rocket', 'withdraw:method:rocket']],
            [['❌ Cancel', 'menu:main']],
          ]),
        },
      );
      break;
    }

    case 'awaiting_number': {
      const paymentNumber = text.replace(/\s+/g, '');

      if (!/^01[3-9]\d{8}$/.test(paymentNumber)) {
        await ctx.reply('❌ Invalid number! Please enter a valid Bangladeshi mobile number (e.g., 01712345678).');
        return;
      }

      state.data.paymentNumber = paymentNumber;
      state.step = 'confirm';

      const amount = parseFloat(state.data.amount);
      const method = state.data.method?.toUpperCase() || 'Unknown';

      await ctx.reply(
        `📝 *Confirm Withdrawal*\\n\\n` +
        `💵 Amount: *${amount.toFixed(2)} TK*\\n` +
        `📱 Method: *${method}*\\n` +
        `🔢 Number: *${paymentNumber}*\\n\\n` +
        `Is this correct?`,
        {
          parse_mode: 'Markdown',
          reply_markup: ik([
            [['✅ Confirm', 'withdraw:confirm'], ['❌ Cancel', 'menu:main']],
          ]),
        },
      );
      break;
    }
  }
};

/**
 * Handle withdrawal method selection callback.
 */
export const withdrawMethodCallback: BotMiddleware = async (ctx) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  const match = ctx.callbackQuery.data.match(/^withdraw:method:(.+)$/);
  if (!match) return;

  const method = match[1] as PaymentMethod;
  const user = ctx.dbUser!;

  const state = withdrawState.get(user.telegramId);
  if (!state || state.step !== 'awaiting_method') {
    await ctx.answerCbQuery('Session expired. Start over.');
    return;
  }

  state.data.method = method;
  state.step = 'awaiting_number';

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📱 Payment Method: *${method.toUpperCase()}*\\n\\n` +
    `Please enter your ${method.toUpperCase()} number (e.g., 01712345678):`,
    { parse_mode: 'Markdown', reply_markup: CANCEL_KEYBOARD },
  );
};

/**
 * Handle withdrawal confirmation callback.
 */
export const withdrawConfirmCallback: BotMiddleware = async (ctx) => {
  if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
  if (ctx.callbackQuery.data !== 'withdraw:confirm') return;

  const user = ctx.dbUser!;
  const state = withdrawState.get(user.telegramId);

  if (!state || state.step !== 'confirm') {
    await ctx.answerCbQuery('Session expired. Start over.');
    return;
  }

  const amount = parseFloat(state.data.amount);
  const method = state.data.method as PaymentMethod;
  const paymentNumber = state.data.paymentNumber!;

  try {
    const { withdrawal, newBalance } = await createWithdrawal(user.id, amount, method, paymentNumber);

    withdrawState.delete(user.telegramId);

    await logActivity(user.telegramId, 'withdraw_request', {
      withdrawalId: withdrawal.id,
      amount,
      method,
      paymentNumber,
    });

    await ctx.answerCbQuery('✅ Withdrawal request submitted!');
    await ctx.editMessageText(
      `✅ *Withdrawal Request Submitted!*\\n\\n` +
      `💵 Amount: *${amount.toFixed(2)} TK*\\n` +
      `📱 Method: *${method.toUpperCase()}*\\n` +
      `🔢 Number: *${paymentNumber}*\\n` +
      `🪙 Remaining Balance: *${newBalance.toFixed(2)} TK*\\n\\n` +
      `⏳ Your withdrawal is being processed. You will be notified once it's approved.\\n\\n` +
      `*Typically processed within 24-48 hours.*`,
      {
        parse_mode: 'Markdown',
        reply_markup: ik([
          [['💰 Check Balance', 'menu:balance'], ['🔙 Main Menu', 'menu:main']],
        ]),
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('withdrawConfirmCallback error', { error: msg, userId: user.id });

    if (msg === 'INSUFFICIENT_BALANCE') {
      await ctx.answerCbQuery('Insufficient balance!', { show_alert: true });
      withdrawState.delete(user.telegramId);
    } else if (msg.startsWith('MIN_WITHDRAWAL')) {
      await ctx.answerCbQuery('Amount below minimum!', { show_alert: true });
    } else {
      await ctx.answerCbQuery('An error occurred. Please try again.');
    }
  }
};