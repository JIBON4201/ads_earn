import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const vipLevel = searchParams.get('vipLevel') || ''
    const status = searchParams.get('status') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { telegramId: isNaN(Number(search)) ? undefined : Number(search) },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ].filter((c) => c && Object.values(c).every((v) => v !== undefined))
    }

    if (vipLevel !== '' && vipLevel !== 'all') {
      where.vipLevel = parseInt(vipLevel)
    }

    if (status === 'blocked') {
      where.isBlocked = true
    } else if (status === 'active') {
      where.isBlocked = false
    }

    const [users, total] = await Promise.all([
      db.botUser.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { referrals: true } },
        },
      }),
      db.botUser.count({ where }),
    ])

    return NextResponse.json({ users, total, page, pageSize })
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, data } = body

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action are required' }, { status: 400 })
    }

    if (action === 'block') {
      const user = await db.botUser.update({
        where: { id: userId },
        data: { isBlocked: true, blockReason: data?.reason || 'Blocked by admin' },
      })
      return NextResponse.json({ user })
    }

    if (action === 'unblock') {
      const user = await db.botUser.update({
        where: { id: userId },
        data: { isBlocked: false, blockReason: null },
      })
      return NextResponse.json({ user })
    }

    if (action === 'adjust_balance') {
      const amount = parseFloat(data?.amount)
      if (isNaN(amount)) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      }

      const user = await db.botUser.findUnique({ where: { id: userId } })
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const newBalance = Math.max(0, user.balance + amount)
      const updatedUser = await db.botUser.update({
        where: { id: userId },
        data: { balance: newBalance },
      })

      // Create transaction record
      await db.transaction.create({
        data: {
          userId,
          type: 'admin_adjust',
          amount,
          balanceAfter: newBalance,
          description: data?.description || `Admin adjustment: ${amount >= 0 ? '+' : ''}${amount}`,
        },
      })

      return NextResponse.json({ user: updatedUser })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('User action error:', error)
    return NextResponse.json({ error: 'Failed to perform action' }, { status: 500 })
  }
}