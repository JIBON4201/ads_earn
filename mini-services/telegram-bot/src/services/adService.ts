import { prisma } from '../db.js';

/**
 * Get available ads for a user, respecting daily limits and priority.
 */
export async function getAvailableAds(userId: string, vipLevel: number) {
  // Get VIP tier for daily limit
  const vipTier = await prisma.vipTier.findUnique({ where: { level: vipLevel } });
  const dailyLimit = vipTier?.dailyAdLimit ?? 5;

  // Count today's watches
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayWatchCount = await prisma.userAdWatch.count({
    where: {
      userId,
      createdAt: { gte: todayStart },
    },
  });

  if (todayWatchCount >= dailyLimit) {
    return { ads: [], todayWatchCount, dailyLimit, limitReached: true };
  }

  // Get active ads, ordered by priority (higher first)
  const ads = await prisma.ad.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  return { ads, todayWatchCount, dailyLimit, limitReached: false };
}

/**
 * Start watching an ad — creates a UserAdWatch record.
 */
export async function startWatchingAd(userId: string, adId: string) {
  const ad = await prisma.ad.findUnique({ where: { id: adId } });
  if (!ad || !ad.isActive) {
    throw new Error('AD_NOT_FOUND');
  }

  // Check if user already watched this ad today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const alreadyWatched = await prisma.userAdWatch.findFirst({
    where: {
      userId,
      adId,
      createdAt: { gte: todayStart },
    },
  });

  if (alreadyWatched) {
    throw new Error('ALREADY_WATCHED_TODAY');
  }

  const watch = await prisma.userAdWatch.create({
    data: {
      userId,
      adId,
    },
  });

  // Increment click count
  await prisma.ad.update({
    where: { id: adId },
    data: { clickCount: { increment: 1 } },
  });

  return { watch, ad };
}

/**
 * Complete an ad watch — validates time and grants reward.
 */
export async function completeAdWatch(
  watchId: string,
  userId: string,
  vipLevel: number,
) {
  const watch = await prisma.userAdWatch.findUnique({
    where: { id: watchId },
    include: { ad: true, user: true },
  });

  if (!watch || watch.userId !== userId) {
    throw new Error('WATCH_NOT_FOUND');
  }

  if (watch.rewardGranted) {
    throw new Error('ALREADY_CLAIMED');
  }

  // Validate time elapsed
  const elapsed = Date.now() - watch.startedAt.getTime();
  const requiredMs = (watch.ad.requiredSeconds + 5) * 1000; // 5s grace

  if (elapsed < requiredMs) {
    throw new Error(`TOO_EARLY:${watch.ad.requiredSeconds}`);
  }

  // Get VIP reward boost
  const vipTier = await prisma.vipTier.findUnique({ where: { level: vipLevel } });
  const boost = vipTier?.rewardBoost ?? 0;
  const boostMultiplier = 1 + boost / 100;
  const pointsEarned = Math.round(watch.ad.rewardPoints * boostMultiplier * 100) / 100;

  // Update watch record
  await prisma.userAdWatch.update({
    where: { id: watchId },
    data: {
      completedAt: new Date(),
      rewardGranted: true,
      pointsEarned,
    },
  });

  // Update user balance
  const newBalance = watch.user.balance + pointsEarned;
  await prisma.botUser.update({
    where: { id: userId },
    data: {
      balance: newBalance,
      totalEarned: { increment: pointsEarned },
    },
  });

  // Update ad spend
  await prisma.ad.update({
    where: { id: watch.adId },
    data: { totalSpent: { increment: pointsEarned } },
  });

  // Create transaction
  await prisma.transaction.create({
    data: {
      userId,
      type: 'ad_reward',
      amount: pointsEarned,
      balanceAfter: newBalance,
      description: `Earned ${pointsEarned} points watching "${watch.ad.title}"`,
      metadata: JSON.stringify({ adId: watch.adId, watchId, boost }),
    },
  });

  return { pointsEarned, boost, adTitle: watch.ad.title };
}