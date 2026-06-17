import { BotContext, BotMiddleware } from '../bot.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { logger } from '../utils/logger.js';

interface RateLimitMiddlewareOptions {
  action: string;
  maxRequests?: number;
}

/**
 * Creates a rate-limiting middleware for a specific action.
 */
export function rateLimitMiddleware(options: RateLimitMiddlewareOptions): BotMiddleware {
  return async (ctx, next) => {
    if (!ctx.dbUser) return next();

    try {
      const { allowed } = await checkRateLimit(
        ctx.dbUser.id,
        options.action,
        options.maxRequests,
      );

      if (!allowed) {
        await ctx.answerCbQuery?.('⏳ Too many requests! Please wait a minute.');
        await ctx.reply('⏳ You are doing this too fast. Please wait a moment and try again.');
        logger.warn(`Rate limited: user ${ctx.dbUser.telegramId} for ${options.action}`);
        return;
      }

      return next();
    } catch (err) {
      logger.error('Rate limit middleware error', { error: String(err) });
      return next();
    }
  };
}