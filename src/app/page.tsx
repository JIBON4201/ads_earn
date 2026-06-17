'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Banknote,
  ShieldAlert,
  Crown,
  Settings,
  Bot,
  ArrowLeftRight,
  Fingerprint,
  RefreshCw,
  CircleDot,
  CircleOff,
  Eye,
  Wallet,
  UserCircle,
  Share2,
  User,
  Sparkles,
  Landmark,
} from 'lucide-react'

// Admin components
import DashboardStats from '@/components/admin/DashboardStats'
import UsersTable from '@/components/admin/UsersTable'
import AdsManager from '@/components/admin/AdsManager'
import WithdrawalsPanel from '@/components/admin/WithdrawalsPanel'
import FraudAlerts from '@/components/admin/FraudAlerts'
import VipTiersPanel from '@/components/admin/VipTiersPanel'
import SettingsPanel from '@/components/admin/SettingsPanel'
import TransactionsPanel from '@/components/admin/TransactionsPanel'
import DevicesPanel from '@/components/admin/DevicesPanel'
import DepositsPanel from '@/components/admin/DepositsPanel'

// User components
import UserDashboard from '@/components/user/UserDashboard'
import WatchAds from '@/components/user/WatchAds'
import UserWallet from '@/components/user/Wallet'
import VipUpgrade from '@/components/user/VipUpgrade'
import ReferralSystem from '@/components/user/ReferralSystem'
import UserProfile from '@/components/user/UserProfile'
import DepositComponent from '@/components/user/Deposit'

type AppMode = 'admin' | 'user'

interface DemoUser {
  id: string
  telegramId: number
  firstName: string
  lastName: string | null
  username: string | null
  vipLevel: number
  balance: number
}

interface TabBadgeCount {
  fraudAlerts: number
  pendingWithdrawals: number
  pendingDeposits: number
}

const DEMO_USERS: { telegramId: number; label: string; vip: string }[] = [
  { telegramId: 100001, label: 'Rahim (Silver VIP)', vip: 'Silver' },
  { telegramId: 100003, label: 'Fatima (Platinum VIP)', vip: 'Platinum' },
  { telegramId: 100005, label: 'Susmita (Gold VIP)', vip: 'Gold' },
  { telegramId: 100002, label: 'Karim (Bronze VIP)', vip: 'Bronze' },
  { telegramId: 100004, label: 'Habib (Free)', vip: 'Free' },
]

