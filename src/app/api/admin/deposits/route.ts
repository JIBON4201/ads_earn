import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch all deposits with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const method = searchParams.get('method')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (method && method !== 'all') {
      where.paymentMethod = method
    }

    if (search) {
      where.OR = [
        { transactionId: { contains: search } },
        { senderNumber: { contains: search } },
        { user: { firstName: { contains: search } } },
        { user: { username: { contains: search } } },
        { user: { telegramId: { equals: !isNaN(parseInt(search)) ? parseInt(search) : undefined } } },
      ]
    }

    const deposits = await db.deposit.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            telegramId: true,
            balance: true,
            vipLevel: true,
            isBlocked: true,
          },
        },
      },
      take: 100,
    })

    // Get stats
    const [totalDeposits, pendingCount, autoVerifiedCount, verifiedCount, rejectedCount, totalAmount] =
      await Promise.all([
        db.deposit.count(),
        db.deposit.count({ where: { status: 'pending' } }),
        db.deposit.count({ where: { status: 'auto_verified' } }),
        db.deposit.count({ where: { status: 'verified' } }),
        db.deposit.count({ where: { status: 'rejected' } }),
        db.deposit.aggregate({
          _sum: { amount: true },
          where: { status: { in: ['auto_verified', 'verified'] } },
        }),
      ])

    return NextResponse.json({
      deposits,
      stats: {
        total: totalDeposits,
        pending: pendingCount,
        autoVerified: autoVerifiedCount,
        verified: verifiedCount,
        rejected: rejectedCount,
        totalAmount: totalAmount._sum.amount || 0,
      },
    })
  } catch (error) {
    console.error('Admin deposits fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 })
  }
}

// PATCH: Verify, reject, or expire a deposit
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { depositId, action, adminNote } = body

    if (!depositId || !action) {
      return NextResponse.json({ error: 'depositId and action are required' }, { status: 400 })
    }

    const validActions = ['verify', 'reject', 'expire']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Use: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    if (!['pending', 'auto_verified'].includes(deposit.status)) {
      return NextResponse.json({ error: 'Deposit is already processed' }, { status: 400 })
    }

    if (action === 'verify') {
      // Credit balance if not already credited (auto_verified already credits)
      let newBalance = deposit.user.balance
      if (deposit.status === 'pending') {
        newBalance = deposit.user.balance + deposit.amount
        await db.botUser.update({
          where: { id: deposit.userId },
          data: { balance: newBalance },
        })

        await db.transaction.create({
          data: {
            userId: deposit.userId,
            type: 'deposit',
            amount: deposit.amount,
            balanceAfter: newBalance,
            description: `Deposit verified via ${deposit.paymentMethod} (TrxID: ${deposit.transactionId})`,
            metadata: JSON.stringify({
              depositId: deposit.id,
              paymentMethod: deposit.paymentMethod,
              transactionId: deposit.transactionId,
              verificationMethod: 'manual',
            }),
          },
        })
      }

      const updated = await db.deposit.update({
        where: { id: depositId },
        data: {
          status: 'verified',
          verifiedAt: new Date(),
          processedBy: 'admin',
          adminNote: adminNote || 'Verified by admin',
        },
      })

      return NextResponse.json({
        deposit: updated,
        newBalance,
        message: `Deposit of ${deposit.amount} TK verified and credited.`,
      })
    }

    if (action === 'reject') {
      const updated = await db.deposit.update({
        where: { id: depositId },
        data: {
          status: 'rejected',
          verifiedAt: new Date(),
          processedBy: 'admin',
          adminNote: adminNote || 'Rejected by admin',
        },
      })

      return NextResponse.json({
        deposit: updated,
        message: `Deposit of ${deposit.amount} TK rejected.`,
      })
    }

    if (action === 'expire') {
      const updated = await db.deposit.update({
        where: { id: depositId },
        data: {
          status: 'expired',
          verifiedAt: new Date(),
          processedBy: 'system',
          adminNote: adminNote || 'Expired — verification timeout',
        },
      })

      return NextResponse.json({
        deposit: updated,
        message: `Deposit of ${deposit.amount} TK marked as expired.`,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin deposit action error:', error)
    return NextResponse.json({ error: 'Failed to process deposit' }, { status: 500 })
  }
}

// POST: Update deposit settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      deposit_bkash_number,
      deposit_nagad_number,
      deposit_rocket_number,
      deposit_min_amount,
      deposit_max_amount,
      deposit_auto_verify,
      deposit_expire_minutes,
    } = body

    const settingsToUpdate = [
      { key: 'deposit_bkash_number', value: deposit_bkash_number || '' },
      { key: 'deposit_nagad_number', value: deposit_nagad_number || '' },
      { key: 'deposit_rocket_number', value: deposit_rocket_number || '' },
      { key: 'deposit_min_amount', value: deposit_min_amount || '10' },
      { key: 'deposit_max_amount', value: deposit_max_amount || '50000' },
      { key: 'deposit_auto_verify', value: deposit_auto_verify ? 'true' : 'false' },
      { key: 'deposit_expire_minutes', value: deposit_expire_minutes || '30' },
    ]

    for (const s of settingsToUpdate) {
      await db.setting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value },
      })
    }

    return NextResponse.json({ success: true, message: 'Deposit settings updated' })
  } catch (error) {
    console.error('Deposit settings update error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}