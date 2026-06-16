import dotenv from 'dotenv';
dotenv.config();

import { createBot } from './src/bot.js';
import { disconnectDb } from './src/db.js';
import { logger } from './src/utils/logger.js';

// Middleware
import { authMiddleware } from './src/middleware/auth.js';
import { rateLimitMiddleware } from './src/middleware/rateLimit.js';
import { fraudMiddleware } from './src/middleware/fraud.js';

// Handlers
import { startHandler } from './src/handlers/start.js';
import { balanceHandler, mainMenuCallback } from './src/handlers/balance.js';
import { watchAdHandler, adWatchCallback, adClaimCallback } from './src/handlers/watchAd.js';
import { vipHandler, vipUpgradeCallback, vipConfirmCallback } from './src/handlers/vip.js';
import {
  withdrawHandler,
  withdrawTextHandler,
  withdrawMethodCallback,
  withdrawConfirmCallback,
} from './src/handlers/withdraw.js';
import { referralHandler, referralCopyCallback } from './src/handlers/referral.js';
import { helpHandler } from './src/handlers/help.js';

// ─── Bootstrap ───────────────────────────────────────────────────────

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
  logger.error('BOT_TOKEN is not set in .env file!');
  process.exit(1);
}

const bot = createBot(BOT_TOKEN);

// ─── Global Middleware ───────────────────────────────────────────────

bot.use(authMiddleware as any);

// ─── Command Handlers ────────────────────────────────────────────────

bot.command('start', startHandler as any);
bot.command('help', helpHandler as any);
bot.command('balance', balanceHandler as any);

// ─── Text Message Handler (for withdrawal flow) ──────────────────────

bot.on('text', async (ctx: any, next: any) => {
  if (ctx.message?.text && !ctx.message.text.startsWith('/')) {
    return withdrawTextHandler(ctx, next);
  }
  return next();
});

// ─── Callback Query Handlers ────────────────────────────────────────

// Rate-limited callbacks for sensitive actions
bot.action(/^ad:watch:/, rateLimitMiddleware({ action: 'watch_ad', maxRequests: 30 }) as any, adWatchCallback as any);
bot.action(/^ad:claim:/, rateLimitMiddleware({ action: 'claim_reward', maxRequests: 30 }) as any, adClaimCallback as any);

// VIP callbacks
bot.action(/^vip:upgrade:/, rateLimitMiddleware({ action: 'vip_upgrade', maxRequests: 5 }) as any, vipUpgradeCallback as any);
bot.action(/^vip:confirm:/, rateLimitMiddleware({ action: 'vip_confirm', maxRequests: 5 }) as any, vipConfirmCallback as any);

// Withdrawal callbacks
bot.action(/^withdraw:method:/, withdrawMethodCallback as any);
bot.action('withdraw:confirm', rateLimitMiddleware({ action: 'withdraw', maxRequests: 5 }) as any, withdrawConfirmCallback as any);

// Referral callbacks
bot.action(/^referral:copy:/, referralCopyCallback as any);

// Menu navigation callbacks — each menu item registered directly
bot.action('menu:main', mainMenuCallback as any);
bot.action('menu:watch_ad', fraudMiddleware as any, watchAdHandler as any);
bot.action('menu:balance', balanceHandler as any);
bot.action('menu:vip', vipHandler as any);
bot.action('menu:withdraw', rateLimitMiddleware({ action: 'withdraw', maxRequests: 5 }) as any, withdrawHandler as any);
bot.action('menu:referral', referralHandler as any);
bot.action('menu:help', helpHandler as any);

// ─── Start Polling ──────────────────────────────────────────────────

async function main() {
  logger.info('Starting AdEarn Telegram Bot...');

  // Verify database connection
  try {
    await (await import('./src/db.js')).prisma.$connect();
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error('Failed to connect to database', { error: String(err) });
    process.exit(1);
  }

  // Start bot
  try {
    await bot.launch();
    const me = await bot.telegram.getMe();
    logger.info(`Bot started as @${me.username}`);
  } catch (err) {
    logger.error('Failed to start bot', { error: String(err) });
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    try {
      bot.stop(signal as any);
      await disconnectDb();
      logger.info('Bot stopped gracefully');
    } catch (err) {
      logger.error('Error during shutdown', { error: String(err) });
    }
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Fatal error in main()', { error: String(err) });
  process.exit(1);
});