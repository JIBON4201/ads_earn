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

    // Get all VIP tiers
    const tiers = await db.vipTier.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    })

    return NextResponse.json({
      currentLevel: user.vipLevel,
      currentBalance: user.balance,
      tiers: tiers.map((t) => ({
        id: t.id,
        level: t.level,
        name: t.name,
        price: t.price,
        dailyAdLimit: t.dailyAdLimit,
        rewardBoost: t.rewardBoost,
        description: t.description,
      })),
    })
  } catch (error) {
    console.error('VIP tiers fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch VIP tiers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, targetLevel } = body

    if (!userId || targetLevel === undefined) {
      return NextResponse.json({ error: 'userId and targetLevel are required' }, { status: 400 })
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

    const parsedTargetLevel = parseInt(targetLevel)

    if (parsedTargetLevel <= user.vipLevel) {
      return NextResponse.json(
        { error: `You are already at level ${user.vipLevel} or higher` },
        { status: 400 }
      )
    }

    // Get target tier
    const targetTier = await db.vipTier.findUnique({
      where: { level: parsedTargetLevel },
    })

    if (!targetTier) {
      return NextResponse.json({ error: 'Invalid VIP level' }, { status: 400 })
    }

    if (!targetTier.isActive) {
      return NextResponse.json({ error: 'This VIP tier is not available' }, { status: 400 })
    }

    // Check if user can afford it
    if (user.balance < targetTier.price) {
      return NextResponse.json(
        { error: `Insufficient balance. Need ${targetTier.price} TK, have ${user.balance.toFixed(1)} TK` },
        { status: 400 }
      )
    }

    const newBalance = user.balance - targetTier.price
    const fromLevel = user.vipLevel

    // Update user VIP level and balance
    await db.botUser.update({
      where: { id: user.id },
      data: {
        vipLevel: parsedTargetLevel,
        balance: newBalance,
      },
    })

    // Create VIP payment record
    await db.vipPayment.create({
      data: {
        userId: user.id,
        fromLevel,
        toLevel: parsedTargetLevel,
        amount: targetTier.price,
        status: 'confirmed',
      },
    })

    // Create transaction record
    await db.transaction.create({
      data: {
        userId: user.id,
        type: 'vip_purchase',
        amount: -targetTier.price,
        balanceAfter: newBalance,
        description: `VIP upgrade: ${fromLevel === 0 ? 'Free' : `Level ${fromLevel}`} → ${targetTier.name}`,
        metadata: JSON.stringify({
          fromLevel,
          toLevel: parsedTargetLevel,
          tierName: targetTier.name,
          price: targetTier.price,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      newLevel: parsedTargetLevel,
      newLevelName: targetTier.name,
      newBalance,
      message: `Upgraded to ${targetTier.name}! Enjoy ${targetTier.dailyAdLimit} ads/day and +${targetTier.rewardBoost}% rewards.`,
    })
  } catch (error) {
    console.error('VIP upgrade error:', error)
    return NextResponse.json({ error: 'Failed to process VIP upgrade' }, { status: 500 })
  }
}