'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LayoutDashboard,
  Eye,
  Wallet,
  Landmark,
  Crown,
  Share2,
  User,
  Bot,
  UserCircle,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'

import UserDashboard from '@/components/user/UserDashboard'
import WatchAds from '@/components/user/WatchAds'
import UserWallet from '@/components/user/Wallet'
import VipUpgrade from '@/components/user/VipUpgrade'
import ReferralSystem from '@/components/user/ReferralSystem'
import UserProfile from '@/components/user/UserProfile'
import DepositComponent from '@/components/user/Deposit'

interface UserAppProps {
  onBack?: () => void
}

// Extend Window to include Telegram WebApp
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
          }
          start_param?: string
        }
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: {
          text: string
          show: () => void
          hide: () => void
          onClick: (fn: () => void) => void
        }
        BackButton: {
          show: () => void
          hide: () => void
          onClick: (fn: () => void) => void
        }
        colorScheme: 'light' | 'dark'
        themeParams: Record<string, string>
      }
    }
  }
}

interface AuthState {
  telegramId: number
  userId: string
  firstName: string
  username: string | null
  vipLevel: number
  vipName: string
  token: string
  isNewUser: boolean
}

const DEMO_USERS: { telegramId: number; label: string; vip: string }[] = [
  { telegramId: 100001, label: 'Rahim (Gold VIP)', vip: 'Gold' },
  { telegramId: 100003, label: 'Fatima (Platinum VIP)', vip: 'Platinum' },
  { telegramId: 100005, label: 'Susmita (Gold VIP)', vip: 'Gold' },
  { telegramId: 100002, label: 'Karim (Bronze VIP)', vip: 'Bronze' },
  { telegramId: 100004, label: 'Habib (Free)', vip: 'Free' },
]

