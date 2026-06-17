import { prisma } from '../db.js';

/**
 * Get all VIP tiers.
 */
export async function getAllTiers() {
  return prisma.vipTier.findMany({
    where: { isActive: true },
    orderBy: { level: 'asc' },
  });
}

/**
 * Get user's current VIP tier info.
 */
export async function getCurrentTier(level: number) {
  return prisma.vipTier.findUnique({ where: { level } });
}

/**
 * Get the next available upgrade tier for a user.
 */
export async function getNextTier(currentLevel: number) {
  return prisma.vipTier.findFirst({
    where: {
      isActive: true,
      level: { gt: currentLevel },
    },
    orderBy: { level: 'asc' },
  });
}

/**
 * Initiate a VIP upgrade (creates a pending payment record).
 * In production, this would redirect to bKash/Nagad/Rocket payment.
 */
export async function initiateUpgrade(
  userId: string,
  toLevel: number,
) {
  const user = await prisma.botUser.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  if (toLevel <= user.vipLevel) throw new Error('INVALID_UPGRADE');

  const tier = await prisma.vipTier.findUnique({ where: { level: toLevel } });
  if (!tier) throw new Error('TIER_NOT_FOUND');

  // Check for existing pending payment
  const existingPending = await prisma.vipPayment.findFirst({
    where: {
      userId,
      status: 'pending',
    },
  });

  if (existingPending) {
    throw new Error('PENDING_PAYMENT_EXISTS');
  }

  // Create payment record
  const payment = await prisma.vipPayment.create({
    data: {
      userId,
      fromLevel: user.vipLevel,
      toLevel,
      amount: tier.price,
      status: 'pending',
    },
  });

  return { payment, tier };
}

/**
 * Simulate confirming a VIP payment and upgrading the user.
 * In production, this would be called by a payment callback webhook.
 */
export async function confirmUpgrade(paymentId: string) {
  const payment = await prisma.vipPayment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });

  if (!payment) throw new Error('PAYMENT_NOT_FOUND');
  if (payment.status !== 'pending') throw new Error('PAYMENT_NOT_PENDING');

  const tier = await prisma.vipTier.findUnique({ where: { level: payment.toLevel } });
  if (!tier) throw new Error('TIER_NOT_FOUND');

  // Update payment status
  await prisma.vipPayment.update({
    where: { id: paymentId },
    data: { status: 'confirmed' },
  });

  // Upgrade user
  await prisma.botUser.update({
    where: { id: payment.userId },
    data: { vipLevel: payment.toLevel },
  });

  // Log transaction
  await prisma.transaction.create({
    data: {
      userId: payment.userId,
      type: 'vip_purchase',
      amount: -payment.amount,
      balanceAfter: payment.user.balance,
      description: `VIP upgrade from Level ${payment.fromLevel} to Level ${payment.toLevel} (${tier.name})`,
      metadata: JSON.stringify({ paymentId, tierName: tier.name }),
    },
  });

  return { payment, tier };
}