export default function Home() {
  const [mode, setMode] = useState<AppMode>('user')
  const [selectedTelegramId, setSelectedTelegramId] = useState<number>(100001)
  const [userId, setUserId] = useState<string>('')
  const [badgeCounts, setBadgeCounts] = useState<TabBadgeCount>({ fraudAlerts: 0, pendingWithdrawals: 0, pendingDeposits: 0 })
  const [botOnline, setBotOnline] = useState<boolean | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [userTab, setUserTab] = useState('dashboard')

  // Fetch user ID when telegramId changes
  useEffect(() => {
    fetch(`/api/user?telegramId=${selectedTelegramId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUserId(data.user.id)
      })
      .catch(() => {})
  }, [selectedTelegramId])

  const fetchBadgeCounts = useCallback(() => {
    Promise.all([
      fetch('/api/admin/fraud?resolved=false').then((r) => r.json()),
      fetch('/api/admin').then((r) => r.json()),
      fetch('/api/admin/deposits?status=pending').then((r) => r.json()),
    ]).then(([fraudData, statsData, depositsData]) => {
      setBadgeCounts({
        fraudAlerts: fraudData.alerts?.length || 0,
        pendingWithdrawals: statsData.pendingWithdrawals || 0,
        pendingDeposits: depositsData.stats?.pending || 0,
      })
    }).catch(() => {})
  }, [])

  const checkBotStatus = useCallback(() => {
    fetch('/api/admin/bot-status')
      .then((r) => r.json())
      .then((data) => { setBotOnline(data.online ?? false) })
      .catch(() => setBotOnline(false))
  }, [])

  useEffect(() => {
    fetchBadgeCounts()
    checkBotStatus()
    const interval = setInterval(() => { fetchBadgeCounts(); checkBotStatus() }, 30000)
    return () => clearInterval(interval)
  }, [fetchBadgeCounts, checkBotStatus])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchBadgeCounts()
    checkBotStatus()
    setTimeout(() => setRefreshing(false), 800)
  }

  const handleUserNavigate = (tab: string) => {
    setUserTab(tab)
  }

  // Listen for deposit navigation from Wallet component
  useEffect(() => {
    const handler = () => setUserTab('deposit')
    window.addEventListener('navigate-to-deposit', handler)
    return () => window.removeEventListener('navigate-to-deposit', handler)
  }, [])

  const adminTabs = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'ads', label: 'Ads', icon: Megaphone },
    { value: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { value: 'withdrawals', label: 'Withdrawals', icon: Banknote, badge: badgeCounts.pendingWithdrawals },
    { value: 'deposits', label: 'Deposits', icon: Landmark, badge: badgeCounts.pendingDeposits },
    { value: 'fraud', label: 'Fraud', icon: ShieldAlert, badge: badgeCounts.fraudAlerts },
    { value: 'devices', label: 'Devices', icon: Fingerprint },
    { value: 'vip', label: 'VIP Tiers', icon: Crown },
    { value: 'settings', label: 'Settings', icon: Settings },
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold tracking-tight leading-tight">AdEarn</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5 leading-tight">Telegram Ad Earning Platform</p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2">
              {/* Admin/User Switcher */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setMode('user')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    mode === 'user'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">User App</span>
                </button>
                <button
                  onClick={() => setMode('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                    mode === 'admin'
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </div>

              {/* User Selector (only in user mode) */}
              <AnimatePresence mode="wait">
                {mode === 'user' && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Admin-only: Bot status + refresh */}
              {mode === 'admin' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs">
                    {botOnline === null ? (
                      <div className="h-2 w-2 rounded-full bg-gray-300 animate-pulse" />
                    ) : botOnline ? (
                      <CircleDot className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <CircleOff className="h-3 w-3 text-red-400" />
                    )}
                    <span className={`hidden sm:inline font-medium ${botOnline ? 'text-emerald-600' : botOnline === false ? 'text-red-500' : 'text-muted-foreground'}`}>
                      {botOnline === null ? 'Checking...' : botOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
                    <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-emerald-700">A</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          {mode === 'admin' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="flex flex-wrap h-auto gap-1 bg-white border p-1 rounded-lg mb-6 w-fit">
                  {adminTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      <tab.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <Badge
                          variant="secondary"
                          className={`h-5 min-w-[20px] px-1.5 text-[10px] ${
                            tab.value === 'fraud'
                              ? 'bg-red-500 text-white hover:bg-red-500'
                              : 'bg-amber-500 text-white hover:bg-amber-500'
                          }`}
                        >
                          {tab.badge}
                        </Badge>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="overview"><DashboardStats /></TabsContent>
                <TabsContent value="users"><UsersTable /></TabsContent>
                <TabsContent value="ads"><AdsManager /></TabsContent>
                <TabsContent value="transactions"><TransactionsPanel /></TabsContent>
                <TabsContent value="withdrawals"><WithdrawalsPanel /></TabsContent>
                <TabsContent value="deposits"><DepositsPanel /></TabsContent>
                <TabsContent value="fraud"><FraudAlerts /></TabsContent>
                <TabsContent value="devices"><DevicesPanel /></TabsContent>
                <TabsContent value="vip"><VipTiersPanel /></TabsContent>
                <TabsContent value="settings"><SettingsPanel /></TabsContent>
              </Tabs>
            </motion.div>
          ) : (
            <motion.div
              key="user"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
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
                {userTab === 'dashboard' && userId && (
                  <motion.div key="u-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <UserDashboard telegramId={selectedTelegramId} onNavigate={handleUserNavigate} />
                  </motion.div>
                )}
                {userTab === 'watch' && userId && (
                  <motion.div key="u-watch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <WatchAds telegramId={selectedTelegramId} userId={userId} />
                  </motion.div>
                )}
                {userTab === 'wallet' && userId && (
                  <motion.div key="u-wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <UserWallet telegramId={selectedTelegramId} userId={userId} />
                  </motion.div>
                )}
                {userTab === 'deposit' && userId && (
                  <motion.div key="u-deposit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <DepositComponent telegramId={selectedTelegramId} userId={userId} />
                  </motion.div>
                )}
                {userTab === 'vip' && userId && (
                  <motion.div key="u-vip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <VipUpgrade telegramId={selectedTelegramId} userId={userId} />
                  </motion.div>
                )}
                {userTab === 'referral' && userId && (
                  <motion.div key="u-referral" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <ReferralSystem telegramId={selectedTelegramId} userId={userId} />
                  </motion.div>
                )}
                {userTab === 'profile' && (
                  <motion.div key="u-profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <UserProfile telegramId={selectedTelegramId} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-center text-xs text-muted-foreground">
            &copy; 2025 AdEarn &mdash; Telegram Ad-Based Earning Platform &middot; {mode === 'admin' ? 'Admin Panel' : 'User Dashboard'}
          </p>
        </div>
      </footer>
    </div>
  )
}