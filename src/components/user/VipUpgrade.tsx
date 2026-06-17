'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Crown,
  Eye,
  Zap,
  Star,
  Lock,
  Check,
  CheckCircle2,
  Loader2,
} from 'lucide-react'

interface VipTierData {
  id: string
  level: number
  name: string
  price: number
  dailyAdLimit: number
  rewardBoost: number
  description: string | null
}

interface VipData {
  currentLevel: number
  currentBalance: number
  tiers: VipTierData[]
}

interface VipUpgradeProps {
  telegramId: number
  userId: string
}

const TIER_STYLES: Record<number, { bg: string; border: string; badgeBg: string; badgeText: string; accent: string; glow: string }> = {
  0: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badgeBg: 'bg-gray-500',
    badgeText: 'text-white',
    accent: 'text-gray-600',
    glow: '',
  },
  1: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    accent: 'text-emerald-600',
    glow: 'shadow-emerald-200/50',
  },
  2: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    badgeBg: 'bg-sky-500',
    badgeText: 'text-white',
    accent: 'text-sky-600',
    glow: 'shadow-sky-200/50',
  },
  3: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-white',
    accent: 'text-amber-600',
    glow: 'shadow-amber-200/50',
  },
  4: {
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    border: 'border-amber-300',
    badgeBg: 'bg-gradient-to-r from-amber-400 to-yellow-400',
    badgeText: 'text-white',
    accent: 'text-amber-700',
    glow: 'shadow-amber-300/50',
  },
}

const TIER_FEATURES: Record<number, string[]> = {
  0: ['5 ads per day', 'No reward boost', 'Basic support'],
  1: ['10 ads per day', '+15% reward boost', 'Priority support', 'Referral bonus access'],
  2: ['15 ads per day', '+30% reward boost', 'Priority support', 'Early access to new ads'],
  3: ['20 ads per day', '+50% reward boost', 'Premium support', 'Exclusive ad offers', 'Bonus referral rewards'],
  4: ['25+ ads per day', '+70% reward boost', 'VIP support', 'Exclusive offers', 'Double referral bonus', 'Custom profile badge'],
}

export default function VipUpgrade({ telegramId, userId }: VipUpgradeProps) {
  const [vipData, setVipData] = useState<VipData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<number | null>(null)

  const fetchVip = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/vip?telegramId=${telegramId}`)
      if (res.ok) {
        const data = await res.json()
        setVipData(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [telegramId])

  useEffect(() => {
    fetchVip()
  }, [fetchVip])

  const handleUpgrade = async (tier: VipTierData) => {
    if (upgrading) return
    setUpgrading(tier.level)

    try {
      const res = await fetch('/api/user/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          targetLevel: tier.level,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message, {
          description: `New balance: ${data.newBalance.toFixed(1)} TK`,
        })
        fetchVip()
      } else {
        toast.error(data.error || 'Upgrade failed')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setUpgrading(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!vipData) return null

  return (
    <div className="space-y-5">
      {/* Current Level Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-100">Your Current VIP Level</p>
                <div className="flex items-center gap-2 mt-1">
                  <Crown className="h-6 w-6" />
                  <h2 className="text-2xl font-bold">
                    {vipData.tiers.find((t) => t.level === vipData.currentLevel)?.name || 'Free'}
                  </h2>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-emerald-100">Balance</p>
                <p className="text-xl font-bold">{vipData.currentBalance.toFixed(1)} TK</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Tier Cards */}
      <div className="space-y-4">
        {vipData.tiers.map((tier, index) => {
          const style = TIER_STYLES[tier.level] || TIER_STYLES[0]
          const isCurrent = tier.level === vipData.currentLevel
          const isLower = tier.level < vipData.currentLevel
          const isLocked = isCurrent || isLower
          const canAfford = vipData.currentBalance >= tier.price
          const features = TIER_FEATURES[tier.level] || []

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06, duration: 0.3 }}
            >
              <Card
                className={`relative overflow-hidden transition-all duration-200 ${style.bg} ${
                  isCurrent ? `${style.border} border-2 shadow-lg ${style.glow}` : `border ${style.border}`
                } ${!isLocked ? 'hover:shadow-md cursor-pointer' : ''}`}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0">
                    <div className={`${style.badgeBg} text-white text-[10px] font-semibold px-3 py-1 rounded-bl-lg`}>
                      CURRENT
                    </div>
                  </div>
                )}

                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Tier Icon & Name */}
                    <div className="shrink-0">
                      <div className={`w-12 h-12 rounded-xl ${style.badgeBg} flex items-center justify-center`}>
                        <Crown className={`h-6 w-6 ${style.badgeText}`} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-base font-bold ${style.accent}`}>{tier.name}</h3>
                        {tier.level === 4 && (
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        )}
                      </div>

                      {tier.description && (
                        <p className="text-xs text-muted-foreground mb-3">{tier.description}</p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold">{tier.dailyAdLimit}</span>
                          <span className="text-muted-foreground">ads/day</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-semibold">+{tier.rewardBoost}%</span>
                          <span className="text-muted-foreground">rewards</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-semibold">{tier.price}</span>
                          <span className="text-muted-foreground">TK</span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {features.map((feature) => (
                          <div key={feature} className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="text-xs text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 flex items-center">
                      {isLocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-4 text-xs bg-white/50 border-gray-200 text-gray-400 cursor-default"
                          disabled
                        >
                          {isCurrent ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              Active
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5 mr-1.5" />
                              Passed
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          className={`h-9 px-4 text-xs font-semibold ${
                            canAfford
                              ? `${style.badgeBg} ${style.badgeText} hover:opacity-90`
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                          disabled={!canAfford || upgrading === tier.level}
                          onClick={() => handleUpgrade(tier)}
                        >
                          {upgrading === tier.level ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : null}
                          {tier.price === 0 ? 'Free' : `${tier.price} TK`}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}