'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Wallet,
  Eye,
  Crown,
  Users,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface UserData {
  id: string
  telegramId: number
  username: string | null
  firstName: string
  lastName: string | null
  balance: number
  totalEarned: number
  vipLevel: number
  referralCode: string
  referralCount: number
  createdAt: string
}

interface VipTierInfo {
  level: number
  name: string
  dailyAdLimit: number
  rewardBoost: number
  description: string | null
}

interface UserStats {
  todayWatchCount: number
  todayEarnings: number
  pendingWithdrawals: number
}

interface EarningsPoint {
  date: string
  earnings: number
}

const VIP_COLORS: Record<number, string> = {
  0: 'bg-gray-500',
  1: 'bg-emerald-500',
  2: 'bg-sky-500',
  3: 'bg-amber-500',
  4: 'bg-amber-400',
}

const VIP_NAMES: Record<number, string> = {
  0: 'Free',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
}

interface UserDashboardProps {
  telegramId: number
  onNavigate?: (tab: string) => void
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
}

export default function UserDashboard({ telegramId, onNavigate }: UserDashboardProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [vipTier, setVipTier] = useState<VipTierInfo | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [earningsChart, setEarningsChart] = useState<EarningsPoint[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/user?telegramId=${telegramId}`)
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setVipTier(data.vipTier)
        setStats(data.stats)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [telegramId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Generate mock chart data from total earned
  useEffect(() => {
    if (user) {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today']
      const base = user.totalEarned / 7
      const chart = days.map((d, i) => ({
        date: d,
        earnings: i === 6 ? (stats?.todayEarnings ?? base * 0.8) : Math.max(0, base * (0.5 + Math.random() * 0.8)),
      }))
      setEarningsChart(chart)
    }
  }, [user, stats])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!user) return null

  const displayName = user.firstName + (user.lastName ? ` ${user.lastName}` : '')

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.div
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 p-6 sm:p-8 text-white shadow-lg"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Welcome back,</p>
              <h1 className="text-2xl sm:text-3xl font-bold">{displayName}</h1>
              {user.username && (
                <p className="text-emerald-100 text-sm mt-1">@{user.username}</p>
              )}
            </div>
            <Badge className={`${VIP_COLORS[user.vipLevel]} text-white border-0 text-sm px-3 py-1`}>
              <Crown className="h-3.5 w-3.5 mr-1" />
              {VIP_NAMES[user.vipLevel]}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="bg-white/15 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-emerald-100 text-xs font-medium mb-1">Available Balance</p>
              <p className="text-3xl sm:text-4xl font-bold tracking-tight">
                {user.balance.toFixed(1)}
                <span className="text-lg ml-1 font-normal">TK</span>
              </p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="bg-white/15 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-emerald-100 text-xs font-medium mb-1">Today&apos;s Earnings</p>
              <p className="text-2xl font-bold tracking-tight">
                <TrendingUp className="h-4 w-4 inline mr-1 -mt-0.5" />
                {stats?.todayEarnings.toFixed(1) ?? '0.0'}
                <span className="text-sm ml-1 font-normal">TK</span>
              </p>
              <p className="text-emerald-100 text-xs mt-1">{stats?.todayWatchCount ?? 0} ads watched today</p>
            </motion.div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="bg-white/15 backdrop-blur-sm rounded-xl p-4"
            >
              <p className="text-emerald-100 text-xs font-medium mb-1">Total Earned</p>
              <p className="text-2xl font-bold tracking-tight">
                <Sparkles className="h-4 w-4 inline mr-1 -mt-0.5" />
                {user.totalEarned.toFixed(1)}
                <span className="text-sm ml-1 font-normal">TK</span>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={3}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            label: 'Watch Ads',
            icon: Eye,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
            tab: 'watch',
          },
          {
            label: 'Withdraw',
            icon: Wallet,
            color: 'text-amber-600',
            bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
            tab: 'wallet',
            badge: stats?.pendingWithdrawals ?? 0,
          },
          {
            label: 'Upgrade VIP',
            icon: Crown,
            color: 'text-purple-600',
            bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
            tab: 'vip',
          },
          {
            label: 'Referrals',
            icon: Users,
            color: 'text-sky-600',
            bg: 'bg-sky-50 hover:bg-sky-100 border-sky-200',
            tab: 'referral',
          },
        ].map((action) => (
          <Button
            key={action.tab}
            variant="outline"
            className={`h-auto py-4 flex flex-col items-center gap-2 border transition-all duration-200 ${action.bg}`}
            onClick={() => onNavigate?.(action.tab)}
          >
            <action.icon className={`h-5 w-5 ${action.color}`} />
            <span className="text-sm font-medium">{action.label}</span>
            {'badge' in action && action.badge ? (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 -mt-1">
                {action.badge}
              </Badge>
            ) : null}
          </Button>
        ))}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'VIP Level',
            value: VIP_NAMES[user.vipLevel],
            icon: Crown,
            color: 'text-emerald-600',
            iconBg: 'bg-emerald-100',
          },
          {
            label: 'Referrals',
            value: user.referralCount.toString(),
            icon: Users,
            color: 'text-sky-600',
            iconBg: 'bg-sky-100',
          },
          {
            label: 'Daily Ad Limit',
            value: vipTier?.dailyAdLimit?.toString() ?? '5',
            icon: Eye,
            color: 'text-violet-600',
            iconBg: 'bg-violet-100',
          },
          {
            label: 'Reward Boost',
            value: vipTier?.rewardBoost ? `+${vipTier.rewardBoost}%` : 'None',
            icon: ArrowUpRight,
            color: 'text-amber-600',
            iconBg: 'bg-amber-100',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4 + i}
          >
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                  <div className={`${stat.iconBg} p-1.5 rounded-md`}>
                    <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-lg font-bold tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Earnings Chart */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={8}
      >
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Earnings Overview
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsChart}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={35} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)} TK`, 'Earnings']}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorEarnings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}