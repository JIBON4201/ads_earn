'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Check,
  X,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowDownCircle,
  Settings,
  Loader2,
  Search,
  TrendingUp,
  Banknote,
  Timer,
  RotateCcw,
  Activity,
  Zap,
  FileText,
  RefreshCw,
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
  user: {
    id: string
    firstName: string
    lastName: string | null
    username: string | null
    telegramId: number
    balance: number
    vipLevel: number
    isBlocked: boolean
  }
}

interface AutomationLog {
  id: string
  action: string
  status: string
  message: string
  createdAt: string
  deposit: {
    amount: number
    paymentMethod: string
    transactionId: string
    status: string
    user: { firstName: string; telegramId: number } | null
  }
}

interface AutomationStats {
  logsToday: number
  successToday: number
  errorsToday: number
  successRate: number
  recentLogs: AutomationLog[]
}

const STATUS_STYLES: Record<string, { badge: string; icon: React.ReactNode }> = {
  pending: { badge: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3.5 w-3.5" /> },
  verifying: { badge: 'bg-blue-100 text-blue-700', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  auto_verified: { badge: 'bg-emerald-100 text-emerald-700', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  verified: { badge: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected: { badge: 'bg-red-100 text-red-700', icon: <XCircle className="h-3.5 w-3.5" /> },
  expired: { badge: 'bg-gray-100 text-gray-600', icon: <Timer className="h-3.5 w-3.5" /> },
  failed: { badge: 'bg-red-100 text-red-700', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
}

const METHOD_STYLES: Record<string, string> = {
  bkash: 'bg-pink-100 text-pink-700',
  nagad: 'bg-orange-100 text-orange-700',
  rocket: 'bg-purple-100 text-purple-700',
}

export default function DepositsPanel() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [automation, setAutomation] = useState<AutomationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [showSettings, setShowSettings] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [actionDeposit, setActionDeposit] = useState<Deposit | null>(null)
  const [actionType, setActionType] = useState<string>('')
  const [actionNote, setActionNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Settings form
  const [settings, setSettings] = useState({
    deposit_bkash_number: '',
    deposit_nagad_number: '',
    deposit_rocket_number: '',
    deposit_min_amount: '10',
    deposit_max_amount: '50000',
    deposit_auto_verify: true,
    deposit_expire_minutes: '30',
    deposit_verify_delay_seconds: '8',
    deposit_max_verify_attempts: '3',
    deposit_auto_expire: true,
    deposit_enabled: true,
  })
  const [settingsLoading, setSettingsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (methodFilter !== 'all') params.set('method', methodFilter)
      if (search) params.set('search', search)
      params.set('automation', 'true')

      const res = await fetch(`/api/admin/deposits?${params}`)
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      setDeposits(data.deposits || [])
      setStats(data.stats || {})
      setAutomation(data.automation || null)
    } catch {
      toast.error('Failed to fetch deposits')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, methodFilter, search])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleAction = async () => {
    if (!actionDeposit || !actionType) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/deposits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId: actionDeposit.id,
          action: actionType,
          adminNote: actionNote || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      toast.success(data.message)
      setActionDeposit(null)
      setActionType('')
      setActionNote('')
      fetchData()
    } catch {
      toast.error('Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSettingsSave = async () => {
    setSettingsLoading(true)
    try {
      const res = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      toast.success('Deposit settings updated')
      setShowSettings(false)
    } catch {
      toast.error('Failed to update settings')
    } finally {
      setSettingsLoading(false)
    }
  }

  const openActionDialog = (deposit: Deposit, action: string) => {
    setActionDeposit(deposit)
    setActionType(action)
    setActionNote('')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Automation Status Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Deposit Automation Active</h3>
              <p className="text-xs text-emerald-100">
                {automation
                  ? `${automation.logsToday} actions today — ${automation.successRate}% success rate`
                  : 'All deposits are verified automatically'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogs(true)}
              className="text-white hover:bg-white/20 h-8"
            >
              <FileText className="h-4 w-4 mr-1" />
              Logs
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="text-white hover:bg-white/20 h-8"
            >
              <Settings className="h-4 w-4 mr-1" />
              Config
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-white hover:bg-white/20 h-8"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total', value: stats.total || 0, icon: ArrowDownCircle, color: 'text-gray-600' },
          { label: 'Pending', value: (stats.pending || 0) + (stats.verifying || 0), icon: Clock, color: 'text-amber-600' },
          { label: 'Auto Verified', value: stats.autoVerified || 0, icon: ShieldCheck, color: 'text-emerald-600' },
          { label: 'Manual', value: stats.verified || 0, icon: CheckCircle2, color: 'text-blue-600' },
          { label: 'Rejected', value: (stats.rejected || 0) + (stats.failed || 0), icon: XCircle, color: 'text-red-600' },
          { label: 'Expired', value: stats.expired || 0, icon: Timer, color: 'text-gray-500' },
          {
            label: 'Total Amount',
            value: `${((stats.totalAmount || 0)).toLocaleString()} TK`,
            icon: Banknote,
            color: 'text-emerald-600',
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground font-medium truncate">{stat.label}</p>
                <stat.icon className={`h-3.5 w-3.5 ${stat.color} shrink-0`} />
              </div>
              <p className="text-lg font-bold mt-1 leading-tight">{stat.value}</p>
              {stat.label === 'Auto Verified' && (stats.total || 0) > 0 && (
                <p className="text-[10px] text-emerald-600 font-medium">
                  {stats.automationRate || 0}% auto rate
                </p>
              )}
              {stat.label === 'Total Amount' && (
                <p className="text-[10px] text-muted-foreground">
                  Today: {((stats.todayAmount || 0)).toLocaleString()} TK ({stats.todayDeposits || 0} deps)
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search TrxID, name, phone..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verifying">Verifying</SelectItem>
                <SelectItem value="auto_verified">Auto Verified</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="bkash">bKash</SelectItem>
                <SelectItem value="nagad">Nagad</SelectItem>
                <SelectItem value="rocket">Rocket</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Deposits Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Method</TableHead>
                <TableHead className="text-xs">TrxID</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Verified</TableHead>
                <TableHead className="text-xs">Balance</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    No deposits found
                  </TableCell>
                </TableRow>
              ) : (
                deposits.map((dep) => {
                  const ss = STATUS_STYLES[dep.status] || STATUS_STYLES.pending
                  const canVerify = ['pending', 'verifying'].includes(dep.status)
                  const canRetry = ['failed', 'expired', 'rejected'].includes(dep.status)

                  return (
                    <TableRow key={dep.id} className="text-xs">
                      <TableCell>
                        <div>
                          <p className="font-medium">{dep.user.firstName} {dep.user.lastName || ''}</p>
                          <p className="text-muted-foreground"> @{dep.user.username || dep.user.telegramId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">{dep.amount} TK</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-[10px] ${METHOD_STYLES[dep.paymentMethod] || ''}`}>
                          {dep.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-[10px] font-mono bg-gray-50 px-1.5 py-0.5 rounded">
                          {dep.transactionId}
                        </code>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{dep.senderNumber}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={`text-[10px] w-fit ${ss.badge}`}>
                            {ss.icon}
                            <span className="ml-1 capitalize">{dep.status.replace('_', ' ')}</span>
                          </Badge>
                          {dep.verificationMethod === 'auto' && (
                            <span className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                              <ShieldCheck className="h-2.5 w-2.5" /> Auto
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dep.verifiedAt
                          ? new Date(dep.verifiedAt).toLocaleString()
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className="font-mono">{dep.user.balance.toFixed(0)} TK</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canVerify && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => openActionDialog(dep, 'verify')}
                              title="Verify"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canVerify && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => openActionDialog(dep, 'reject')}
                              title="Reject"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canRetry && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => openActionDialog(dep, 'retry')}
                              title="Retry"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionDeposit} onOpenChange={(open) => !open && setActionDeposit(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {actionType === 'verify' && 'Verify Deposit'}
              {actionType === 'reject' && 'Reject Deposit'}
              {actionType === 'retry' && 'Retry Deposit'}
              {actionType === 'expire' && 'Expire Deposit'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {actionDeposit && (
                <>
                  {actionDeposit.amount} TK via {actionDeposit.paymentMethod} — TrxID: {actionDeposit.transactionId}
                  <br />User: {actionDeposit.user.firstName} (Balance: {actionDeposit.user.balance.toFixed(0)} TK)
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={actionType === 'verify' ? 'Reason for manual verification...' : 'Reason for rejection...'}
                className="mt-1 text-xs"
                rows={2}
              />
            </div>
            {actionType === 'verify' && actionDeposit?.status === 'pending' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-700">
                <strong>Preview:</strong> Balance will increase from {actionDeposit?.user.balance.toFixed(0)} TK to{' '}
                {(actionDeposit?.user.balance + (actionDeposit?.amount || 0)).toFixed(0)} TK
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActionDeposit(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAction}
              disabled={actionLoading}
              className={
                actionType === 'verify' || actionType === 'retry'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : actionType === 'reject'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
              }
            >
              {actionLoading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {actionType === 'verify' && 'Verify & Credit'}
              {actionType === 'reject' && 'Reject'}
              {actionType === 'retry' && 'Retry Automation'}
              {actionType === 'expire' && 'Mark Expired'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Deposit Automation Settings
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure the automated deposit verification system
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-4">
              {/* Payment Numbers */}
              <div>
                <Label className="text-xs font-semibold">Payment Numbers</Label>
                <div className="grid gap-2 mt-2">
                  {[
                    { key: 'deposit_bkash_number', label: 'bKash Number', color: 'text-pink-600' },
                    { key: 'deposit_nagad_number', label: 'Nagad Number', color: 'text-orange-600' },
                    { key: 'deposit_rocket_number', label: 'Rocket Number', color: 'text-purple-600' },
                  ].map((item) => (
                    <div key={item.key}>
                      <Label className={`text-[10px] ${item.color} font-medium`}>{item.label}</Label>
                      <Input
                        value={settings[item.key as keyof typeof settings]}
                        onChange={(e) => setSettings((s) => ({ ...s, [item.key]: e.target.value }))}
                        placeholder="01XXXXXXXXX"
                        className="h-8 text-xs mt-0.5"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount Limits */}
              <div>
                <Label className="text-xs font-semibold">Amount Limits</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Min Amount (TK)</Label>
                    <Input
                      type="number"
                      value={settings.deposit_min_amount}
                      onChange={(e) => setSettings((s) => ({ ...s, deposit_min_amount: e.target.value }))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Max Amount (TK)</Label>
                    <Input
                      type="number"
                      value={settings.deposit_max_amount}
                      onChange={(e) => setSettings((s) => ({ ...s, deposit_max_amount: e.target.value }))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                </div>
              </div>

              {/* Automation Controls */}
              <div>
                <Label className="text-xs font-semibold">Automation Controls</Label>
                <div className="space-y-3 mt-2">
                  {[
                    {
                      key: 'deposit_enabled' as const,
                      label: 'Enable Deposits',
                      desc: 'Allow users to submit new deposits',
                    },
                    {
                      key: 'deposit_auto_verify' as const,
                      label: 'Auto-Verify Deposits',
                      desc: 'Automatically verify all deposits without admin intervention',
                    },
                    {
                      key: 'deposit_auto_expire' as const,
                      label: 'Auto-Expire',
                      desc: 'Automatically expire deposits past their timeout',
                    },
                  ].map((toggle) => (
                    <div key={toggle.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{toggle.label}</p>
                        <p className="text-[10px] text-muted-foreground">{toggle.desc}</p>
                      </div>
                      <Switch
                        checked={settings[toggle.key] as boolean}
                        onCheckedChange={(checked) =>
                          setSettings((s) => ({ ...s, [toggle.key]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div>
                <Label className="text-xs font-semibold">Timing</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Verify Delay (s)</Label>
                    <Input
                      type="number"
                      value={settings.deposit_verify_delay_seconds}
                      onChange={(e) => setSettings((s) => ({ ...s, deposit_verify_delay_seconds: e.target.value }))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Expire (min)</Label>
                    <Input
                      type="number"
                      value={settings.deposit_expire_minutes}
                      onChange={(e) => setSettings((s) => ({ ...s, deposit_expire_minutes: e.target.value }))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Max Attempts</Label>
                    <Input
                      type="number"
                      value={settings.deposit_max_verify_attempts}
                      onChange={(e) => setSettings((s) => ({ ...s, deposit_max_verify_attempts: e.target.value }))}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSettingsSave} disabled={settingsLoading} className="bg-emerald-600 hover:bg-emerald-700">
              {settingsLoading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Automation Logs Dialog */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Automation Logs
            </DialogTitle>
            <DialogDescription className="text-xs">
              {automation
                ? `${automation.logsToday} actions today — ${automation.successRate}% success rate — ${automation.successToday} successful, ${automation.errorsToday} errors`
                : 'No automation data'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] pr-2">
            {!automation || automation.recentLogs.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No automation logs yet
              </div>
            ) : (
              <div className="space-y-2">
                {automation.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-white"
                  >
                    <div
                      className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                        log.status === 'success' ? 'bg-emerald-500'
                        : log.status === 'error' ? 'bg-red-500'
                        : log.status === 'warning' ? 'bg-amber-500'
                        : 'bg-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{log.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                        {log.deposit && (
                          <span>
                            {log.deposit.amount} TK via {log.deposit.paymentMethod}
                          </span>
                        )}
                        <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}