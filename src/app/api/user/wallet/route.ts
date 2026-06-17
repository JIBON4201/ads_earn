import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthPayload } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Support both JWT (Telegram) and query param (dev mode)
    const auth = await getAuthPayload(request)
    const url = new URL(request.url)
    const searchParams = url.searchParams
    const telegramId = auth?.telegramId?.toString() || searchParams.get('telegramId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type') || ''

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 })
    }

    const user = await db.botUser.findUnique({
      where: { telegramId: parseInt(telegramId) },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get VIP tier info for withdrawal limits
    const vipTier = await db.vipTier.findUnique({
      where: { level: user.vipLevel },
    })

    // Count total lifetime withdrawals (all statuses)
    const totalWithdrawals = await db.withdrawal.count({
      where: { userId: user.id },
    })

    // Count pending withdrawals
    const pendingWithdrawals = await db.withdrawal.findMany({
      where: { userId: user.id, status: 'pending' },
      orderBy: { requestedAt: 'desc' },
    })

    // Build where clause
    const where: Record<string, unknown> = { userId: user.id }
    if (type) {
      where.type = type
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.transaction.count({ where }),
    ])

    return NextResponse.json({
      balance: user.balance,
      totalEarned: user.totalEarned,
      transactions,
      pendingWithdrawals,
      withdrawalLimits: {
        minAmount: vipTier?.minWithdrawal ?? 50,
        maxWithdrawals: vipTier?.maxWithdrawals ?? 999,
        totalWithdrawals,
        remainingWithdrawals: Math.max(0, (vipTier?.maxWithdrawals ?? 999) - totalWithdrawals),
        isFreeUser: user.vipLevel === 0,
      },
      vipLevel: user.vipLevel,
      vipName: vipTier?.name ?? 'Free',
      tierInfo: {
        rewardPerAd: vipTier?.rewardPerAd ?? 2,
        dailyAdLimit: vipTier?.dailyAdLimit ?? 5,
        minWithdrawal: vipTier?.minWithdrawal ?? 20,
        daysToWithdraw: vipTier ? Math.ceil(vipTier.minWithdrawal / (vipTier.dailyAdLimit * vipTier.rewardPerAd)) : 1,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Wallet fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch wallet data' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, amount, paymentMethod, paymentNumber } = body

    if (!userId || !amount || !paymentMethod || !paymentNumber) {
      return NextResponse.json(
        { error: 'userId, amount, paymentMethod, and paymentNumber are required' },
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
      return NextResponse.json({ error: 'Invalid payment method. Use bkash, nagad, or rocket.' }, { status: 400 })
    }

    // Validate phone number (Bangladeshi format)
    const cleanNumber = paymentNumber.replace(/[\s-]/g, '')
    if (!/^01[3-9]\d{8}$/.test(cleanNumber)) {
      return NextResponse.json({ error: 'Invalid phone number. Use format: 01XXXXXXXXX' }, { status: 400 })
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

    // Get VIP tier for withdrawal limits
    const vipTier = await db.vipTier.findUnique({
      where: { level: user.vipLevel },
    })

    const minWithdrawal = vipTier?.minWithdrawal ?? 50
    const maxWithdrawals = vipTier?.maxWithdrawals ?? 999

    // Check minimum withdrawal amount
    if (parsedAmount < minWithdrawal) {
      return NextResponse.json(
        { error: `Minimum withdrawal for ${vipTier?.name ?? 'Free'} users is ${minWithdrawal} TK` },
        { status: 400 }
      )
    }

    // Check maximum lifetime withdrawals (Free users = 1)
    const totalWithdrawals = await db.withdrawal.count({
      where: { userId: user.id },
    })

    if (totalWithdrawals >= maxWithdrawals) {
      return NextResponse.json(
        { error: user.vipLevel === 0
          ? `Free users can only withdraw once. Upgrade to Bronze or higher for unlimited withdrawals.`
          : `You have reached your lifetime withdrawal limit (${maxWithdrawals}).`
        },
        { status: 400 }
      )
    }

    if (parsedAmount > user.balance) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
    }

    // Check for existing pending withdrawals
    const existingPending = await db.withdrawal.count({
      where: { userId: user.id, status: 'pending' },
    })

    if (existingPending >= 3) {
      return NextResponse.json(
        { error: 'You have too many pending withdrawal requests. Please wait for them to be processed.' },
        { status: 400 }
      )
    }

    // Deduct from balance
    const newBalance = user.balance - parsedAmount

    // Create withdrawal
    const withdrawal = await db.withdrawal.create({
      data: {
        userId: user.id,
        amount: parsedAmount,
        paymentMethod,
        paymentNumber: cleanNumber,
        status: 'pending',
      },
    })

    // Create transaction record
    await db.transaction.create({
      data: {
        userId: user.id,
        type: 'withdrawal',
        amount: -parsedAmount,
        balanceAfter: newBalance,
        description: `Withdrawal to ${paymentMethod} (${cleanNumber})`,
        metadata: JSON.stringify({ withdrawalId: withdrawal.id, paymentMethod, paymentNumber: cleanNumber }),
      },
    })

    // Update user balance
    await db.botUser.update({
      where: { id: user.id },
      data: { balance: newBalance },
    })

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: parsedAmount,
        paymentMethod,
        paymentNumber: cleanNumber,
        status: 'pending',
        newBalance,
      },
      message: `Withdrawal of ${parsedAmount} TK requested to ${paymentMethod}`,
    })
  } catch (error) {
    console.error('Withdrawal create error:', error)
    return NextResponse.json({ error: 'Failed to create withdrawal' }, { status: 500 })
  }
}