import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch all deposits with filters + automation stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const method = searchParams.get('method')
    const search = searchParams.get('search')
    const includeAutomation = searchParams.get('automation') === 'true'

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
    const [
      totalDeposits,
      pendingCount,
      verifyingCount,
      autoVerifiedCount,
      verifiedCount,
      rejectedCount,
      expiredCount,
      failedCount,
      totalAmountResult,
      todayDepositsResult,
      todayAmountResult,
    ] = await Promise.all([
      db.deposit.count(),
      db.deposit.count({ where: { status: 'pending' } }),
      db.deposit.count({ where: { status: 'verifying' } }),
      db.deposit.count({ where: { status: 'auto_verified' } }),
      db.deposit.count({ where: { status: 'verified' } }),
      db.deposit.count({ where: { status: 'rejected' } }),
      db.deposit.count({ where: { status: 'expired' } }),
      db.deposit.count({ where: { status: 'failed' } }),
      db.deposit.aggregate({
        _sum: { amount: true },
        where: { status: { in: ['auto_verified', 'verified'] } },
      }),
      db.deposit.count({
        where: { requestedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      db.deposit.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['auto_verified', 'verified'] },
          verifiedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ])

    const response: Record<string, unknown> = {
      deposits,
      stats: {
        total: totalDeposits,
        pending: pendingCount,
        verifying: verifyingCount,
        autoVerified: autoVerifiedCount,
        verified: verifiedCount,
        rejected: rejectedCount,
        expired: expiredCount,
        failed: failedCount,
        totalAmount: totalAmountResult._sum.amount || 0,
        todayDeposits: todayDepositsResult,
        todayAmount: todayAmountResult._sum.amount || 0,
        automationRate: totalDeposits > 0
          ? Math.round(((autoVerifiedCount + verifiedCount) / totalDeposits) * 100)
          : 0,
      },
    }

    // Include automation stats if requested
    if (includeAutomation) {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0))
      const [automationLogsToday, automationSuccess, automationErrors, recentLogs] = await Promise.all([
        db.depositAutomationLog.count({
          where: { createdAt: { gte: todayStart } },
        }),
        db.depositAutomationLog.count({
          where: { status: 'success', createdAt: { gte: todayStart } },
        }),
        db.depositAutomationLog.count({
          where: { status: 'error', createdAt: { gte: todayStart } },
        }),
        db.depositAutomationLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            deposit: {
              select: {
                amount: true,
                paymentMethod: true,
                transactionId: true,
                status: true,
                user: { select: { firstName: true, telegramId: true } },
              },
            },
          },
        }),
      ])

      response.automation = {
        logsToday: automationLogsToday,
        successToday: automationSuccess,
        errorsToday: automationErrors,
        successRate: automationLogsToday > 0 ? Math.round((automationSuccess / automationLogsToday) * 100) : 0,
        recentLogs,
      }
    }

    return NextResponse.json(response)
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

    const validActions = ['verify', 'reject', 'expire', 'retry']
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

    if (action === 'retry') {
      // Reset failed/expired deposit to pending for re-verification
      if (!['failed', 'expired', 'rejected'].includes(deposit.status)) {
        return NextResponse.json({ error: 'Only failed/expired/rejected deposits can be retried' }, { status: 400 })
      }

      const newExpiresAt = new Date(Date.now() + 30 * 60 * 1000)
      const updated = await db.deposit.update({
        where: { id: depositId },
        data: {
          status: 'pending',
          expiresAt: newExpiresAt,
          verificationAttempts: 0,
          adminNote: 'Retry initiated by admin',
          verificationStartedAt: null,
        },
      })

      await db.depositAutomationLog.create({
        data: {
          depositId,
          action: 'retry',
          status: 'info',
          message: `Admin initiated retry for ${deposit.amount} TK deposit`,
        },
      })

      return NextResponse.json({
        deposit: updated,
        message: `Deposit of ${deposit.amount} TK reset to pending. Automator will re-process it.`,
      })
    }

    if (!['pending', 'verifying', 'auto_verified'].includes(deposit.status)) {
      return NextResponse.json({ error: 'Deposit is already processed' }, { status: 400 })
    }

    if (action === 'verify') {
      let newBalance = deposit.user.balance
      if (deposit.status === 'pending' || deposit.status === 'verifying') {
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
            description: `Deposit verified by admin via ${deposit.paymentMethod} (TrxID: ${deposit.transactionId})`,
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
          verificationMethod: 'manual',
          verifiedAt: new Date(),
          processedBy: 'admin',
          adminNote: adminNote || 'Verified by admin',
        },
      })

      await db.depositAutomationLog.create({
        data: {
          depositId,
          action: 'verify_success',
          status: 'success',
          message: `Admin manually verified ${deposit.amount} TK deposit. Balance: ${newBalance} TK`,
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

      await db.depositAutomationLog.create({
        data: {
          depositId,
          action: 'rejected_auto',
          status: 'warning',
          message: `Admin rejected deposit. Reason: ${adminNote || 'Rejected by admin'}`,
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
          processedBy: 'admin',
          adminNote: adminNote || 'Expired — verification timeout',
        },
      })

      await db.depositAutomationLog.create({
        data: {
          depositId,
          action: 'expired',
          status: 'warning',
          message: `Admin marked deposit as expired. ${adminNote || ''}`,
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
      deposit_verify_delay_seconds,
      deposit_max_verify_attempts,
      deposit_auto_expire,
      deposit_enabled,
    } = body

    const settingsToUpdate = [
      { key: 'deposit_bkash_number', value: deposit_bkash_number || '' },
      { key: 'deposit_nagad_number', value: deposit_nagad_number || '' },
      { key: 'deposit_rocket_number', value: deposit_rocket_number || '' },
      { key: 'deposit_min_amount', value: deposit_min_amount || '10' },
      { key: 'deposit_max_amount', value: deposit_max_amount || '50000' },
      { key: 'deposit_auto_verify', value: deposit_auto_verify !== false ? 'true' : 'false' },
      { key: 'deposit_expire_minutes', value: deposit_expire_minutes || '30' },
      { key: 'deposit_verify_delay_seconds', value: deposit_verify_delay_seconds || '8' },
      { key: 'deposit_max_verify_attempts', value: deposit_max_verify_attempts || '3' },
      { key: 'deposit_auto_expire', value: deposit_auto_expire !== false ? 'true' : 'false' },
      { key: 'deposit_enabled', value: deposit_enabled !== false ? 'true' : 'false' },
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