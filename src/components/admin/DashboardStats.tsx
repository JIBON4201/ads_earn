'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Wallet,
  Clock,
  ShieldAlert,
  TrendingUp,
  Megaphone,
  Fingerprint,
  Crown,
  Eye,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

interface StatsData {
  users: number
  totalBalance: number
  totalEarned: number
  pendingWithdrawals: number
  fraudAlerts: number
  recentActivity: ActivityItem[]
  earningsChart: ChartPoint[]
  activeAds: number
  totalAdClicks: number
  totalAdSpend: number
  vipDistribution: VipDistItem[]
  totalDevices: number
  suspiciousDevices: number
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

interface VipDistItem {
  level: number
  name: string
  count: number
}

const chartConfig = {
  earnings: { label: 'Points Earned', color: '#10b981' },
} satisfies ChartConfig

const VIP_COLORS: Record<number, string> = {
  0: '#9ca3af',
  1: '#10b981',
  2: '#0ea5e9',
  3: '#a855f7',
  4: '#f59e0b',
}

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.toLocaleString(),
      icon: Users,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
    },
    {
      title: 'Total Earned',
      value: `${stats.totalEarned.toLocaleString(undefined, { maximumFractionDigits: 1 })} TK`,
      icon: Wallet,
      color: 'text-amber-600',
      iconBg: 'bg-amber-100',
    },
    {
      title: 'Pending Payouts',
      value: stats.pendingWithdrawals.toString(),
      icon: Clock,
      color: 'text-orange-600',
      iconBg: 'bg-orange-100',
      highlight: stats.pendingWithdrawals > 0,
    },
    {
      title: 'Fraud Alerts',
      value: stats.fraudAlerts.toString(),
      icon: ShieldAlert,
      color: 'text-red-600',
      iconBg: 'bg-red-100',
      highlight: stats.fraudAlerts > 0,
    },
    {
      title: 'Active Ads',
      value: stats.activeAds.toString(),
      icon: Megaphone,
      color: 'text-sky-600',
      iconBg: 'bg-sky-100',
      sub: `${stats.totalAdClicks} total clicks`,
    },
    {
      title: 'Devices',
      value: stats.totalDevices.toString(),
      icon: Fingerprint,
      color: 'text-purple-600',
      iconBg: 'bg-purple-100',
      sub: `${stats.suspiciousDevices} suspicious`,
      highlight: stats.suspiciousDevices > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card
            key={card.title}
            className={`group hover:shadow-md transition-shadow duration-200 ${card.highlight ? 'ring-1 ring-red-200' : ''}`}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">{card.title}</span>
                <div className={`${card.iconBg} p-1.5 rounded-md`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </div>
              <div className="text-xl font-bold tracking-tight">{card.value}</div>
              {card.sub && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Earnings Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Earnings Overview — Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={stats.earningsChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="earnings" fill="var(--color-earnings)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* VIP Distribution + Quick Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                VIP Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {stats.vipDistribution.map((vip) => {
                const pct = stats.users > 0 ? ((vip.count / stats.users) * 100).toFixed(0) : '0'
                return (
                  <div key={vip.level} className="flex items-center gap-3">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: VIP_COLORS[vip.level] || '#9ca3af' }}
                    />
                    <span className="text-sm flex-1">{vip.name}</span>
                    <span className="text-sm font-semibold tabular-nums">{vip.count}</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: VIP_COLORS[vip.level] || '#9ca3af',
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Total Ad Views (7d)
                </span>
                <span className="text-sm font-semibold">{stats.earningsChart.reduce((s, d) => s + d.watches, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Total Ad Spend
                </span>
                <span className="text-sm font-semibold">{stats.totalAdSpend.toFixed(1)} TK</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Outstanding Balance
                </span>
                <span className="text-sm font-semibold">{stats.totalBalance.toFixed(1)} TK</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity yet. Start the Telegram bot to see data here.</p>
            ) : (
              stats.recentActivity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-1">
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
  )
}