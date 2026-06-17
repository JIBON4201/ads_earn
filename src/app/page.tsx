'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Bot, ShieldCheck, Sparkles, ArrowRight, Users, Megaphone, Eye, Wallet } from 'lucide-react'
import AdminPanel from '@/components/admin/AdminPanel'
import UserApp from '@/components/user/UserApp'

type View = 'landing' | 'admin' | 'user'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.45, ease: 'easeOut' },
  }),
}

export default function Home() {
  const [view, setView] = useState<View>('landing')

  if (view === 'admin') {
    return <AdminPanel onBack={() => setView('landing')} />
  }

  if (view === 'user') {
    return <UserApp onBack={() => setView('landing')} />
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Bot className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight leading-tight">AdEarn</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5 leading-tight hidden sm:block">Telegram Ad-Based Earning Platform</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <motion.div
          initial="hidden"
          animate="visible"
          className="space-y-10"
        >
          {/* Title Section */}
          <motion.div
            variants={fadeUp}
            custom={0}
            className="text-center space-y-3"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <Bot className="h-3.5 w-3.5" />
              Telegram Bot Platform
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Welcome to <span className="text-emerald-600">AdEarn</span>
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
              A complete ad-based earning platform with Telegram bot integration, VIP tiers, automated deposits, and comprehensive admin controls.
            </p>
          </motion.div>

          {/* Entry Cards */}
          <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* User App Card */}
            <motion.div variants={fadeUp} custom={1}>
              <button
                onClick={() => setView('user')}
                className="group w-full text-left rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 transition-colors duration-300">
                      <Sparkles className="h-6 w-6 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">User App</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Watch ads, earn points, withdraw earnings, upgrade VIP, and manage your account.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: Eye, label: 'Watch Ads' },
                      { icon: Wallet, label: 'Wallet' },
                      { icon: Sparkles, label: 'VIP Tiers' },
                      { icon: Users, label: 'Referrals' },
                    ].map(({ icon: Icon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-gray-50 px-2 py-1 rounded-md border border-gray-100"
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            </motion.div>

            {/* Admin Panel Card */}
            <motion.div variants={fadeUp} custom={2}>
              <button
                onClick={() => setView('admin')}
                className="group w-full text-left rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-lg hover:border-gray-400 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-900 transition-colors duration-300">
                      <ShieldCheck className="h-6 w-6 text-gray-600 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all duration-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Admin Panel</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Manage users, ads, withdrawals, deposits, fraud alerts, and system settings.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { icon: Users, label: 'Users' },
                      { icon: Megaphone, label: 'Ads' },
                      { icon: ShieldCheck, label: 'Fraud' },
                      { icon: Wallet, label: 'Finance' },
                    ].map(({ icon: Icon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-gray-50 px-2 py-1 rounded-md border border-gray-100"
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            </motion.div>
          </div>

          {/* Stats Bar */}
          <motion.div
            variants={fadeUp}
            custom={3}
            className="flex flex-wrap justify-center gap-6 text-center"
          >
            {[
              { value: '5', label: 'VIP Tiers' },
              { value: '3', label: 'Payment Methods' },
              { value: 'Auto', label: 'Deposits' },
              { value: '24/7', label: 'Bot Active' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-center text-xs text-muted-foreground">
            &copy; 2025 AdEarn &mdash; Telegram Ad-Based Earning Platform
          </p>
        </div>
      </footer>
    </div>
  )
}