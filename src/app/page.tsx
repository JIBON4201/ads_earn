'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import DashboardStats from '@/components/admin/DashboardStats'
import UsersTable from '@/components/admin/UsersTable'
import AdsManager from '@/components/admin/AdsManager'
import WithdrawalsPanel from '@/components/admin/WithdrawalsPanel'
import FraudAlerts from '@/components/admin/FraudAlerts'
import VipTiersPanel from '@/components/admin/VipTiersPanel'
import SettingsPanel from '@/components/admin/SettingsPanel'
import TransactionsPanel from '@/components/admin/TransactionsPanel'
import DevicesPanel from '@/components/admin/DevicesPanel'

interface TabBadgeCount {
  fraudAlerts: number
  pendingWithdrawals: number
}

export default function Home() {
  const [badgeCounts, setBadgeCounts] = useState<TabBadgeCount>({ fraudAlerts: 0, pendingWithdrawals: 0 })
  const [botOnline, setBotOnline] = useState<boolean | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchBadgeCounts = useCallback(() => {
    Promise.all([
      fetch('/api/admin/fraud?resolved=false').then((r) => r.json()),
      fetch('/api/admin').then((r) => r.json()),
    ]).then(([fraudData, statsData]) => {
      setBadgeCounts({
        fraudAlerts: fraudData.alerts?.length || 0,
        pendingWithdrawals: statsData.pendingWithdrawals || 0,
      })
    }).catch(() => {})
  }, [])

  const checkBotStatus = useCallback(() => {
    // Check if the Telegram bot mini-service is running on port 3001
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
    // Refresh counts every 30 seconds
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

  const tabs = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'ads', label: 'Ads', icon: Megaphone },
    { value: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
    { value: 'withdrawals', label: 'Withdrawals', icon: Banknote, badge: badgeCounts.pendingWithdrawals },
    { value: 'fraud', label: 'Fraud', icon: ShieldAlert, badge: badgeCounts.fraudAlerts },
    { value: 'devices', label: 'Devices', icon: Fingerprint },
    { value: 'vip', label: 'VIP Tiers', icon: Crown },
    { value: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">AdEarn Bot Admin</h1>
                <p className="text-xs text-muted-foreground -mt-0.5 hidden sm:block">Telegram Ad Earning Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Bot Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs">
                {botOnline === null ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-gray-300 animate-pulse" />
                    <span className="text-muted-foreground hidden sm:inline">Checking...</span>
                  </>
                ) : botOnline ? (
                  <>
                    <CircleDot className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-600 font-medium hidden sm:inline">Bot Online</span>
                  </>
                ) : (
                  <>
                    <CircleOff className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-red-500 font-medium hidden sm:inline">Bot Offline</span>
                  </>
                )}
              </div>

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefresh}
              >
                <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? 'animate-spin' : ''}`} />
              </Button>

              {/* Admin Avatar */}
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-emerald-700">A</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-white border p-1 rounded-lg mb-6 w-fit">
              {tabs.map((tab) => (
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
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-muted-foreground">
            © 2025 AdEarn Bot Admin Panel — Telegram Ad-Based Earning Platform
          </p>
        </div>
      </footer>
    </div>
  )
}