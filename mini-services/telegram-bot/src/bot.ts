import { Telegraf, Context } from 'telegraf';
import { logger } from './utils/logger.js';

export type BotContext = Context & {
  dbUser?: {
    id: string;
    telegramId: number;
    username: string | null;
    firstName: string;
    lastName: string | null;
    balance: number;
    totalEarned: number;
    vipLevel: number;
    referralCode: string;
    referralCount: number;
    referredBy: string | null;
    isBlocked: boolean;
  };
};

export type BotMiddleware = (ctx: BotContext, next: () => Promise<void>) => Promise<unknown>;

export function createBot(token: string): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(token);

  bot.use(async (ctx: BotContext, next) => {
    const start = Date.now();
    try {
      await next();
    } catch (err) {
      logger.error(`Unhandled error in bot middleware`, { error: String(err), update: ctx.updateType });
      try {
        await ctx.reply('⚠️ An unexpected error occurred. Please try again later.');
      } catch {
        // ignore reply errors
      }
    }
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`Slow handler: ${ctx.updateType} took ${duration}ms`);
    }
  });

  // Catch unhandled errors from Telegraf
  bot.catch((err) => {
    logger.error('Bot catch handler', { error: String(err) });
  });

  return bot;
}