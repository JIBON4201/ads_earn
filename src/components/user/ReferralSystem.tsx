'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Users,
  Copy,
  Check,
  Gift,
  UserPlus,
  Calendar,
  Loader2,
  Trophy,
  ExternalLink,
} from 'lucide-react'

interface ReferredUser {
  telegramId: number
  firstName: string
  lastName: string | null
  username: string | null
  displayName: string
  joinedAt: string
}

interface ReferralData {
  referralCode: string
  referralCount: number
  referralBonus: number
  totalBonusEarned: number
  bonusTransactions: number
  referredUsers: ReferredUser[]
  alreadyReferred: boolean
}

interface ReferralSystemProps {
  telegramId: number
  userId: string
}

export default function ReferralSystem({ telegramId, userId }: ReferralSystemProps) {
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [codeInput, setCodeInput] = useState('')
  const [applying, setApplying] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchReferral = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/referral?telegramId=${telegramId}`)
      if (res.ok) {
        const data = await res.json()
        setReferralData(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [telegramId])

  useEffect(() => {
    fetchReferral()
  }, [fetchReferral])

  const copyCode = () => {
    if (referralData) {
      navigator.clipboard.writeText(referralData.referralCode).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        toast.error('Failed to copy')
      })
    }
  }

  const applyCode = async () => {
    if (!codeInput.trim()) {
      toast.error('Please enter a referral code')
      return
    }

    setApplying(true)
    try {
      const res = await fetch('/api/user/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          referralCode: codeInput.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message, {
          description: `+${data.bonus} TK added to your balance`,
        })
        setCodeInput('')
        fetchReferral()
      } else {
        toast.error(data.error || 'Failed to apply code')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!referralData) return null

  return (
    <div className="space-y-5">
      {/* Referral Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-400 p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-emerald-200" />
              <h2 className="text-base font-semibold">Your Referral Code</h2>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl px-5 py-3 text-center">
                <p className="text-2xl sm:text-3xl font-bold tracking-widest font-mono">
                  {referralData.referralCode}
                </p>
              </div>
              <Button
                variant="ghost"
                className="bg-white/20 hover:bg-white/30 text-white h-12 w-12 shrink-0 rounded-xl"
                onClick={copyCode}
              >
                {copied ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>

            <p className="text-sm text-emerald-100">
              Share this code with friends. You both earn{' '}
              <span className="font-semibold text-white">{referralData.referralBonus} TK</span> bonus!
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: 'Referrals',
            value: referralData.referralCount.toString(),
            icon: UserPlus,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
          },
          {
            label: 'Bonus Earned',
            value: `${referralData.totalBonusEarned.toFixed(1)}`,
            icon: Gift,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
          },
          {
            label: 'Per Referral',
            value: `${referralData.referralBonus} TK`,
            icon: Trophy,
            color: 'text-sky-600',
            bg: 'bg-sky-100',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <Card>
              <CardContent className="p-3 text-center">
                <div className={`${stat.bg} w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-lg font-bold tabular-nums">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Apply Referral Code */}
      {!referralData.alreadyReferred && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-emerald-600" />
                Apply a Referral Code
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                New here? Enter a friend&apos;s code to earn a bonus.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter referral code"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  className="h-9 text-sm font-mono uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && applyCode()}
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 shrink-0"
                  onClick={applyCode}
                  disabled={applying || !codeInput.trim()}
                >
                  {applying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {referralData.alreadyReferred && (
        <Card className="border-sky-200 bg-sky-50/30">
          <CardContent className="p-4 flex items-center gap-2">
            <Check className="h-4 w-4 text-sky-600 shrink-0" />
            <p className="text-sm text-sky-700">You have already applied a referral code.</p>
          </CardContent>
        </Card>
      )}

      {/* Referred Users List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            Referred Users ({referralData.referralCount})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {referralData.referredUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No referrals yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Share your code to start earning bonuses
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {referralData.referredUsers.map((ref, i) => (
                <motion.div
                  key={ref.telegramId}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="flex items-center gap-3 py-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-emerald-700">
                        {ref.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ref.displayName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {ref.username && <span>@{ref.username}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(ref.joinedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] shrink-0">
                      +{referralData.referralBonus} TK
                    </Badge>
                  </div>
                  {i < referralData.referredUsers.length - 1 && <Separator />}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}