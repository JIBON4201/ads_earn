import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Support both JWT (Telegram) and query param (dev mode)
    const auth = await getAuthPayload(request)
    const telegramId = auth?.telegramId?.toString() || new URL(request.url).searchParams.get('telegramId')

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
      return NextResponse.json({ error: 'Account is blocked', blockReason: user.blockReason }, { status: 403 })
    }

    // Get VIP tier info
    const vipTier = await db.vipTier.findUnique({
      where: { level: user.vipLevel },
    })

    // Count today's ad watches
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayWatchCount = await db.userAdWatch.count({
      where: {
        userId: user.id,
        startedAt: { gte: todayStart, lte: todayEnd },
      },
    })

    // Calculate today's earnings
    const todayEarnings = await db.userAdWatch.aggregate({
      where: {
        userId: user.id,
        startedAt: { gte: todayStart, lte: todayEnd },
        rewardGranted: true,
      },
      _sum: { pointsEarned: true },
    })

    // Referral count
    const referralCount = await db.botUser.count({
      where: { referredBy: user.referralCode },
    })

    // Pending withdrawals count
    const pendingWithdrawals = await db.withdrawal.count({
      where: { userId: user.id, status: 'pending' },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        totalEarned: user.totalEarned,
        vipLevel: user.vipLevel,
        referralCode: user.referralCode,
        referralCount,
        isBlocked: user.isBlocked,
        createdAt: user.createdAt,
      },
      vipTier: vipTier ? {
        level: vipTier.level,
        name: vipTier.name,
        dailyAdLimit: vipTier.dailyAdLimit,
        rewardBoost: vipTier.rewardBoost,
        description: vipTier.description,
      } : null,
      stats: {
        todayWatchCount,
        todayEarnings: todayEarnings._sum.pointsEarned || 0,
        pendingWithdrawals,
      },
    })
  } catch (error) {
    console.error('User profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
  }
}