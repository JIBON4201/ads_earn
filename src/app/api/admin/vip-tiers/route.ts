import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const tiers = await db.vipTier.findMany({
      orderBy: { level: 'asc' },
    })
    return NextResponse.json({ tiers })
  } catch (error) {
    console.error('VIP tiers fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch VIP tiers' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tiers } = body

    if (!Array.isArray(tiers)) {
      return NextResponse.json({ error: 'tiers must be an array' }, { status: 400 })
    }

    const results = await Promise.all(
      tiers.map((tier: { id: string; name: string; price: number; dailyAdLimit: number; rewardBoost: number; rewardPerAd?: number; description?: string; minWithdrawal?: number; maxWithdrawals?: number; isActive: boolean }) =>
        db.vipTier.update({
          where: { id: tier.id },
          data: {
            name: tier.name,
            price: tier.price,
            dailyAdLimit: tier.dailyAdLimit,
            rewardBoost: tier.rewardBoost,
            rewardPerAd: tier.rewardPerAd ?? 2,
            description: tier.description || null,
            minWithdrawal: tier.minWithdrawal ?? 50,
            maxWithdrawals: tier.maxWithdrawals ?? 999,
            isActive: tier.isActive,
          },
        })
      )
    )

    return NextResponse.json({ tiers: results })
  } catch (error) {
    console.error('VIP tiers update error:', error)
    return NextResponse.json({ error: 'Failed to update VIP tiers' }, { status: 500 })
  }
}