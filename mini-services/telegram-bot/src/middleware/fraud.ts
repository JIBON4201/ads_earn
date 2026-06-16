import { BotContext, BotMiddleware } from '../bot.js';
import { createFraudAlert, checkBehaviorAnomaly } from '../services/fraudService.js';
import { logger } from '../utils/logger.js';

/**
 * Fraud detection middleware — runs on sensitive actions.
 */
export const fraudMiddleware: BotMiddleware = async (ctx, next) => {
  if (!ctx.dbUser) return next();

  try {
    const action = ctx.updateType;
    const isAnomaly = await checkBehaviorAnomaly(ctx.dbUser.id, action);

    if (isAnomaly) {
      await createFraudAlert({
        userId: ctx.dbUser.id,
        telegramId: ctx.dbUser.telegramId,
        type: 'behavior_anomaly',
        severity: 'medium',
        details: {
          action,
          update: JSON.stringify(ctx.update).substring(0, 500),
        },
      });
    }

    return next();
  } catch (err) {
    logger.error('Fraud middleware error', { error: String(err) });
    return next();
  }
};