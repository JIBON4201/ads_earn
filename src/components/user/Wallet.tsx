'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Wallet as WalletIcon,
  ArrowDownCircle,
  ArrowUpCircle,
  Crown,
  Gift,
  Clock,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  Landmark,
} from 'lucide-react'

interface Transaction {
  id: string
  type: string
  amount: number
  balanceAfter: number
  description: string
  createdAt: string
}

interface PendingWithdrawal {
  id: string
  amount: number
  paymentMethod: string
  paymentNumber: string
  status: string
  requestedAt: string
}

interface WithdrawalLimits {
  minAmount: number
  maxWithdrawals: number
  totalWithdrawals: number
  remainingWithdrawals: number
  isFreeUser: boolean
}

interface WalletData {
  balance: number
  totalEarned: number
  transactions: Transaction[]
  pendingWithdrawals: PendingWithdrawal[]
  withdrawalLimits: WithdrawalLimits
  vipLevel: number
  vipName: string
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface WalletProps {
  telegramId: number
  userId: string
}

const TYPE_STYLES: Record<string, { color: string; bg: string; icon: typeof ArrowDownCircle }> = {
  ad_reward: { color: 'text-emerald-600', bg: 'bg-emerald-100', icon: ArrowDownCircle },
  referral_bonus: { color: 'text-sky-600', bg: 'bg-sky-100', icon: Gift },
  withdrawal: { color: 'text-red-600', bg: 'bg-red-100', icon: ArrowUpCircle },
  deposit: { color: 'text-violet-600', bg: 'bg-violet-100', icon: Landmark },
  vip_purchase: { color: 'text-purple-600', bg: 'bg-purple-100', icon: Crown },
  admin_adjust: { color: 'text-amber-600', bg: 'bg-amber-100', icon: CreditCard },
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  paid: { label: 'Paid', color: 'bg-sky-100 text-sky-700' },
}

export default function UserWalletComponent({ telegramId, userId }: WalletProps) {
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [form, setForm] = useState({
    amount: '',
    paymentMethod: '',
    paymentNumber: '',
  })

  const fetchWallet = useCallback(async (p: number = 1) => {
    try {
      const res = await fetch(`/api/user/wallet?telegramId=${telegramId}&page=${p}&limit=15`)
      if (res.ok) {
        const data = await res.json()
        setWalletData(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [telegramId])

  useEffect(() => {
    fetchWallet(page)
  }, [fetchWallet, page])

  const handleWithdraw = async () => {
    if (!form.amount || !form.paymentMethod || !form.paymentNumber) {
      toast.error('Please fill in all fields')
      return
    }

    setWithdrawError('')
    setWithdrawing(true)
    try {
      const res = await fetch('/api/user/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: form.amount,
          paymentMethod: form.paymentMethod,
          paymentNumber: form.paymentNumber,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message, {
          description: `Amount: ${data.withdrawal.amount} TK → ${data.withdrawal.paymentMethod}`,
        })
        setForm({ amount: '', paymentMethod: '', paymentNumber: '' })
        setDialogOpen(false)
        fetchWallet(1)
        setPage(1)
      } else {
        setWithdrawError(data.error || 'Withdrawal failed')
        toast.error(data.error || 'Withdrawal failed')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 rounded-xl" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!walletData) return null

  return (
    <div className="space-y-5">
      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-500 p-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <WalletIcon className="h-4 w-4 text-emerald-200" />
              <span className="text-sm text-emerald-100">Available Balance</span>
            </div>
            <p className="text-4xl font-bold tracking-tight">
              {walletData.balance.toFixed(1)}
              <span className="text-lg font-normal ml-1">TK</span>
            </p>
            <p className="text-sm text-emerald-100 mt-1">
              Total earned: {walletData.totalEarned.toFixed(1)} TK
            </p>
          </div>
          <CardContent className="p-4">
            {/* Withdrawal limit info */}
            <div className="mb-3 p-2.5 rounded-lg bg-white border text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Min. Withdrawal</span>
                <span className="font-semibold text-foreground">{walletData.withdrawalLimits.minAmount} TK</span>
              </div>
              {walletData.withdrawalLimits.isFreeUser ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Withdrawals Used</span>
                  <span className={`font-semibold ${walletData.withdrawalLimits.remainingWithdrawals <= 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {walletData.withdrawalLimits.totalWithdrawals} / 1 (one-time only)
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tier</span>
                  <span className="font-medium text-emerald-600">{walletData.vipName} — Unlimited</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setWithdrawError('') }}>
                <DialogTrigger asChild>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-sm font-semibold"
                    disabled={walletData.withdrawalLimits.remainingWithdrawals <= 0}
                  >
                    <ArrowUpCircle className="h-4 w-4 mr-1.5" />
                    Withdraw
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                    Withdraw Funds
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {/* Limits info inside dialog */}
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                    <WalletIcon className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-amber-800">
                      {walletData.withdrawalLimits.isFreeUser
                        ? `Free tier: minimum ${walletData.withdrawalLimits.minAmount} TK, 1 withdrawal only`
                        : `${walletData.vipName}: minimum ${walletData.withdrawalLimits.minAmount} TK`}
                    </span>
                  </div>

                  <div>
                    <Label className="text-sm">Payment Method</Label>
                    <Select
                      value={form.paymentMethod}
                      onValueChange={(v) => setForm({ ...form, paymentMethod: v })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bkash">bKash</SelectItem>
                        <SelectItem value="nagad">Nagad</SelectItem>
                        <SelectItem value="rocket">Rocket</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm">Amount (TK)</Label>
                    <div className="relative mt-1.5">
                      <Input
                        type="number"
                        placeholder={`Minimum ${walletData.withdrawalLimits.minAmount} TK`}
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        min={walletData.withdrawalLimits.minAmount}
                        step="0.1"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        TK
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {walletData.balance.toFixed(1)} TK · Min: {walletData.withdrawalLimits.minAmount} TK
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm">Phone Number</Label>
                    <Input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={form.paymentNumber}
                      onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })}
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter your {form.paymentMethod || 'payment'} number
                    </p>
                  </div>

                  {withdrawError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{withdrawError}</p>
                  )}

                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                  >
                    {withdrawing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                    )}
                    {withdrawing ? 'Processing...' : 'Request Withdrawal'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
              <Button
                className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 text-sm font-semibold"
                onClick={() => {
                  const event = new CustomEvent('navigate-to-deposit')
                  window.dispatchEvent(event)
                }}
              >
                <Landmark className="h-4 w-4 mr-1.5" />
                Deposit
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Withdrawals */}
      {walletData.pendingWithdrawals.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
              <Clock className="h-4 w-4" />
              Pending Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {walletData.pendingWithdrawals.map((w) => {
              const method = w.paymentMethod.charAt(0).toUpperCase() + w.paymentMethod.slice(1)
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{w.amount.toFixed(1)} TK</p>
                    <p className="text-xs text-muted-foreground">
                      {method} — {w.paymentNumber}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    Processing
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {walletData.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet
            </p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-1">
                {walletData.transactions.map((tx, i) => {
                  const style = TYPE_STYLES[tx.type] || TYPE_STYLES.admin_adjust
                  const Icon = style.icon
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                    >
                      <div className="flex items-center gap-3 py-2.5">
                        <div className={`${style.bg} p-2 rounded-lg shrink-0`}>
                          <Icon className={`h-4 w-4 ${style.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-tight truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(tx.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-semibold tabular-nums ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tx.amount >= 0 ? '+' : ''}{tx.amount.toFixed(1)}
                          </p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">
                            Bal: {tx.balanceAfter.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      {i < walletData.transactions.length - 1 && <Separator />}
                    </motion.div>
                  )
                })}
              </div>
            </ScrollArea>
          )}

          {/* Pagination */}
          {walletData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Page {walletData.pagination.page} of {walletData.pagination.totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page >= walletData.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}