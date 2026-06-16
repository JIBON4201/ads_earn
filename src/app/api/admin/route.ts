import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [
      userCount,
      balanceResult,
      pendingWithdrawalsCount,
      fraudAlertsCount,
      recentTransactions,
      recentWithdrawals,
      adWatchStats,
    ] = await Promise.all([
      db.botUser.count(),
      db.botUser.aggregate({ _sum: { balance: true, totalEarned: true } }),
      db.withdrawal.count({ where: { status: 'pending' } }),
      db.fraudAlert.count({ where: { isResolved: false } }),
      db.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { firstName: true, username: true, telegramId: true } } },
      }),
      db.withdrawal.findMany({
        orderBy: { requestedAt: 'desc' },
        take: 5,
        include: { user: { select: { firstName: true, username: true, telegramId: true } } },
      }),
      // Get ad watch data for the last 7 days
      db.userAdWatch.findMany({
        where: {
          startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: {
          startedAt: true,
          pointsEarned: true,
        },
      }),
    ])

    // Build earnings chart data for last 7 days
    const chartData: { date: string; earnings: number; watches: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

      const dayWatches = adWatchStats.filter((w) => {
        const wDate = new Date(w.startedAt).toISOString().split('T')[0]
        return wDate === dateStr
      })

      chartData.push({
        date: dayLabel,
        earnings: dayWatches.reduce((sum, w) => sum + w.pointsEarned, 0),
        watches: dayWatches.length,
      })
    }

    // Build recent activity
    const recentActivity = [
      ...recentTransactions.map((t) => ({
        id: t.id,
        type: 'transaction' as const,
        description: `${t.user.firstName}${t.user.username ? ` (@${t.user.username})` : ''} — ${t.description}`,
        amount: t.amount,
        createdAt: t.createdAt,
      })),
      ...recentWithdrawals.map((w) => ({
        id: w.id,
        type: 'withdrawal' as const,
        description: `${w.user.firstName}${w.user.username ? ` (@${w.user.username})` : ''} requested ${w.amount} TK via ${w.paymentMethod}`,
        amount: w.amount,
        createdAt: w.requestedAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8)

    return NextResponse.json({
      users: userCount,
      totalBalance: balanceResult._sum.balance || 0,
      totalEarned: balanceResult._sum.totalEarned || 0,
      pendingWithdrawals: pendingWithdrawalsCount,
      fraudAlerts: fraudAlertsCount,
      recentActivity,
      earningsChart: chartData,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}