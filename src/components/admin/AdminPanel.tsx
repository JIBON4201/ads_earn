'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  ArrowLeft,
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

interface TabBadgeCount {
  fraudAlerts: number
  pendingWithdrawals: number
  pendingDeposits: number
}

interface AdminPanelProps {
  onBack?: () => void
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [badgeCounts, setBadgeCounts] = useState<TabBadgeCount>({
    fraudAlerts: 0,
    pendingWithdrawals: 0,
    pendingDeposits: 0,
  })
  const [botOnline, setBotOnline] = useState<boolean | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBadgeCounts = useCallback(() => {
    Promise.all([
      fetch('/api/admin/fraud?resolved=false').then((r) => r.json()),
      fetch('/api/admin').then((r) => r.json()),
      fetch('/api/admin/deposits?status=pending').then((r) => r.json()),
    ])
      .then(([fraudData, statsData, depositsData]) => {
        setBadgeCounts({
          fraudAlerts: fraudData.alerts?.length || 0,
          pendingWithdrawals: statsData.pendingWithdrawals || 0,
          pendingDeposits: depositsData.stats?.pending || 0,
        })
      })
      .catch(() => {})
  }, [])

  const checkBotStatus = useCallback(() => {
    fetch('/api/admin/bot-status')
      .then((r) => r.json())
      .then((data) => {
        setBotOnline(data.online ?? false)
      })
      .catch(() => setBotOnline(false))
  }, [])

  useEffect(() => {
    fetchBadgeCounts()
    checkBotStatus()
    const interval = setInterval(() => {
      fetchBadgeCounts()
      checkBotStatus()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchBadgeCounts, checkBotStatus])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchBadgeCounts()
    checkBotStatus()
    setTimeout(() => setRefreshing(false), 800)
  }

  const adminTabs = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'ads', label: 'Ads', icon: Megaphone },
    { value: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    {
      value: 'withdrawals',
      label: 'Withdrawals',
      icon: Banknote,
      badge: badgeCounts.pendingWithdrawals,
    },
    {
      value: 'deposits',
      label: 'Deposits',
      icon: Landmark,
      badge: badgeCounts.pendingDeposits,
    },
    {
      value: 'fraud',
      label: 'Fraud',
      icon: ShieldAlert,
      badge: badgeCounts.fraudAlerts,
    },
    { value: 'devices', label: 'Devices', icon: Fingerprint },
    { value: 'vip', label: 'VIP Tiers', icon: Crown },
    { value: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900 text-white shadow-lg">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: Back button + Logo */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                onClick={() => window.location.href = '/'}
                aria-label="Go back"
              >
                <ArrowLeft className="h-4.5 w-4.5" />
              </Button>
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-base font-bold tracking-tight leading-tight text-white">
                    Admin Panel
                  </h1>
                  <p className="text-[10px] text-gray-400 -mt-0.5 leading-tight">
                    AdEarn Management Console
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Bot status + badges + refresh + avatar */}
            <div className="flex items-center gap-2">
              {/* Bot Status Indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/20 text-xs">
                {botOnline === null ? (
                  <div className="h-2 w-2 rounded-full bg-gray-500 animate-pulse" />
                ) : botOnline ? (
                  <CircleDot className="h-3 w-3 text-emerald-400" />
                ) : (
                  <CircleOff className="h-3 w-3 text-red-400" />
                )}
                <span
                  className={`hidden sm:inline font-medium ${
                    botOnline === null
                      ? 'text-gray-400'
                      : botOnline
                        ? 'text-emerald-400'
                        : 'text-red-400'
                  }`}
                >
                  {botOnline === null
                    ? 'Checking...'
                    : botOnline
                      ? 'Online'
                      : 'Offline'}
                </span>
              </div>

              {/* Fraud badge */}
              {badgeCounts.fraudAlerts > 0 && (
                <Badge className="h-6 px-2 text-[10px] bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/20">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  {badgeCounts.fraudAlerts} fraud
                </Badge>
              )}

              {/* Pending withdrawals badge */}
              {badgeCounts.pendingWithdrawals > 0 && (
                <Badge className="h-6 px-2 text-[10px] bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/20">
                  <Banknote className="h-3 w-3 mr-1" />
                  {badgeCounts.pendingWithdrawals} payouts
                </Badge>
              )}

              {/* Pending deposits badge */}
              {badgeCounts.pendingDeposits > 0 && (
                <Badge className="h-6 px-2 text-[10px] bg-sky-500/20 text-sky-300 border-sky-500/30 hover:bg-sky-500/20">
                  <Landmark className="h-3 w-3 mr-1" />
                  {badgeCounts.pendingDeposits} deposits
                </Badge>
              )}

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                onClick={handleRefresh}
                aria-label="Refresh data"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
              </Button>

              {/* Admin Avatar */}
              <div className="h-8 w-8 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center">
                <span className="text-sm font-semibold text-emerald-400">A</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key="admin-panel"
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

              <TabsContent value="overview">
                <DashboardStats />
              </TabsContent>
              <TabsContent value="users">
                <UsersTable />
              </TabsContent>
              <TabsContent value="ads">
                <AdsManager />
              </TabsContent>
              <TabsContent value="transactions">
                <TransactionsPanel />
              </TabsContent>
              <TabsContent value="withdrawals">
                <WithdrawalsPanel />
              </TabsContent>
              <TabsContent value="deposits">
                <DepositsPanel />
              </TabsContent>
              <TabsContent value="fraud">
                <FraudAlerts />
              </TabsContent>
              <TabsContent value="devices">
                <DevicesPanel />
              </TabsContent>
              <TabsContent value="vip">
                <VipTiersPanel />
              </TabsContent>
              <TabsContent value="settings">
                <SettingsPanel />
              </TabsContent>
            </Tabs>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-gray-900 text-gray-400">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-center text-xs">
            &copy; 2025 AdEarn &mdash; Admin Panel
          </p>
        </div>
      </footer>
    </div>
  )
}