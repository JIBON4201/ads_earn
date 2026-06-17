'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Eye,
  Clock,
  Gift,
  CheckCircle2,
  Play,
  Zap,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'

interface AdItem {
  id: string
  title: string
  description: string | null
  url: string
  rewardPoints: number
  boostedReward: number
  rewardBoost: number
  requiredSeconds: number
  dailyLimit: number
  todayWatchCount: number
  remainingWatches: number
  canWatch: boolean
  adType: string
}

interface AdsData {
  ads: AdItem[]
  todayTotalWatches: number
  dailyLimit: number
  rewardPerAd: number
  minWithdrawal: number
}

interface WatchAdsProps {
  telegramId: number
  userId: string
}

const AD_TYPE_ICONS: Record<string, string> = {
  cpm: 'Video',
  cpa: 'Offer',
  sponsored: 'Sponsored',
}

export default function WatchAds({ telegramId, userId }: WatchAdsProps) {
  const [adsData, setAdsData] = useState<AdsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [watchingAd, setWatchingAd] = useState<AdItem | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [claiming, setClaiming] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchAds = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/ads?telegramId=${telegramId}`)
      if (res.ok) {
        const data = await res.json()
        setAdsData(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [telegramId])

  useEffect(() => {
    fetchAds()
  }, [fetchAds])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0 || !watchingAd) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [countdown, watchingAd])

  const startWatching = (ad: AdItem) => {
    setWatchingAd(ad)
    setCountdown(ad.requiredSeconds)
  }

  const claimReward = async () => {
    if (!watchingAd || claiming) return
    setClaiming(true)

    try {
      const res = await fetch('/api/user/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          adId: watchingAd.id,
          telegramId,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || `Earned ${data.pointsEarned} TK!`, {
          description: `New balance: ${data.newBalance.toFixed(1)} TK`,
        })
        setWatchingAd(null)
        setCountdown(0)
        fetchAds()
      } else {
        toast.error(data.error || 'Failed to claim reward')
        setWatchingAd(null)
        setCountdown(0)
      }
    } catch {
      toast.error('Network error. Please try again.')
      setWatchingAd(null)
      setCountdown(0)
    } finally {
      setClaiming(false)
    }
  }

  const cancelWatching = () => {
    setWatchingAd(null)
    setCountdown(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!adsData) return null

  const progressPercent = watchingAd
    ? ((watchingAd.requiredSeconds - countdown) / watchingAd.requiredSeconds) * 100
    : 0

  return (
    <div className="space-y-5">
      {/* Daily Progress Header */}
      <Card className="border-emerald-200 bg-emerald-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">
                Today&apos;s Progress
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
              onClick={fetchAds}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Progress
              value={(adsData.todayTotalWatches / adsData.dailyLimit) * 100}
              className="h-2.5 flex-1"
            />
            <span className="text-sm font-semibold text-emerald-700 tabular-nums">
              {adsData.todayTotalWatches}/{adsData.dailyLimit}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {adsData.rewardPerAd} TK per ad
            </p>
            <p className="text-xs text-muted-foreground">
              Daily: {(adsData.rewardPerAd * adsData.dailyLimit).toFixed(1)} TK · Min. withdraw: {adsData.minWithdrawal} TK
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Watching Modal */}
      <AnimatePresence>
        {watchingAd && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={cancelWatching}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Ad Preview Area */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-400 p-8 text-center text-white relative">
                {countdown > 0 ? (
                  <>
                    <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-3xl font-bold tabular-nums">{countdown}</span>
                    </div>
                    <p className="text-sm font-medium opacity-90">Watching ad...</p>
                    <p className="text-xs opacity-75 mt-1">{watchingAd.title}</p>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-16 h-16 mx-auto mb-3 text-white" />
                    <p className="text-lg font-semibold">Ad Complete!</p>
                    <p className="text-sm opacity-90 mt-1">You earned your reward</p>
                  </>
                )}
              </div>

              {/* Progress Bar */}
              <div className="px-6 pt-4">
                <Progress value={progressPercent} className="h-2" />
                <p className="text-xs text-muted-foreground text-center mt-1.5">
                  {countdown > 0 ? `${countdown}s remaining` : 'Ready to claim!'}
                </p>
              </div>

              {/* Actions */}
              <div className="p-6 pt-4 space-y-2">
                {countdown <= 0 ? (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
                    onClick={claimReward}
                    disabled={claiming}
                  >
                    {claiming ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Gift className="h-4 w-4 mr-2" />
                    )}
                    {claiming ? 'Claiming...' : `Claim +${watchingAd.rewardPoints} TK`}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  className="w-full text-sm text-muted-foreground"
                  onClick={cancelWatching}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Cards List */}
      {adsData.ads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No ads available right now</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for new ads</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {adsData.ads.map((ad, index) => (
            <motion.div
              key={ad.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <Card
                className={`transition-all duration-200 ${
                  ad.canWatch
                    ? 'hover:shadow-md border-gray-200'
                    : 'opacity-60 bg-gray-50 border-gray-100'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate">{ad.title}</h3>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 h-4 shrink-0 border-gray-200"
                        >
                          {AD_TYPE_ICONS[ad.adType] || ad.adType}
                        </Badge>
                      </div>
                      {ad.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {ad.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ad.requiredSeconds}s
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {ad.remainingWatches}/{ad.dailyLimit} left
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600 leading-tight">
                            +{ad.rewardPoints}
                            <span className="text-xs font-normal ml-0.5">TK</span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className={`h-8 px-3 text-xs font-medium ${
                            ad.canWatch
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                          disabled={!ad.canWatch}
                          onClick={() => startWatching(ad)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {ad.remainingWatches <= 0 ? 'Done' : 'Watch'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {adsData.todayTotalWatches >= adsData.dailyLimit && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-amber-800">
              Daily limit reached! Upgrade VIP to watch more ads.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}