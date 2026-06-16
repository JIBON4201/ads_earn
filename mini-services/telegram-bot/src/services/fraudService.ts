import { prisma } from '../db.js';
import { logger } from '../utils/logger.js';

export type FraudType = 'multi_account' | 'ip_abuse' | 'referral_abuse' | 'rate_abuse' | 'behavior_anomaly';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Create a fraud alert.
 */
export async function createFraudAlert(params: {
  userId?: string;
  telegramId: number;
  type: FraudType;
  severity: Severity;
  details: Record<string, unknown>;
}) {
  const alert = await prisma.fraudAlert.create({
    data: {
      userId: params.userId,
      telegramId: params.telegramId,
      type: params.type,
      severity: params.severity,
      details: JSON.stringify(params.details),
    },
  });

  logger.warn(`Fraud alert created: ${params.type} [${params.severity}] for telegram ${params.telegramId}`, params.details);

  return alert;
}

/**
 * Check if a user has unresolved fraud alerts.
 */
export async function hasUnresolvedAlerts(userId: string): Promise<boolean> {
  const count = await prisma.fraudAlert.count({
    where: { userId, isResolved: false },
  });
  return count > 0;
}

/**
 * Check for suspicious IP usage — multiple users from same IP.
 */
export async function checkIpAbuse(ipAddress: string, currentUserId: string): Promise<boolean> {
  if (!ipAddress) return false;

  const usersWithSameIp = await prisma.botUser.findMany({
    where: {
      ipAddress,
      id: { not: currentUserId },
    },
    select: { id: true, telegramId: true },
  });

  if (usersWithSameIp.length >= 3) {
    return true;
  }
  return false;
}

/**
 * Detect behavior anomaly — rapid repeated actions.
 */
export async function checkBehaviorAnomaly(userId: string, action: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const logs = await prisma.activityLog.findMany({
    where: {
      telegramId: parseInt(userId, 10),
      action,
      createdAt: { gte: oneMinuteAgo },
    },
  });

  // More than 5 of the same action in a minute is suspicious
  return logs.length >= 5;
}