const userTabs = [
  { value: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { value: 'watch', label: 'Watch Ads', icon: Eye },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
  { value: 'deposit', label: 'Deposit', icon: Landmark },
  { value: 'vip', label: 'VIP', icon: Crown },
  { value: 'referral', label: 'Referrals', icon: Share2 },
  { value: 'profile', label: 'Profile', icon: User },
]

export default function UserApp({ onBack }: UserAppProps) {
  // Detect Telegram environment synchronously
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined
  const isTelegram = !!tg
  const hasInitData = isTelegram ? !!tg!.initData : false

  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [authLoading, setAuthLoading] = useState(isTelegram && hasInitData)
  const [authError, setAuthError] = useState<string | null>(
    isTelegram && !hasInitData ? 'No authentication data. Please reopen from Telegram.' : null
  )
  const authInitialized = useRef(false)

  // Dev mode (non-Telegram)
  const [selectedTelegramId, setSelectedTelegramId] = useState<number>(100001)
  const [userId, setUserId] = useState<string>('')
  const [userTab, setUserTab] = useState('dashboard')

  // ─── Telegram WebApp Auth ───────────────────────────────────────
  useEffect(() => {
    if (!isTelegram || !hasInitData || authInitialized.current) return
    authInitialized.current = true

    tg!.ready()
    tg!.expand()

    // Send initData to backend for HMAC verification
    fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: tg!.initData }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.token) {
          setAuthState({
            telegramId: data.user.telegramId,
            userId: data.user.id,
            firstName: data.user.firstName,
            username: data.user.username,
            vipLevel: data.user.vipLevel,
            vipName: data.user.vipName,
            token: data.token,
            isNewUser: data.user.isNewUser,
          })
          // Store token in sessionStorage for API calls
          sessionStorage.setItem('tg_token', data.token)

          // Intercept fetch to auto-attach JWT for all API calls
          const originalFetch = window.fetch
          window.fetch = (url: string | URL | Request, options: RequestInit = {}) => {
            const token = sessionStorage.getItem('tg_token')
            if (token) {
              options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
              }
            }
            return originalFetch(url, options)
          }
        } else {
          setAuthError(data.error || 'Authentication failed')
        }
      })
      .catch(() => {
        setAuthError('Network error. Please check your connection.')
      })
      .finally(() => {
        setAuthLoading(false)
      })
  }, [isTelegram, hasInitData, tg])

  // ─── Dev Mode: Fetch user ID when telegramId changes ────────────
  useEffect(() => {
    if (isTelegram) return // skip in Telegram mode
    fetch(`/api/user?telegramId=${selectedTelegramId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUserId(data.user.id)
      })
      .catch(() => {})
  }, [selectedTelegramId, isTelegram])

  // ─── Unified values (Telegram or Dev mode) ─────────────────────
  const activeTelegramId = isTelegram ? (authState?.telegramId ?? 0) : selectedTelegramId
  const activeUserId = isTelegram ? (authState?.userId ?? '') : userId
  const activeToken = isTelegram ? (authState?.token ?? '') : ''

  const handleUserNavigate = useCallback((tab: string) => {
    setUserTab(tab)
  }, [])

  // Listen for deposit navigation from Wallet component
  useEffect(() => {
    const handler = () => setUserTab('deposit')
    window.addEventListener('navigate-to-deposit', handler)
    return () => window.removeEventListener('navigate-to-deposit', handler)
  }, [])

  // ─── Loading Screen (Telegram auth) ─────────────────────────────
  if (authLoading && isTelegram) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/50">
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base font-bold tracking-tight leading-tight">AdEarn</h1>
                  <p className="text-[10px] text-muted-foreground -mt-0.5 leading-tight">Telegram Ad Earning Platform</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-emerald-600 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Verifying your account...</p>
              <p className="text-xs text-muted-foreground mt-1">Connecting to Telegram</p>
            </div>
            <Skeleton className="h-2 w-48 mx-auto rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  // ─── Auth Error Screen ──────────────────────────────────────────
  if (authError && isTelegram) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/50">
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base font-bold tracking-tight leading-tight">AdEarn</h1>
                  <p className="text-[10px] text-muted-foreground -mt-0.5 leading-tight">Telegram Ad Earning Platform</p>
                </div>
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Authentication Failed</p>
              <p className="text-xs text-muted-foreground mt-1">{authError}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Please close this window and reopen the app from Telegram.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main App (both Telegram and Dev mode) ──────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Logo */}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold tracking-tight leading-tight">AdEarn</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5 leading-tight">Telegram Ad Earning Platform</p>
              </div>
            </div>

            {/* Right: Auth info */}
            {isTelegram && authState ? (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold leading-tight">{authState.firstName}</p>
                  {authState.username && (
                    <p className="text-[10px] text-muted-foreground leading-tight">@{authState.username}</p>
                  )}
                </div>
                <Badge
                  className={`text-[10px] px-2 py-0.5 h-5 ${
                    authState.vipLevel >= 3 ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : authState.vipLevel >= 2 ? 'bg-sky-100 text-sky-700 border-sky-200'
                    : authState.vipLevel >= 1 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                  variant="outline"
                >
                  {authState.vipName}
                </Badge>
              </div>
            ) : (
              /* Dev mode: Demo user selector */
              <Select
                value={selectedTelegramId.toString()}
                onValueChange={(v) => {
                  setSelectedTelegramId(parseInt(v))
                  setUserTab('dashboard')
                }}
              >
                <SelectTrigger className="h-8 w-[180px] sm:w-[220px] text-xs">
                  <UserCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-500 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEMO_USERS.map((u) => (
                    <SelectItem key={u.telegramId} value={u.telegramId.toString()}>
                      <span className="flex items-center gap-2">
                        <span>{u.label}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1 py-0 h-4 ml-1 ${
                            u.vip === 'Platinum' ? 'bg-amber-100 text-amber-700'
                            : u.vip === 'Gold' ? 'bg-amber-100 text-amber-700'
                            : u.vip === 'Silver' ? 'bg-sky-100 text-sky-700'
                            : u.vip === 'Bronze' ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {u.vip}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          key="user"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* User Tab Navigation */}
          <div className="flex flex-wrap gap-1 bg-white border p-1 rounded-lg mb-6 w-fit">
            {userTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setUserTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                  userTab === tab.value
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-gray-50'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* User Tab Content */}
          <AnimatePresence mode="wait">
            {userTab === 'dashboard' && (activeUserId || isTelegram) && (
              <motion.div key="u-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <UserDashboard telegramId={activeTelegramId} onNavigate={handleUserNavigate} />
              </motion.div>
            )}
            {userTab === 'watch' && activeUserId && (
              <motion.div key="u-watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <WatchAds telegramId={activeTelegramId} userId={activeUserId} />
              </motion.div>
            )}
            {userTab === 'wallet' && activeUserId && (
              <motion.div key="u-wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <UserWallet telegramId={activeTelegramId} userId={activeUserId} />
              </motion.div>
            )}
            {userTab === 'deposit' && activeUserId && (
              <motion.div key="u-deposit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <DepositComponent telegramId={activeTelegramId} userId={activeUserId} />
              </motion.div>
            )}
            {userTab === 'vip' && activeUserId && (
              <motion.div key="u-vip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <VipUpgrade telegramId={activeTelegramId} userId={activeUserId} />
              </motion.div>
            )}
            {userTab === 'referral' && activeUserId && (
              <motion.div key="u-referral" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <ReferralSystem telegramId={activeTelegramId} userId={activeUserId} />
              </motion.div>
            )}
            {userTab === 'profile' && (
              <motion.div key="u-profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                <UserProfile telegramId={activeTelegramId} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-center text-xs text-muted-foreground">
            &copy; 2025 AdEarn &mdash; User Dashboard
          </p>
        </div>
      </footer>
    </div>
  )
}