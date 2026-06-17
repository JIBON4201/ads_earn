import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: Poll deposit status for live updates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const depositId = searchParams.get('depositId')

    if (!depositId) {
      return NextResponse.json({ error: 'depositId is required' }, { status: 400 })
    }

    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: {
          select: { id: true, balance: true, firstName: true },
        },
      },
    })

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 })
    }

    // Get the latest automation logs for this deposit
    const logs = await db.depositAutomationLog.findMany({
      where: { depositId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Calculate time until verification starts
    const settings = await db.setting.findMany({
      where: { key: 'deposit_verify_delay_seconds' },
    })
    const verifyDelay = parseInt(settings[0]?.value || '8')
    const secondsSinceRequest = (Date.now() - deposit.requestedAt.getTime()) / 1000
    const timeToVerify = Math.max(0, verifyDelay - secondsSinceRequest)

    // Check if verification is in progress
    const isVerifying = deposit.status === 'verifying'
    const isComplete = ['auto_verified', 'verified'].includes(deposit.status)
    const isFailed = ['rejected', 'expired', 'failed'].includes(deposit.status)

    // Time remaining until expiry
    let expiresIn = null
    if (deposit.expiresAt && !isComplete && !isFailed) {
      expiresIn = Math.max(0, (deposit.expiresAt.getTime() - Date.now()) / 1000)
    }

    return NextResponse.json({
      deposit: {
        id: deposit.id,
        amount: deposit.amount,
        paymentMethod: deposit.paymentMethod,
        transactionId: deposit.transactionId,
        status: deposit.status,
        verificationMethod: deposit.verificationMethod,
        verificationAttempts: deposit.verificationAttempts,
        adminNote: deposit.adminNote,
        requestedAt: deposit.requestedAt,
        verifiedAt: deposit.verifiedAt,
        expiresAt: deposit.expiresAt,
      },
      userBalance: deposit.user.balance,
      logs: logs.map((l) => ({
        action: l.action,
        status: l.status,
        message: l.message,
        createdAt: l.createdAt,
      })),
      progress: {
        isVerifying,
        isComplete,
        isFailed,
        timeToVerify: Math.ceil(timeToVerify),
        expiresIn: expiresIn ? Math.ceil(expiresIn) : null,
      },
    })
  } catch (error) {
    console.error('Deposit status error:', error)
    return NextResponse.json({ error: 'Failed to check deposit status' }, { status: 500 })
  }
}