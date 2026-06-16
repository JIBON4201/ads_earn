'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Wallet, Clock, ShieldAlert, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'

interface StatsData {
  users: number
  totalBalance: number
  totalEarned: number
  pendingWithdrawals: number
  fraudAlerts: number
  recentActivity: ActivityItem[]
  earningsChart: ChartPoint[]
}

interface ActivityItem {
  id: string
  type: 'transaction' | 'withdrawal'
  description: string
  amount: number
  createdAt: string
}

interface ChartPoint {
  date: string
  earnings: number
  watches: number
}

const chartConfig = {
  earnings: { label: 'Points Earned', color: '#10b981' },
  watches: { label: 'Ad Watches', color: '#f59e0b' },
} satisfies ChartConfig

export default function DashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin')
      .then((r) => r.json())
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-3" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.toLocaleString(),
      icon: Users,
      trend: '+12%',
      trendUp: true,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
    },
    {
      title: 'Total Balance',
      value: `${stats.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 1 })} TK`,
      icon: Wallet,
      trend: `${stats.totalEarned.toLocaleString(undefined, { maximumFractionDigits: 1 })} earned`,
      trendUp: true,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
    },
    {
      title: 'Pending Withdrawals',
      value: stats.pendingWithdrawals.toString(),
      icon: Clock,
      trend: stats.pendingWithdrawals > 0 ? 'Needs attention' : 'All clear',
      trendUp: stats.pendingWithdrawals === 0,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      iconBg: 'bg-orange-100',
    },
    {
      title: 'Fraud Alerts',
      value: stats.fraudAlerts.toString(),
      icon: ShieldAlert,
      trend: stats.fraudAlerts > 0 ? 'Action required' : 'No alerts',
      trendUp: stats.fraudAlerts === 0,
      color: 'text-red-600',
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className="group hover:shadow-md transition-shadow duration-200"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
                <div className={`${card.iconBg} p-2 rounded-lg`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className={`h-3 w-3 ${card.trendUp ? 'text-emerald-500' : 'text-orange-500'}`} />
                <span className={`text-xs ${card.trendUp ? 'text-emerald-600' : 'text-orange-600'}`}>
                  {card.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Earnings Overview — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={stats.earningsChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="earnings" fill="var(--color-earnings)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
              ) : (
                stats.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${item.type === 'withdrawal' ? 'bg-orange-100' : 'bg-emerald-100'}`}>
                      {item.type === 'withdrawal' ? (
                        <Wallet className="h-3 w-3 text-orange-600" />
                      ) : (
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-tight line-clamp-2">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge variant={item.amount >= 0 ? 'default' : 'destructive'} className="text-xs shrink-0">
                      {item.amount >= 0 ? '+' : ''}{item.amount.toFixed(1)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}