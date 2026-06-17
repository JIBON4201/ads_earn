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

    // Get referred users
    const referredUsers = await db.botUser.findMany({
      where: { referredBy: user.referralCode },
      orderBy: { createdAt: 'desc' },
      select: {
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        createdAt: true,
      },
    })

    // Get total referral bonus earned
    const referralBonuses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        type: 'referral_bonus',
      },
      _sum: { amount: true },
      _count: true,
    })

    // Get referral bonus setting
    const bonusSetting = await db.setting.findUnique({
      where: { key: 'referral_bonus' },
    })
    const referralBonus = bonusSetting ? parseFloat(bonusSetting.value) : 5

    return NextResponse.json({
      referralCode: user.referralCode,
      referralCount: referredUsers.length,
      referralBonus,
      totalBonusEarned: referralBonuses._sum.amount || 0,
      bonusTransactions: referralBonuses._count,
      referredUsers: referredUsers.map((u) => ({
        telegramId: u.telegramId,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        displayName: u.firstName + (u.lastName ? ` ${u.lastName}` : ''),
        joinedAt: u.createdAt,
      })),
      alreadyReferred: !!user.referredBy,
    })
  } catch (error) {
    console.error('Referral info fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch referral info' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, referralCode } = body

    if (!userId || !referralCode) {
      return NextResponse.json({ error: 'userId and referralCode are required' }, { status: 400 })
    }

    const user = await db.botUser.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: 'Account is blocked' }, { status: 403 })
    }

    // Check if already referred
    if (user.referredBy) {
      return NextResponse.json({ error: 'You have already used a referral code' }, { status: 400 })
    }

    // Check self-referral
    if (user.referralCode === referralCode) {
      return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 })
    }

    // Find referrer
    const referrer = await db.botUser.findUnique({
      where: { referralCode },
    })

    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    // Get referral bonus setting
    const bonusSetting = await db.setting.findUnique({
      where: { key: 'referral_bonus' },
    })
    const referralBonus = bonusSetting ? parseFloat(bonusSetting.value) : 5

    // Update user
    const newBalance = user.balance + referralBonus
    await db.botUser.update({
      where: { id: user.id },
      data: {
        referredBy: referralCode,
        balance: newBalance,
      },
    })

    // Update referrer's referral count
    await db.botUser.update({
      where: { id: referrer.id },
      data: { referralCount: { increment: 1 } },
    })

    // Create transaction for the user
    await db.transaction.create({
      data: {
        userId: user.id,
        type: 'referral_bonus',
        amount: referralBonus,
        balanceAfter: newBalance,
        description: `Referral bonus from ${referrer.firstName}'s code`,
        metadata: JSON.stringify({
          referrerId: referrer.id,
          referrerTelegramId: referrer.telegramId,
          referralCode,
        }),
      },
    })

    // Also give bonus to referrer
    const referrerNewBalance = referrer.balance + referralBonus
    await db.botUser.update({
      where: { id: referrer.id },
      data: { balance: referrerNewBalance },
    })

    await db.transaction.create({
      data: {
        userId: referrer.id,
        type: 'referral_bonus',
        amount: referralBonus,
        balanceAfter: referrerNewBalance,
        description: `Referral bonus: ${user.firstName} used your code`,
        metadata: JSON.stringify({
          refereeId: user.id,
          refereeTelegramId: user.telegramId,
          referralCode,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      bonus: referralBonus,
      newBalance,
      referrerName: referrer.firstName,
      message: `Applied referral code! You earned ${referralBonus} TK bonus.`,
    })
  } catch (error) {
    console.error('Referral code apply error:', error)
    return NextResponse.json({ error: 'Failed to apply referral code' }, { status: 500 })
  }
}