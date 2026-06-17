'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
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
  RefreshCw,
  Timer,
  CheckCheck,
  CircleAlert,
  ArrowRight,
  Landmark,
  CreditCard,
  SmartphoneNfc,
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
  verificationAttempts?: number
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
  verifyDelaySeconds: number
  enabled: boolean
}

interface DepositProgress {
  isVerifying: boolean
  isComplete: boolean
  isFailed: boolean
  timeToVerify: number
  expiresIn: number | null
}

interface AutomationLog {
  action: string
  status: string
  message: string
  createdAt: string
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 5000]

const METHOD_ICONS: Record<string, React.ReactNode> = {
  smartphone: <Smartphone className="h-5 w-5" />,
  send: <Send className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; desc: string }> = {
  pending: {
    label: 'Queued',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <Clock className="h-4 w-4" />,
    desc: 'Waiting in queue for auto-verification',
  },
  verifying: {
    label: 'Verifying',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    desc: 'Payment is being verified automatically',
  },
  auto_verified: {
    label: 'Auto-Verified',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: <ShieldCheck className="h-4 w-4" />,
    desc: 'Deposit verified and credited automatically',
  },
  verified: {
    label: 'Verified',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: <CheckCircle2 className="h-4 w-4" />,
    desc: 'Deposit verified and credited',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <XCircle className="h-4 w-4" />,
    desc: 'Deposit was rejected',
  },
  expired: {
    label: 'Expired',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: <Timer className="h-4 w-4" />,
    desc: 'Deposit expired — verification timeout',
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: <CircleAlert className="h-4 w-4" />,
    desc: 'Verification failed after multiple attempts',
  },
}

