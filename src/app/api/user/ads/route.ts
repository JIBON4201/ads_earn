import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 })
    }

    const user = await db.botUser.findUnique({
      where: { telegramId: parseInt(telegramId) },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: 'Account is blocked' }, { status: 403 })
    }

    // Get user's VIP tier for daily limit
    const vipTier = await db.vipTier.findUnique({
      where: { level: user.vipLevel },
    })

    const vipDailyLimit = vipTier?.dailyAdLimit ?? 5
    const vipRewardBoost = vipTier?.rewardBoost ?? 0

    // Count today's total watches
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayTotalWatches = await db.userAdWatch.count({
      where: {
        userId: user.id,
        startedAt: { gte: todayStart, lte: todayEnd },
      },
    })

    // Get active ads with today's watch count per ad
    const ads = await db.ad.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    })

    const adsWithStatus = await Promise.all(
      ads.map(async (ad) => {
        const todayAdWatches = await db.userAdWatch.count({
          where: {
            userId: user.id,
            adId: ad.id,
            startedAt: { gte: todayStart, lte: todayEnd },
          },
        })

        const remainingWatches = Math.min(ad.dailyLimit, vipDailyLimit) - todayAdWatches
        const hasBudget = !ad.totalBudget || ad.totalSpent < ad.totalBudget
        const canWatch = remainingWatches > 0 && hasBudget && todayTotalWatches < vipDailyLimit

        const boostedReward = ad.rewardPoints * (1 + vipRewardBoost / 100)

        return {
          id: ad.id,
          title: ad.title,
          description: ad.description,
          url: ad.url,
          rewardPoints: ad.rewardPoints,
          boostedReward: Math.round(boostedReward * 100) / 100,
          rewardBoost: vipRewardBoost,
          requiredSeconds: ad.requiredSeconds,
          dailyLimit: Math.min(ad.dailyLimit, vipDailyLimit),
          todayWatchCount: todayAdWatches,
          remainingWatches: Math.max(0, remainingWatches),
          canWatch,
          adType: ad.adType,
        }
      })
    )

    return NextResponse.json({
      ads: adsWithStatus,
      todayTotalWatches,
      dailyLimit: vipDailyLimit,
      rewardBoost: vipRewardBoost,
    })
  } catch (error) {
    console.error('User ads fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, adId, telegramId } = body

    if (!userId || !adId || !telegramId) {
      return NextResponse.json({ error: 'userId, adId, and telegramId are required' }, { status: 400 })
    }

    // Fetch user and ad
    const [user, ad] = await Promise.all([
      db.botUser.findUnique({ where: { id: userId } }),
      db.ad.findUnique({ where: { id: adId } }),
    ])

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!ad) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 })
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: 'Account is blocked' }, { status: 403 })
    }

    if (!ad.isActive) {
      return NextResponse.json({ error: 'This ad is no longer active' }, { status: 400 })
    }

    // Check daily watch for this ad
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayAdWatchCount = await db.userAdWatch.count({
      where: {
        userId: user.id,
        adId: ad.id,
        startedAt: { gte: todayStart, lte: todayEnd },
      },
    })

    if (todayAdWatchCount >= ad.dailyLimit) {
      return NextResponse.json({ error: 'Daily watch limit reached for this ad' }, { status: 400 })
    }

    // Check VIP daily limit
    const vipTier = await db.vipTier.findUnique({
      where: { level: user.vipLevel },
    })
    const vipDailyLimit = vipTier?.dailyAdLimit ?? 5

    const todayTotalWatches = await db.userAdWatch.count({
      where: {
        userId: user.id,
        startedAt: { gte: todayStart, lte: todayEnd },
      },
    })

    if (todayTotalWatches >= vipDailyLimit) {
      return NextResponse.json({ error: 'Daily VIP ad limit reached' }, { status: 400 })
    }

    // Check ad budget
    if (ad.totalBudget && ad.totalSpent >= ad.totalBudget) {
      return NextResponse.json({ error: 'Ad budget exhausted' }, { status: 400 })
    }

    // Calculate reward with VIP boost
    const rewardBoost = vipTier?.rewardBoost ?? 0
    const pointsEarned = Math.round(ad.rewardPoints * (1 + rewardBoost / 100) * 100) / 100

    // Create UserAdWatch record (completed immediately for web demo)
    const watch = await db.userAdWatch.create({
      data: {
        userId: user.id,
        adId: ad.id,
        startedAt: new Date(),
        completedAt: new Date(),
        rewardGranted: true,
        pointsEarned,
      },
    })

    // Create Transaction record
    const newBalance = user.balance + pointsEarned
    await db.transaction.create({
      data: {
        userId: user.id,
        type: 'ad_reward',
        amount: pointsEarned,
        balanceAfter: newBalance,
        description: `Watched ad: ${ad.title}${rewardBoost > 0 ? ` (VIP +${rewardBoost}%)` : ''}`,
        metadata: JSON.stringify({ adId: ad.id, adTitle: ad.title, watchId: watch.id }),
      },
    })

    // Update user balance and totalEarned
    await db.botUser.update({
      where: { id: user.id },
      data: {
        balance: newBalance,
        totalEarned: user.totalEarned + pointsEarned,
      },
    })

    // Update ad spend
    await db.ad.update({
      where: { id: ad.id },
      data: {
        totalSpent: { increment: pointsEarned },
        clickCount: { increment: 1 },
      },
    })

    return NextResponse.json({
      success: true,
      pointsEarned,
      newBalance,
      rewardBoost,
      message: `Earned ${pointsEarned} TK${rewardBoost > 0 ? ` (VIP +${rewardBoost}% boost)` : ''}!`,
    })
  } catch (error) {
    console.error('Ad watch completion error:', error)
    return NextResponse.json({ error: 'Failed to complete ad watch' }, { status: 500 })
  }
}