import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyTelegramInitData, signJWT, getBotToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initData } = body

    if (!initData) {
      return NextResponse.json({ error: 'initData is required' }, { status: 400 })
    }

    // Get bot token from DB settings
    const botToken = await getBotToken()

    if (!botToken) {
      console.error('[Auth] Bot token not configured in settings')
      return NextResponse.json(
        { error: 'Bot not configured. Please set the bot token in admin settings.' },
        { status: 500 }
      )
    }

    // Verify Telegram initData using HMAC-SHA256
    const result = await verifyTelegramInitData(initData, botToken)

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid or expired authentication data. Please reopen the app from Telegram.' },
        { status: 401 }
      )
    }

    const tgUser = result.user
    const telegramId = tgUser.id

    // Parse start_param from initData (for referral tracking)
    const initDataParams = new URLSearchParams(initData)
    const startParam = initDataParams.get('start_param')

    // Auto-signup or login
    let user = await db.botUser.findUnique({
      where: { telegramId },
    })
    const isNewUser = !user

    if (!user) {
      // Determine referral code
      let referredBy: string | null = null

      // If start_param looks like a referral code, apply it
      if (startParam && startParam.startsWith('REF')) {
        const referrer = await db.botUser.findUnique({
          where: { referralCode: startParam },
        })
        if (referrer && referrer.telegramId !== telegramId) {
          referredBy = startParam
        }
      }

      const referralCode = `REF${telegramId}${Date.now().toString(36).toUpperCase()}`

      user = await db.botUser.create({
        data: {
          telegramId,
          firstName: tgUser.first_name || 'User',
          lastName: tgUser.last_name || null,
          username: tgUser.username || null,
          referralCode,
          referredBy,
          vipLevel: 0,
          balance: 0,
          totalEarned: 0,
        },
      })

      // Apply referral bonus if referred
      if (referredBy) {
        const referralBonus = parseFloat(
          (await db.setting.findUnique({ where: { key: 'referral_bonus' } }))?.value || '5'
        )

        // Credit referrer
        const referrer = await db.botUser.findUnique({
          where: { referralCode: referredBy },
        })
        if (referrer) {
          const referrerNewBalance = referrer.balance + referralBonus
          await db.botUser.update({
            where: { referralCode: referredBy },
            data: {
              referralCount: { increment: 1 },
              balance: referrerNewBalance,
              totalEarned: referrer.totalEarned + referralBonus,
            },
          })
          await db.transaction.create({
            data: {
              userId: referrer.id,
              type: 'referral_bonus',
              amount: referralBonus,
              balanceAfter: referrerNewBalance,
              description: `Referral bonus: ${tgUser.first_name} joined via your link`,
              metadata: JSON.stringify({ refereeTelegramId: telegramId }),
            },
          })
        }

        // Credit new user
        const newUserBalance = referralBonus
        await db.botUser.update({
          where: { id: user.id },
          data: { balance: newUserBalance, totalEarned: newUserBalance },
        })
        await db.transaction.create({
          data: {
            userId: user.id,
            type: 'referral_bonus',
            amount: referralBonus,
            balanceAfter: newUserBalance,
            description: 'Welcome referral bonus',
            metadata: JSON.stringify({ referredBy }),
          },
        })

        // Refresh user data after bonus
        user = await db.botUser.findUnique({ where: { telegramId } })!
      }
    } else {
      // Existing user: update name/username from Telegram (they may have changed)
      if (tgUser.first_name && tgUser.first_name !== user.firstName) {
        await db.botUser.update({
          where: { telegramId },
          data: {
            firstName: tgUser.first_name,
            lastName: tgUser.last_name || null,
            username: tgUser.username || null,
          },
        })
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'Account is blocked', blockReason: user.blockReason },
        { status: 403 }
      )
    }

    // Sign JWT
    const token = await signJWT({
      userId: user.id,
      telegramId: user.telegramId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      vipLevel: user.vipLevel,
    })

    // Get VIP tier name
    const vipTier = await db.vipTier.findUnique({
      where: { level: user.vipLevel },
    })

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        balance: user.balance,
        totalEarned: user.totalEarned,
        vipLevel: user.vipLevel,
        vipName: vipTier?.name || 'Free',
        referralCode: user.referralCode,
        isNewUser,
      },
    })
  } catch (error) {
    console.error('[Auth] Telegram auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}