export default function DepositComponent({ telegramId, userId }: { telegramId: number; userId: string }) {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3 | 'tracking'>('tracking')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [config, setConfig] = useState<DepositConfig | null>(null)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [senderNumber, setSenderNumber] = useState('')
  const [transactionId, setTransactionId] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [activeDeposit, setActiveDeposit] = useState<Deposit | null>(null)
  const [depositProgress, setDepositProgress] = useState<DepositProgress | null>(null)
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([])
  const [userBalance, setUserBalance] = useState<number | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/deposit?telegramId=${telegramId}`)
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setPaymentMethods(data.paymentMethods || [])
      setConfig(data.config || null)
      setDeposits(data.deposits || [])

      // Check if there's an active deposit being processed
      const activeDep = (data.deposits || []).find((d: Deposit) =>
        ['pending', 'verifying'].includes(d.status)
      )
      if (activeDep) {
        setActiveDeposit(activeDep)
        setStep('tracking')
      }
    } catch {
      toast.error('Failed to load deposit data')
    } finally {
      setLoading(false)
    }
  }, [telegramId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll deposit status when tracking
  useEffect(() => {
    if (!activeDeposit) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/user/deposit/status?depositId=${activeDeposit.id}`)
        const data = await res.json()
        if (data.error) return

        setDepositProgress(data.progress)
        setAutomationLogs(data.logs || [])
        setUserBalance(data.userBalance)

        // Update deposit status
        setActiveDeposit((prev) => {
          if (!prev) return null
          return { ...prev, ...data.deposit }
        })

        // If complete or failed, stop polling and refresh
        if (data.progress.isComplete) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          toast.success(`Deposit of ${data.deposit.amount} TK credited to your balance!`)
          fetchData()
          // Clear active after 3 seconds
          setTimeout(() => {
            setActiveDeposit(null)
            setDepositProgress(null)
            setStep('tracking')
          }, 3000)
        } else if (data.progress.isFailed) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          toast.error(`Deposit failed: ${data.deposit.adminNote || 'Verification failed'}`)
          fetchData()
          setTimeout(() => {
            setActiveDeposit(null)
            setDepositProgress(null)
            setStep('tracking')
          }, 5000)
        }
      } catch { /* ignore poll errors */ }
    }

    // Poll immediately
    pollStatus()

    // Then every 2 seconds
    pollIntervalRef.current = setInterval(pollStatus, 2000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [activeDeposit?.id, fetchData])

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSubmit = async () => {
    if (!selectedMethod || !amount || !senderNumber || !transactionId) {
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
          amount: parseFloat(amount),
          paymentMethod: selectedMethod,
          senderNumber,
          transactionId,
        }),
      })
      const data = await res.json()

      if (data.error) {
        toast.error(data.error)
        setSubmitting(false)
        return
      }

      toast.success(data.message)
      setActiveDeposit(data.deposit)
      setDepositProgress({
        isVerifying: false,
        isComplete: false,
        isFailed: false,
        timeToVerify: data.deposit.estimatedVerifySeconds || 8,
        expiresIn: config?.expireMinutes ? config.expireMinutes * 60 : 1800,
      })
      setStep('tracking')
      setAmount('')
      setSenderNumber('')
      setTransactionId('')
      setSubmitting(false)
    } catch {
      toast.error('Failed to submit deposit')
      setSubmitting(false)
    }
  }

  const selectedMethodData = paymentMethods.find((m) => m.id === selectedMethod)

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0s'
    if (seconds < 60) return `${Math.ceil(seconds)}s`
    const m = Math.floor(seconds / 60)
    const s = Math.ceil(seconds % 60)
    return `${m}m ${s}s`
  }

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    )
  }

  if (!config?.enabled) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-amber-800">Deposits Temporarily Disabled</h3>
          <p className="text-sm text-amber-600 mt-1">The deposit system is currently under maintenance. Please try again later.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Automation Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Fully Automated Deposits</h2>
              <p className="text-sm text-emerald-100">
                All deposits are verified automatically in ~{config.verifyDelaySeconds}s. No waiting for admin approval.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            <span className="text-xs font-medium">Auto-Verify Active</span>
          </div>
        </div>
      </motion.div>

      {/* Active Deposit Tracking */}
      <AnimatePresence>
        {activeDeposit && step === 'tracking' && (
          <motion.div
            key="tracking"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <Card className="border-2 border-emerald-200 overflow-hidden">
              <div className={`h-1.5 ${
                depositProgress?.isComplete
                  ? 'bg-emerald-500'
                  : depositProgress?.isFailed
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-amber-400 via-blue-400 to-emerald-400 animate-gradient-x'
              }`} style={{ backgroundSize: '200% 100%' }} />
              <CardContent className="p-6">
                {/* Status Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {STATUS_CONFIG[activeDeposit.status] && (
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center border ${STATUS_CONFIG[activeDeposit.status].color}`}>
                        {STATUS_CONFIG[activeDeposit.status].icon}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">
                        {activeDeposit.amount} TK
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {STATUS_CONFIG[activeDeposit.status]?.desc}
                      </p>
                    </div>
                  </div>
                  <Badge className={`text-xs font-semibold ${STATUS_CONFIG[activeDeposit.status]?.color}`}>
                    {STATUS_CONFIG[activeDeposit.status]?.label}
                  </Badge>
                </div>

                {/* Progress Section */}
                {(depositProgress && !depositProgress.isComplete && !depositProgress.isFailed) && (
                  <div className="space-y-3 mb-4">
                    {/* Countdown to verification */}
                    {!depositProgress.isVerifying && depositProgress.timeToVerify > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-amber-700">Verification starts in</span>
                          <span className="text-sm font-bold text-amber-800">
                            {formatTime(depositProgress.timeToVerify)}
                          </span>
                        </div>
                        <Progress
                          value={Math.max(0, 100 - (depositProgress.timeToVerify / (config?.verifyDelaySeconds || 8)) * 100)}
                          className="h-2 bg-amber-100"
                        />
                      </div>
                    )}

                    {/* Verifying progress */}
                    {depositProgress.isVerifying && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                          <span className="text-xs font-medium text-blue-700">Verifying payment...</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <span>Checking with {activeDeposit.paymentMethod === 'bkash' ? 'bKash' : activeDeposit.paymentMethod === 'nagad' ? 'Nagad' : 'Rocket'} API</span>
                          {activeDeposit.verificationAttempts !== undefined && activeDeposit.verificationAttempts > 0 && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 border-blue-300 text-blue-600">
                              Attempt {activeDeposit.verificationAttempts + 1}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Expiry timer */}
                    {depositProgress.expiresIn !== null && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Expires in</span>
                        <span className="font-mono font-medium">
                          {formatTime(depositProgress.expiresIn)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Success State */}
                {depositProgress?.isComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-200 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCheck className="h-5 w-5 text-emerald-600" />
                      <span className="font-bold text-emerald-700">Deposit Successful!</span>
                    </div>
                    <p className="text-sm text-emerald-600">
                      {activeDeposit.amount} TK has been credited to your balance.
                      {userBalance !== null && (
                        <span className="font-semibold"> New balance: {userBalance.toFixed(2)} TK</span>
                      )}
                    </p>
                  </motion.div>
                )}

                {/* Failed State */}
                {depositProgress?.isFailed && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-bold text-red-700">
                        {STATUS_CONFIG[activeDeposit.status]?.label}
                      </span>
                    </div>
                    <p className="text-sm text-red-600">
                      {activeDeposit.adminNote || STATUS_CONFIG[activeDeposit.status]?.desc}
                    </p>
                  </motion.div>
                )}

                {/* Automation Log */}
                {automationLogs.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Verification Log</p>
                    <div className="space-y-1.5">
                      {automationLogs.map((log, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                            log.status === 'success' ? 'bg-emerald-500'
                            : log.status === 'error' ? 'bg-red-500'
                            : log.status === 'warning' ? 'bg-amber-500'
                            : 'bg-blue-500'
                          }`} />
                          <span className="text-muted-foreground">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deposit Details */}
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">{activeDeposit.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">TrxID</p>
                    <p className="font-mono text-xs">{activeDeposit.transactionId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-mono text-xs">{activeDeposit.senderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-xs">{new Date(activeDeposit.requestedAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* New Deposit Button */}
                {(depositProgress?.isComplete || depositProgress?.isFailed) && (
                  <Button
                    onClick={() => { setActiveDeposit(null); setDepositProgress(null); setStep('tracking') }}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    Make Another Deposit
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Flow (when no active deposit) */}
      {!activeDeposit && (
        <>
          {/* Step 1: Select Payment Method */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Step 1: Select Payment Method</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {paymentMethods.map((method) => (
                  <motion.button
                    key={method.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                      selectedMethod === method.id
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {selectedMethod === method.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                    )}
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center mb-2 text-white"
                      style={{ backgroundColor: method.color }}
                    >
                      {METHOD_ICONS[method.icon] || <Smartphone className="h-5 w-5" />}
                    </div>
                    <p className="font-bold text-sm">{method.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{method.number}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600 font-medium">Auto-Verified</span>
                    </div>
                  </motion.button>
                ))}
              </div>
              {selectedMethod && (
                <Button onClick={() => setStep(2)} className="mt-4 w-full sm:w-auto">
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </motion.div>
          )}

          {/* Step 2: Payment Details */}
          {step === 2 && selectedMethodData && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-2 mb-3">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-7 w-7 p-0">
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
                <h3 className="text-sm font-semibold text-muted-foreground">Step 2: Send Payment</h3>
              </div>

              <Card className="border-2" style={{ borderColor: selectedMethodData.color + '40' }}>
                <CardContent className="p-5">
                  {/* Payment Instructions */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium mb-2">Send money to this number:</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 rounded-xl flex items-center justify-center text-white"
                          style={{ backgroundColor: selectedMethodData.color }}
                        >
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xl font-bold font-mono">{selectedMethodData.number}</p>
                          <p className="text-xs text-muted-foreground">{selectedMethodData.name} Merchant Account</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedMethodData.number, 'number')}
                        className="shrink-0"
                      >
                        {copiedField === 'number' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Amount (TK)</Label>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        {QUICK_AMOUNTS.filter((a) => a >= (config?.minAmount || 10) && a <= (config?.maxAmount || 50000)).map((a) => (
                          <button
                            key={a}
                            onClick={() => setAmount(a.toString())}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              amount === a.toString()
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-foreground border-gray-200 hover:border-emerald-300'
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={`Min: ${config?.minAmount || 10} TK — Max: ${config?.maxAmount || 50000} TK`}
                        className="mt-2"
                        min={config?.minAmount}
                        max={config?.maxAmount}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Your {selectedMethodData.name} Number</Label>
                      <Input
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="mt-1.5"
                        maxLength={11}
                      />
                      <p className="text-xs text-muted-foreground mt-1">The number you sent payment from</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      className="flex-1"
                      disabled={!amount || parseFloat(amount) < (config?.minAmount || 10) || !senderNumber.match(/^01[3-9]\d{8}$/)}
                    >
                      Continue <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Transaction ID */}
          {step === 3 && selectedMethodData && (
            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-2 mb-3">
                <Button variant="ghost" size="sm" onClick={() => setStep(2)} className="h-7 w-7 p-0">
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </Button>
                <h3 className="text-sm font-semibold text-muted-foreground">Step 3: Enter Transaction ID</h3>
              </div>

              <Card>
                <CardContent className="p-5">
                  {/* Summary */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-emerald-600 font-medium">Deposit Summary</p>
                        <p className="text-2xl font-bold text-emerald-700 mt-0.5">{amount} TK</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">Via {selectedMethodData.name}</p>
                        <p className="font-mono text-xs">{selectedMethodData.number}</p>
                      </div>
                    </div>
                  </div>

                  {/* TrxID Input */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Transaction ID (TrxID)</Label>
                      <Input
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                        placeholder="e.g. TXN8A3K9M2"
                        className="mt-1.5 font-mono text-lg tracking-wider uppercase"
                        maxLength={20}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Find this in your {selectedMethodData.name} payment history / SMS
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="text-xs text-blue-700">
                          <p className="font-medium">Fully Automated Verification</p>
                          <p className="mt-0.5">
                            After submission, the system will automatically verify your payment in ~{config?.verifyDelaySeconds}s.
                            No need to wait for admin approval — your balance will be updated instantly.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || !transactionId.match(/^[A-Za-z0-9]{6,20}$/)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Submit Deposit
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Start Deposit Button (when step is 'tracking' and no active deposit) */}
          {step === 'tracking' && !activeDeposit && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card
                className="border-dashed border-2 border-emerald-200 bg-emerald-50/50 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all"
                onClick={() => setStep(1)}
              >
                <CardContent className="py-8 text-center">
                  <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <ArrowDownCircle className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h3 className="font-bold text-emerald-800">Make a Deposit</h3>
                  <p className="text-sm text-emerald-600 mt-1">Add funds to your balance via bKash, Nagad, or Rocket</p>
                  <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                    <Landmark className="h-4 w-4 mr-2" />
                    Start Deposit
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}

      {/* Deposit History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Deposit History</CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchData} className="h-7 px-2">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {deposits.length === 0 ? (
            <div className="text-center py-6">
              <SmartphoneNfc className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">No deposits yet</p>
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-2">
                {deposits.map((dep) => {
                  const sc = STATUS_CONFIG[dep.status]
                  return (
                    <motion.div
                      key={dep.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: dep.status === 'auto_verified' || dep.status === 'verified' ? '#10b981'
                              : dep.status === 'pending' || dep.status === 'verifying' ? '#f59e0b'
                              : '#ef4444',
                          }}
                        />
                        <div>
                          <p className="text-sm font-semibold">{dep.amount} TK</p>
                          <p className="text-xs text-muted-foreground">
                            {dep.paymentMethod.charAt(0).toUpperCase() + dep.paymentMethod.slice(1)} &middot; {dep.transactionId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className={`text-[10px] ${sc?.color}`}>
                          {sc?.icon}
                          <span className="ml-1">{sc?.label}</span>
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(dep.requestedAt).toLocaleString()}
                        </p>
                      </div>
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