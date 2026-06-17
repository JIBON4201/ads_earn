'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { toast } from 'sonner'
import {
  ArrowDownCircle,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Smartphone,
  Send,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react'

interface Deposit {
  id: string
  amount: number
  paymentMethod: string
  senderNumber: string
  transactionId: string
  status: string
  verificationMethod: string
  adminNote: string | null
  requestedAt: string
  verifiedAt: string | null
  expiresAt: string | null
}

interface PaymentMethod {
  id: string
  name: string
  number: string
  color: string
  icon: string
  enabled: boolean
}

interface DepositConfig {
  minAmount: number
  maxAmount: number
  autoVerify: boolean
  expireMinutes: number
}

interface DepositData {
  deposits: Deposit[]
  paymentMethods: PaymentMethod[]
  config: DepositConfig
  pendingCount: number
}

interface DepositProps {
  telegramId: number
  userId: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  auto_verified: { label: 'Auto Verified', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: ShieldCheck },
  verified: { label: 'Verified', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-gray-100 text-gray-500 border-gray-200', icon: AlertTriangle },
}

const METHOD_ICONS: Record<string, typeof Smartphone> = {
  mobile: Smartphone,
  send: Send,
  zap: Zap,
}

export default function DepositComponent({ telegramId, userId }: DepositProps) {
  const [data, setData] = useState<DepositData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [step, setStep] = useState<'method' | 'confirm' | 'trxid'>('method')
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [depositAmount, setDepositAmount] = useState('')
  const [senderNumber, setSenderNumber] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/deposit?telegramId=${telegramId}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [telegramId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
    toast.success('Copied to clipboard!')
  }

  const handleSubmit = async () => {
    if (!depositAmount || !senderNumber || !transactionId) {
      toast.error('Please fill in all fields')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/user/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: depositAmount,
          paymentMethod: selectedMethod,
          senderNumber,
          transactionId,
        }),
      })

      const result = await res.json()

      if (res.ok) {
        const isAuto = result.deposit.status === 'auto_verified'
        toast.success(result.message, {
          description: isAuto
            ? `New balance: ${result.deposit.newBalance.toFixed(1)} TK`
            : `Your deposit will be verified within ${data?.config.expireMinutes || 30} minutes.`,
          duration: isAuto ? 5000 : 4000,
        })
        // Reset form
        setSelectedMethod('')
        setDepositAmount('')
        setSenderNumber('')
        setTransactionId('')
        setStep('method')
        setDialogOpen(false)
        fetchData()
      } else {
        toast.error(result.error || 'Deposit failed')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getMethod = (id: string) => data?.paymentMethods.find((m) => m.id === id)
  const selectedMethodInfo = getMethod(selectedMethod)

  const getExpiryCountdown = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-5">
      {/* Deposit Header Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-violet-600 to-purple-500 p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-purple-200" />
                <span className="text-sm text-purple-100">Deposit Funds</span>
              </div>
              {data.config.autoVerify && (
                <Badge className="bg-white/20 text-white border-white/30 text-[10px]">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Auto-Verify Active
                </Badge>
              )}
            </div>
            <p className="text-2xl font-bold mb-1">Add Balance Instantly</p>
            <p className="text-sm text-purple-100">
              Send payment via bKash, Nagad, or Rocket and get verified{' '}
              {data.config.autoVerify ? 'automatically' : 'by admin'}
            </p>
          </div>
          <CardContent className="p-4">
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open)
                if (!open) {
                  setStep('method')
                  setSelectedMethod('')
                  setDepositAmount('')
                  setSenderNumber('')
                  setTransactionId('')
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11 text-sm font-semibold">
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Make a Deposit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ArrowDownCircle className="h-5 w-5 text-violet-600" />
                    Deposit Funds
                  </DialogTitle>
                </DialogHeader>

                <AnimatePresence mode="wait">
                  {/* Step 1: Select Payment Method */}
                  {step === 'method' && (
                    <motion.div
                      key="step-method"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4 pt-2"
                    >
                      <p className="text-sm text-muted-foreground">
                        Select your payment method to see deposit instructions:
                      </p>
                      <div className="space-y-2">
                        {data.paymentMethods.map((method) => {
                          const IconComp = METHOD_ICONS[method.icon] || Smartphone
                          const isAvailable = !!method.number
                          return (
                            <button
                              key={method.id}
                              onClick={() => isAvailable && setSelectedMethod(method.id)}
                              disabled={!isAvailable}
                              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                                !isAvailable
                                  ? 'opacity-40 cursor-not-allowed border-gray-200'
                                  : selectedMethod === method.id
                                    ? 'border-violet-500 bg-violet-50 shadow-sm'
                                    : 'border-gray-200 hover:border-violet-300 hover:bg-violet-50/50'
                              }`}
                            >
                              <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: method.color }}
                              >
                                <IconComp className="h-5 w-5" />
                              </div>
                              <div className="text-left flex-1">
                                <p className="font-semibold text-sm">{method.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {isAvailable
                                    ? `Send to: ${method.number}`
                                    : 'Not configured'}
                                </p>
                              </div>
                              {isAvailable && (
                                <div className="shrink-0">
                                  <div
                                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                                      selectedMethod === method.id
                                        ? 'border-violet-500 bg-violet-500'
                                        : 'border-gray-300'
                                    }`}
                                  >
                                    {selectedMethod === method.id && (
                                      <div className="h-2 w-2 rounded-full bg-white" />
                                    )}
                                  </div>
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                      <Button
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11"
                        disabled={!selectedMethod}
                        onClick={() => setStep('confirm')}
                      >
                        Continue
                      </Button>
                    </motion.div>
                  )}

                  {/* Step 2: Payment Instructions & Amount */}
                  {step === 'confirm' && selectedMethodInfo && (
                    <motion.div
                      key="step-confirm"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4 pt-2"
                    >
                      <div
                        className="rounded-xl p-4 text-white text-center"
                        style={{ backgroundColor: selectedMethodInfo.color }}
                      >
                        <p className="text-xs opacity-80 mb-1">
                          Send payment to this {selectedMethodInfo.name} number
                        </p>
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <p className="text-2xl font-bold font-mono tracking-wider">
                            {selectedMethodInfo.number}
                          </p>
                          <button
                            onClick={() => copyToClipboard(selectedMethodInfo.number, 'phone')}
                            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                          >
                            {copied === 'phone' ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs opacity-80">
                          {data.config.minAmount} — {data.config.maxAmount} TK
                        </p>
                      </div>

                      <div>
                        <Label className="text-sm">Amount (TK)</Label>
                        <div className="relative mt-1.5">
                          <Input
                            type="number"
                            placeholder={`Min ${data.config.minAmount} TK`}
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            min={data.config.minAmount}
                            max={data.config.maxAmount}
                            step="1"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            TK
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <p className="text-xs text-muted-foreground">
                            Min: {data.config.minAmount} TK
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Max: {data.config.maxAmount} TK
                          </p>
                        </div>
                        {/* Quick amount buttons */}
                        <div className="flex gap-1.5 mt-2">
                          {[50, 100, 200, 500, 1000].map((amt) => (
                            <button
                              key={amt}
                              onClick={() => setDepositAmount(amt.toString())}
                              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                depositAmount === amt.toString()
                                  ? 'bg-violet-100 border-violet-300 text-violet-700'
                                  : 'border-gray-200 text-muted-foreground hover:border-violet-200 hover:text-violet-600'
                              }`}
                            >
                              {amt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Your {selectedMethodInfo.name} Number</Label>
                        <Input
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={senderNumber}
                          onChange={(e) => setSenderNumber(e.target.value)}
                          className="mt-1.5"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          The number you sent payment from
                        </p>
                      </div>

                      {data.config.autoVerify && (
                        <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                          <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-emerald-700">Auto-Verify Active</p>
                            <p className="text-xs text-emerald-600">
                              Deposits up to 500 TK are verified automatically within seconds
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 h-10"
                          onClick={() => setStep('method')}
                        >
                          Back
                        </Button>
                        <Button
                          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white h-10"
                          disabled={!depositAmount || !senderNumber}
                          onClick={() => setStep('trxid')}
                        >
                          Next
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Enter TrxID */}
                  {step === 'confirm' && !selectedMethodInfo && null}

                  {step === 'trxid' && selectedMethodInfo && (
                    <motion.div
                      key="step-trxid"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4 pt-2"
                    >
                      <div className="text-center space-y-2">
                        <div
                          className="h-12 w-12 rounded-full flex items-center justify-center text-white mx-auto"
                          style={{ backgroundColor: selectedMethodInfo.color }}
                        >
                          <Send className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            Confirm Your Payment
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Enter the Transaction ID from your {selectedMethodInfo.name} app
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-lg space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-semibold">{depositAmount} TK</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Method</span>
                          <span className="font-medium">{selectedMethodInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sent From</span>
                          <span className="font-mono text-xs">{senderNumber}</span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm">Transaction ID (TrxID)</Label>
                        <Input
                          placeholder="e.g. TXN8A3B2C1D"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                          className="mt-1.5 font-mono tracking-wider"
                        />
                        <div className="flex items-start gap-1.5 mt-1.5">
                          <Info className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            Find this in your {selectedMethodInfo.name} payment history / SMS notification
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-amber-700">Verification</p>
                          <p className="text-xs text-amber-600">
                            {data.config.autoVerify
                              ? `Auto-verified deposits (≤500 TK) credit instantly. Larger deposits are verified within ${data.config.expireMinutes} minutes.`
                              : `Your deposit will be verified by admin within ${data.config.expireMinutes} minutes.`}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 h-10"
                          onClick={() => setStep('confirm')}
                        >
                          Back
                        </Button>
                        <Button
                          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white h-10"
                          disabled={submitting || !transactionId || transactionId.length < 6}
                          onClick={handleSubmit}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          {submitting ? 'Submitting...' : 'Submit Deposit'}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </motion.div>

      {/* Auto-Verify Info Banner */}
      {data.config.autoVerify && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Automated Verification</p>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Deposits of 500 TK or less are verified and credited automatically. 
                    Larger deposits are verified by admin within {data.config.expireMinutes} minutes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pending Deposits */}
      {data.pendingCount > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
              <Clock className="h-4 w-4" />
              Pending Deposits ({data.pendingCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {data.deposits
              .filter((d) => d.status === 'pending')
              .map((d) => {
                const method = data.paymentMethods.find((m) => m.id === d.paymentMethod)
                const countdown = getExpiryCountdown(d.expiresAt)
                return (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{d.amount.toFixed(1)} TK</p>
                      <p className="text-xs text-muted-foreground">
                        {method?.name || d.paymentMethod} — TrxID: {d.transactionId}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {countdown || 'Pending'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}

      {/* Deposit History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-violet-500" />
            Deposit History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.deposits.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto">
                <ArrowDownCircle className="h-6 w-6 text-violet-400" />
              </div>
              <p className="text-sm text-muted-foreground">No deposits yet</p>
              <p className="text-xs text-muted-foreground">
                Make your first deposit to add balance
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-1">
                {data.deposits.map((d, i) => {
                  const statusConf = STATUS_CONFIG[d.status] || STATUS_CONFIG.pending
                  const StatusIcon = statusConf.icon
                  const method = data.paymentMethods.find((m) => m.id === d.paymentMethod)
                  return (
                    <motion.div
                      key={d.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                    >
                      <div className="flex items-center gap-3 py-2.5">
                        <div
                          className="p-2 rounded-lg shrink-0"
                          style={{ backgroundColor: method ? `${method.color}15` : '#f3f4f6' }}
                        >
                          <StatusIcon
                            className={`h-4 w-4`}
                            style={{ color: method?.color || '#9ca3af' }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm leading-tight font-medium">
                              +{d.amount.toFixed(1)} TK
                            </p>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 ${statusConf.color}`}
                            >
                              {statusConf.label}
                            </Badge>
                            {d.verificationMethod === 'auto' && (
                              <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1 py-0 h-4">
                                AUTO
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {method?.name || d.paymentMethod} — {d.transactionId}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(d.requestedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {d.adminNote && (
                              <span className="ml-1.5 text-amber-600">— {d.adminNote}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {i < data.deposits.length - 1 && <Separator />}
                    </motion.div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}