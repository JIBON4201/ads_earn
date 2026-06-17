import { prisma } from '../db.js';
import { logger } from './logger.js';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000, // 1 minute
}

/**
 * Check if a user is within rate limits for a given action.
 * Returns true if the action is ALLOWED, false if RATE LIMITED.
 */
export async function checkRateLimit(
  userId: string,
  action: string,
  customMax?: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const maxRequests = customMax ?? DEFAULT_CONFIG.maxRequests;
  const windowStart = new Date(Date.now() - DEFAULT_CONFIG.windowMs);

  // Clean up old rate limit records for this user/action
  await prisma.rateLimit.deleteMany({
    where: {
      userId,
      action,
      windowStart: { lt: windowStart },
    },
  });

  // Get or create the rate limit record for current window
  let rateLimit = await prisma.rateLimit.findFirst({
    where: {
      userId,
      action,
      windowStart: { gte: windowStart },
    },
  });

  if (!rateLimit) {
    rateLimit = await prisma.rateLimit.create({
      data: {
        userId,
        action,
        count: 1,
        windowStart: new Date(),
      },
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (rateLimit.count >= maxRequests) {
    logger.debug(`Rate limited user ${userId} for action ${action}: ${rateLimit.count}/${maxRequests}`);
    return { allowed: false, remaining: 0 };
  }

  // Increment count
  await prisma.rateLimit.update({
    where: { id: rateLimit.id },
    data: { count: { increment: 1 } },
  });

  return { allowed: true, remaining: maxRequests - rateLimit.count - 1 };
}

/**
 * Get a setting value from the database, with fallback.
 */
export async function getSetting(key: string, fallback: string = ''): Promise<string> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}