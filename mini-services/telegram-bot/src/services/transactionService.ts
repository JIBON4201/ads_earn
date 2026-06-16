import { prisma } from '../db.js';

/**
 * Log an activity.
 */
export async function logActivity(
  telegramId: number,
  action: string,
  details?: Record<string, unknown>,
  ipAddress?: string,
) {
  await prisma.activityLog.create({
    data: {
      telegramId,
      action,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
    },
  });
}

/**
 * Create a transaction record. Usually called by other services,
 * but exposed here for direct use if needed.
 */
export async function createTransaction(params: {
  userId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.transaction.create({
    data: {
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      balanceAfter: params.balanceAfter,
      description: params.description,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}