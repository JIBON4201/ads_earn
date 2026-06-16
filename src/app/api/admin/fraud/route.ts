import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resolved = searchParams.get('resolved')

    const where: Record<string, unknown> = {}
    if (resolved !== null && resolved !== 'all') {
      where.isResolved = resolved === 'true'
    }

    const alerts = await db.fraudAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Enrich with user data where available
    const enrichedAlerts = await Promise.all(
      alerts.map(async (alert) => {
        let user: { id: string; firstName: string; lastName: string | null; username: string | null; telegramId: number } | null = null
        if (alert.userId) {
          const u = await db.botUser.findUnique({
            where: { id: alert.userId },
            select: { id: true, firstName: true, lastName: true, username: true, telegramId: true },
          })
          user = u
        } else if (alert.telegramId) {
          const u = await db.botUser.findFirst({
            where: { telegramId: alert.telegramId },
            select: { id: true, firstName: true, lastName: true, username: true, telegramId: true },
          })
          user = u
        }
        return { ...alert, user }
      })
    )

    return NextResponse.json({ alerts: enrichedAlerts })
  } catch (error) {
    console.error('Fraud alerts fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch fraud alerts' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, action } = body

    if (!alertId || !action) {
      return NextResponse.json({ error: 'alertId and action are required' }, { status: 400 })
    }

    if (action === 'resolve') {
      const updated = await db.fraudAlert.update({
        where: { id: alertId },
        data: { isResolved: true },
      })
      return NextResponse.json({ alert: updated })
    }

    if (action === 'block_user') {
      const alert = await db.fraudAlert.findUnique({ where: { id: alertId } })

      if (alert?.userId) {
        await db.botUser.update({
          where: { id: alert.userId },
          data: {
            isBlocked: true,
            blockReason: 'Blocked due to fraud alert: ' + alert.type,
          },
        })
      } else if (alert?.telegramId) {
        await db.botUser.updateMany({
          where: { telegramId: alert.telegramId },
          data: {
            isBlocked: true,
            blockReason: 'Blocked due to fraud alert: ' + alert.type,
          },
        })
      }

      const updated = await db.fraudAlert.update({
        where: { id: alertId },
        data: { isResolved: true },
      })

      return NextResponse.json({ alert: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Fraud action error:', error)
    return NextResponse.json({ error: 'Failed to process fraud action' }, { status: 500 })
  }
}