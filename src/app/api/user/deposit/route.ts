import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET: Fetch user's deposits + payment config
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

    // Fetch deposits
    const deposits = await db.deposit.findMany({
      where: { userId: user.id },
      orderBy: { requestedAt: 'desc' },
      take: 20,
    })

    // Fetch payment config from settings
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: [
            'deposit_bkash_number',
            'deposit_nagad_number',
            'deposit_rocket_number',
            'deposit_min_amount',
            'deposit_max_amount',
            'deposit_auto_verify',
            'deposit_expire_minutes',
            'deposit_methods_enabled',
          ],
        },
      },
    })

    const config: Record<string, string> = {}
    for (const s of settings) {
      config[s.key] = s.value
    }

    const paymentMethods = [
      {
        id: 'bkash',
        name: 'bKash',
        number: config.deposit_bkash_number || '',
        color: '#E2136E',
        icon: 'mobile',
        enabled: true,
      },
      {
        id: 'nagad',
        name: 'Nagad',
        number: config.deposit_nagad_number || '',
        color: '#F6921E',
        icon: 'send',
        enabled: true,
      },
      {
        id: 'rocket',
        name: 'Rocket',
        number: config.deposit_rocket_number || '',
        color: '#8C3494',
        icon: 'zap',
        enabled: true,
      },
    ]

    // Count pending deposits
    const pendingCount = await db.deposit.count({
      where: { userId: user.id, status: 'pending' },
    })

    return NextResponse.json({
      deposits,
      paymentMethods,
      config: {
        minAmount: parseFloat(config.deposit_min_amount || '10'),
        maxAmount: parseFloat(config.deposit_max_amount || '50000'),
        autoVerify: config.deposit_auto_verify === 'true',
        expireMinutes: parseInt(config.deposit_expire_minutes || '30'),
      },
      pendingCount,
    })
  } catch (error) {
    console.error('Deposit fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch deposit data' }, { status: 500 })
  }
}

// POST: Submit a new deposit request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, amount, paymentMethod, senderNumber, transactionId } = body

    if (!userId || !amount || !paymentMethod || !senderNumber || !transactionId) {
      return NextResponse.json(
        { error: 'userId, amount, paymentMethod, senderNumber, and transactionId are required' },
        { status: 400 }
      )
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Validate payment method
    const validMethods = ['bkash', 'nagad', 'rocket']
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Invalid payment method. Use bkash, nagad, or rocket.' },
        { status: 400 }
      )
    }

    // Validate sender phone (Bangladeshi format)
    const cleanSenderNumber = senderNumber.replace(/[\s\-+]/g, '')
    if (!/^01[3-9]\d{8}$/.test(cleanSenderNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Use format: 01XXXXXXXXX' },
        { status: 400 }
      )
    }

    // Validate TrxID format (alphanumeric, 8-20 chars)
    const cleanTrxId = transactionId.trim().toUpperCase()
    if (!/^[A-Z0-9]{6,20}$/.test(cleanTrxId)) {
      return NextResponse.json(
        { error: 'Invalid Transaction ID. Must be 6-20 alphanumeric characters.' },
        { status: 400 }
      )
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

    // Get deposit settings
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: ['deposit_min_amount', 'deposit_max_amount', 'deposit_auto_verify', 'deposit_expire_minutes'],
        },
      },
    })

    const config: Record<string, string> = {}
    for (const s of settings) {
      config[s.key] = s.value
    }

    const minAmount = parseFloat(config.deposit_min_amount || '10')
    const maxAmount = parseFloat(config.deposit_max_amount || '50000')
    const autoVerify = config.deposit_auto_verify === 'true'
    const expireMinutes = parseInt(config.deposit_expire_minutes || '30')

    if (parsedAmount < minAmount) {
      return NextResponse.json(
        { error: `Minimum deposit amount is ${minAmount} TK` },
        { status: 400 }
      )
    }

    if (parsedAmount > maxAmount) {
      return NextResponse.json(
        { error: `Maximum deposit amount is ${maxAmount} TK` },
        { status: 400 }
      )
    }

    // Check for duplicate TrxID (prevent reuse across all users)
    const existingTrx = await db.deposit.findFirst({
      where: {
        transactionId: cleanTrxId,
        status: { in: ['pending', 'auto_verified', 'verified'] },
      },
    })

    if (existingTrx) {
      return NextResponse.json(
        { error: 'This Transaction ID has already been submitted.' },
        { status: 400 }
      )
    }

    // Rate limit: max 5 pending deposits per user
    const pendingCount = await db.deposit.count({
      where: { userId: user.id, status: 'pending' },
    })

    if (pendingCount >= 5) {
      return NextResponse.json(
        { error: 'You have too many pending deposits. Please wait for verification.' },
        { status: 400 }
      )
    }

    // Rate limit: max 10 deposits per user per day
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayDeposits = await db.deposit.count({
      where: {
        userId: user.id,
        requestedAt: { gte: todayStart },
      },
    })

    if (todayDeposits >= 10) {
      return NextResponse.json(
        { error: 'Daily deposit limit reached. Try again tomorrow.' },
        { status: 400 }
      )
    }

    // Calculate expiry time
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000)

    // Determine initial status and verification method
    let initialStatus = 'pending'
    let verificationMethod = 'manual'

    if (autoVerify) {
      // Auto-verify: for small amounts, verify immediately
      // For larger amounts, still require manual review
      const autoVerifyThreshold = 500 // Auto-verify deposits <= 500 TK
      if (parsedAmount <= autoVerifyThreshold) {
        initialStatus = 'auto_verified'
        verificationMethod = 'auto'
      }
    }

    // Create deposit
    const deposit = await db.deposit.create({
      data: {
        userId: user.id,
        amount: parsedAmount,
        paymentMethod,
        senderNumber: cleanSenderNumber,
        transactionId: cleanTrxId,
        status: initialStatus,
        verificationMethod,
        expiresAt,
      },
    })

    // If auto-verified, credit the balance immediately
    let newBalance = user.balance
    if (initialStatus === 'auto_verified') {
      newBalance = user.balance + parsedAmount
      await db.botUser.update({
        where: { id: user.id },
        data: { balance: newBalance },
      })

      await db.transaction.create({
        data: {
          userId: user.id,
          type: 'deposit',
          amount: parsedAmount,
          balanceAfter: newBalance,
          description: `Auto-verified deposit via ${paymentMethod} (TrxID: ${cleanTrxId})`,
          metadata: JSON.stringify({
            depositId: deposit.id,
            paymentMethod,
            transactionId: cleanTrxId,
            verificationMethod: 'auto',
          }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      deposit: {
        id: deposit.id,
        amount: parsedAmount,
        paymentMethod,
        transactionId: cleanTrxId,
        status: initialStatus,
        verificationMethod,
        expiresAt: deposit.expiresAt,
        newBalance,
      },
      message:
        initialStatus === 'auto_verified'
          ? `Deposit of ${parsedAmount} TK auto-verified and credited!`
          : `Deposit of ${parsedAmount} TK submitted. Waiting for verification.`,
    })
  } catch (error) {
    console.error('Deposit create error:', error)
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 })
  }
}