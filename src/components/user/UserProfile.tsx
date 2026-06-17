'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  User,
  AtSign,
  Hash,
  Calendar,
  Crown,
  Wallet,
  Eye,
  Users,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

interface ProfileData {
  user: {
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
    isBlocked: boolean
    createdAt: string
  }
  vipTier: {
    level: number
    name: string
    dailyAdLimit: number
    rewardBoost: number
    description: string | null
  } | null
  stats: {
    todayWatchCount: number
    todayEarnings: number
    pendingWithdrawals: number
  }
}

interface UserProfileProps {
  telegramId: number
}

const VIP_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  0: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  1: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  2: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
  3: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  4: { bg: 'bg-gradient-to-r from-amber-100 to-yellow-100', text: 'text-amber-700', border: 'border-amber-300' },
}

export default function UserProfile({ telegramId }: UserProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/user?telegramId=${telegramId}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (!profile) return null

  const { user, vipTier, stats } = profile
  const displayName = user.firstName + (user.lastName ? ` ${user.lastName}` : '')
  const vipStyle = VIP_STYLES[user.vipLevel] || VIP_STYLES[0]

  return (
    <div className="space-y-5">
      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-500 h-24" />
          <CardContent className="p-5 -mt-10">
            <div className="flex items-end gap-4 mb-5">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center shrink-0">
                <span className="text-2xl font-bold text-emerald-600">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="pb-1 min-w-0">
                <h2 className="text-xl font-bold truncate">{displayName}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  {user.username && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <AtSign className="h-3.5 w-3.5" />
                      {user.username}
                    </span>
                  )}
                  <Badge className={`${vipStyle.bg} ${vipStyle.text} border-0 text-xs h-5`}>
                    <Crown className="h-3 w-3 mr-1" />
                    {vipTier?.name || 'Free'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  icon: Hash,
                  label: 'Telegram ID',
                  value: user.telegramId.toString(),
                },
                {
                  icon: Calendar,
                  label: 'Joined',
                  value: new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }),
                },
                {
                  icon: Crown,
                  label: 'VIP Level',
                  value: `${vipTier?.name || 'Free'} (Level ${user.vipLevel})`,
                },
                {
                  icon: Wallet,
                  label: 'Balance',
                  value: `${user.balance.toFixed(1)} TK`,
                },
                {
                  icon: Sparkles,
                  label: 'Total Earned',
                  value: `${user.totalEarned.toFixed(1)} TK`,
                },
                {
                  icon: Users,
                  label: 'Referrals',
                  value: `${user.referralCount} users`,
                },
              ].map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm">
                    <item.icon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                    <p className="text-sm font-medium truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-5">
            <h3 className="text-sm font-semibold mb-4">Activity Overview</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Today's Earnings",
                  value: `${stats.todayEarnings.toFixed(1)} TK`,
                  icon: TrendingUp,
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-100',
                },
                {
                  label: "Today's Ads",
                  value: stats.todayWatchCount.toString(),
                  icon: Eye,
                  color: 'text-sky-600',
                  bg: 'bg-sky-100',
                },
                {
                  label: 'Pending Payouts',
                  value: stats.pendingWithdrawals.toString(),
                  icon: Wallet,
                  color: 'text-amber-600',
                  bg: 'bg-amber-100',
                },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className={`${stat.bg} w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-1.5`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className="text-base font-bold tabular-nums">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* VIP Benefits Card */}
      {vipTier && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className={`${vipStyle.border}`}>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Crown className={`h-4 w-4 ${vipStyle.text}`} />
                {vipTier.name} Benefits
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily Ad Limit</span>
                  <span className="font-semibold">{vipTier.dailyAdLimit} ads</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reward Boost</span>
                  <span className="font-semibold">
                    {vipTier.rewardBoost > 0 ? `+${vipTier.rewardBoost}%` : 'None'}
                  </span>
                </div>
                {vipTier.description && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">{vipTier.description}</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}