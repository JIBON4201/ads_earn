import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status && status !== 'all') {
      where.status = status
    }

    const withdrawals = await db.withdrawal.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, username: true, telegramId: true, balance: true },
        },
      },
    })

    return NextResponse.json({ withdrawals })
  } catch (error) {
    console.error('Withdrawals fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch withdrawals' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { withdrawalId, action, adminNote } = body

    if (!withdrawalId || !action) {
      return NextResponse.json({ error: 'withdrawalId and action are required' }, { status: 400 })
    }

    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { user: true },
    })

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ error: 'Withdrawal is already processed' }, { status: 400 })
    }

    if (action === 'approve') {
      // Deduct from user balance
      const newBalance = Math.max(0, withdrawal.user.balance - withdrawal.amount)
      await db.botUser.update({
        where: { id: withdrawal.userId },
        data: { balance: newBalance },
      })

      // Create transaction
      await db.transaction.create({
        data: {
          userId: withdrawal.userId,
          type: 'withdrawal',
          amount: -withdrawal.amount,
          balanceAfter: newBalance,
          description: `Withdrawal approved: ${withdrawal.amount} TK via ${withdrawal.paymentMethod}`,
        },
      })

      const updated = await db.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'approved',
          processedAt: new Date(),
          adminNote: adminNote || 'Approved by admin',
          processedBy: 'admin',
        },
      })

      return NextResponse.json({ withdrawal: updated })
    }

    if (action === 'reject') {
      const updated = await db.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'rejected',
          processedAt: new Date(),
          adminNote: adminNote || 'Rejected by admin',
          processedBy: 'admin',
        },
      })

      return NextResponse.json({ withdrawal: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Withdrawal action error:', error)
    return NextResponse.json({ error: 'Failed to process withdrawal' }, { status: 500 })
  }
}