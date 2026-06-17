'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
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

const DEMO_USERS: { telegramId: number; label: string; vip: string }[] = [
  { telegramId: 100001, label: 'Rahim (Silver VIP)', vip: 'Silver' },
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
  const [selectedTelegramId, setSelectedTelegramId] = useState<number>(100001)
  const [userId, setUserId] = useState<string>('')
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

  const handleUserNavigate = useCallback((tab: string) => {
    setUserTab(tab)
  }, [])

  // Listen for deposit navigation from Wallet component
  useEffect(() => {
    const handler = () => setUserTab('deposit')
    window.addEventListener('navigate-to-deposit', handler)
    return () => window.removeEventListener('navigate-to-deposit', handler)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Back button + Logo */}
            <div className="flex items-center gap-2.5">
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

            {/* Right: User Selector */}
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
