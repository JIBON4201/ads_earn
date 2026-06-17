'use client'

import { useEffect, useState } from 'react'
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

interface DepositStats {
  total: number
  pending: number
  autoVerified: number
  verified: number
  rejected: number
  totalAmount: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  auto_verified: 'bg-emerald-100 text-emerald-700',
  verified: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  auto_verified: 'Auto Verified',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
}

export default function DepositsPanel() {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [stats, setStats] = useState<DepositStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [methodFilter, setMethodFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionDialog, setActionDialog] = useState<{
    d: Deposit
    action: 'verify' | 'reject' | 'expire'
  } | null>(null)
  const [settingsDialog, setSettingsDialog] = useState(false)
  const [note, setNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Settings state
  const [settings, setSettings] = useState({
    bkashNumber: '',
    nagadNumber: '',
    rocketNumber: '',
    minAmount: '10',
    maxAmount: '50000',
    autoVerify: false,
    expireMinutes: '30',
  })
  const [savingSettings, setSavingSettings] = useState(false)

  const loadDeposits = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    if (methodFilter && methodFilter !== 'all') params.set('method', methodFilter)
    if (searchQuery) params.set('search', searchQuery)

    fetch(`/api/admin/deposits?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setDeposits(data.deposits || [])
        setStats(data.stats || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDeposits()
  }, [statusFilter, methodFilter])

  const handleSearch = () => {
    loadDeposits()
  }

  const handleAction = async () => {
    if (!actionDialog) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/deposits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depositId: actionDialog.d.id,
          action: actionDialog.action,
          adminNote: note || undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message || `Deposit ${actionDialog.action}d`)
        setActionDialog(null)
        setNote('')
        loadDeposits()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Action failed')
      }
    } catch {
      toast.error('Network error')
    }
    setActionLoading(false)
  }

  const loadSettings = async () => {
    try {
      const allSettings = await fetch('/api/admin/settings').then((r) => r.json())
      const settingMap: Record<string, string> = {}
      for (const s of allSettings.settings || []) {
        settingMap[s.key] = s.value
      }
      setSettings({
        bkashNumber: settingMap.deposit_bkash_number || '',
        nagadNumber: settingMap.deposit_nagad_number || '',
        rocketNumber: settingMap.deposit_rocket_number || '',
        minAmount: settingMap.deposit_min_amount || '10',
        maxAmount: settingMap.deposit_max_amount || '50000',
        autoVerify: settingMap.deposit_auto_verify === 'true',
        expireMinutes: settingMap.deposit_expire_minutes || '30',
      })
    } catch {
      // ignore
    }
  }

  const openSettings = () => {
    loadSettings()
    setSettingsDialog(true)
  }

  const saveSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/admin/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deposit_bkash_number: settings.bkashNumber,
          deposit_nagad_number: settings.nagadNumber,
          deposit_rocket_number: settings.rocketNumber,
          deposit_min_amount: settings.minAmount,
          deposit_max_amount: settings.maxAmount,
          deposit_auto_verify: settings.autoVerify,
          deposit_expire_minutes: settings.expireMinutes,
        }),
      })
      if (res.ok) {
        toast.success('Deposit settings saved')
        setSettingsDialog(false)
        loadDeposits()
      } else {
        toast.error('Failed to save settings')
      }
    } catch {
      toast.error('Network error')
    }
    setSavingSettings(false)
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ArrowDownCircle className="h-4 w-4" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Pending</span>
            </div>
            <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs">Auto Verified</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{stats.autoVerified}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-emerald-500 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Manual</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">{stats.verified}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-red-500 mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-xs">Rejected</span>
            </div>
            <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-violet-500 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Total Amount</span>
            </div>
            <p className="text-xl font-bold text-violet-600">{stats.totalAmount.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">TK</span></p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="auto_verified">Auto Verified</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="bkash">bKash</SelectItem>
              <SelectItem value="nagad">Nagad</SelectItem>
              <SelectItem value="rocket">Rocket</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search TrxID, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-8 w-[200px] h-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleSearch} className="h-9">
            Search
          </Button>
          <span className="text-sm text-muted-foreground">{deposits.length} results</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={openSettings}
        >
          <Settings className="h-3.5 w-3.5" />
          Deposit Settings
        </Button>
      </div>

      {/* Deposits Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">User</TableHead>
                  <TableHead className="min-w-[80px]">Amount</TableHead>
                  <TableHead className="min-w-[80px]">Method</TableHead>
                  <TableHead className="min-w-[110px]">Sender Number</TableHead>
                  <TableHead className="min-w-[120px]">TrxID</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  {statusFilter === 'pending' && (
                    <TableHead className="min-w-[160px] text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(8)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : deposits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No deposits found
                    </TableCell>
                  </TableRow>
                ) : (
                  deposits.map((d) => (
                    <TableRow key={d.id} className={d.status === 'pending' ? 'bg-amber-50/30' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-violet-600">
                              {d.user.firstName[0]}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {d.user.firstName} {d.user.lastName || ''}
                              {d.user.isBlocked && (
                                <Badge variant="secondary" className="ml-1 text-[9px] bg-red-100 text-red-600 px-1 py-0 h-3.5">
                                  BLOCKED
                                </Badge>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{d.user.username || d.user.telegramId} &middot; Bal: {d.user.balance.toFixed(1)} TK
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-violet-600">
                        {d.amount.toFixed(1)} <span className="text-muted-foreground font-normal text-xs">TK</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize"
                          style={{
                            borderColor:
                              d.paymentMethod === 'bkash' ? '#E2136E'
                              : d.paymentMethod === 'nagad' ? '#F6921E'
                              : '#8C3494',
                            color:
                              d.paymentMethod === 'bkash' ? '#E2136E'
                              : d.paymentMethod === 'nagad' ? '#F6921E'
                              : '#8C3494',
                          }}
                        >
                          {d.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{d.senderNumber}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                          {d.transactionId}
                        </code>
                        {d.verificationMethod === 'auto' && (
                          <Badge className="ml-1 bg-emerald-100 text-emerald-700 text-[9px] px-1 py-0 h-4">
                            AUTO
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[d.status] || ''}>
                          {STATUS_LABELS[d.status] || d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(d.requestedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      {statusFilter === 'pending' && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => setActionDialog({ d, action: 'verify' })}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setActionDialog({ d, action: 'reject' })}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.action === 'verify'
                ? 'Verify Deposit'
                : actionDialog?.action === 'reject'
                  ? 'Reject Deposit'
                  : 'Expire Deposit'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === 'verify'
                ? `Verify ${actionDialog?.d.amount} TK deposit? Balance will be credited to the user.`
                : actionDialog?.action === 'reject'
                  ? `Reject ${actionDialog?.d.amount} TK deposit for ${actionDialog?.d.user.firstName}?`
                  : `Mark ${actionDialog?.d.amount} TK deposit as expired?`}
            </DialogDescription>
          </DialogHeader>
          {actionDialog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground">User</span>
                  <p className="font-semibold">
                    {actionDialog.d.user.firstName} {actionDialog.d.user.lastName || ''}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount</span>
                  <p className="font-semibold">{actionDialog.d.amount} TK</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Method</span>
                  <p className="font-semibold capitalize">{actionDialog.d.paymentMethod}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">TrxID</span>
                  <p className="font-mono text-xs">{actionDialog.d.transactionId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Sender Number</span>
                  <p className="font-mono">{actionDialog.d.senderNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">User Balance</span>
                  <p className="font-semibold">{actionDialog.d.user.balance.toFixed(1)} TK</p>
                </div>
              </div>
              {actionDialog.action === 'verify' && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-medium">
                    After verification: User balance will become{' '}
                    <strong>{(actionDialog.d.user.balance + actionDialog.d.amount).toFixed(1)} TK</strong>
                  </p>
                </div>
              )}
              <div>
                <Label>Admin Note</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={
                    actionDialog.action === 'verify'
                      ? 'Optional verification note'
                      : actionDialog.action === 'reject'
                        ? 'Reason for rejection'
                        : 'Reason for expiration'
                  }
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setNote('') }}>
              Cancel
            </Button>
            <Button
              variant={actionDialog?.action === 'verify' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading}
              className={actionDialog?.action === 'verify' ? 'bg-violet-600 hover:bg-violet-700' : ''}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : actionDialog?.action === 'verify' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {actionLoading
                ? 'Processing...'
                : actionDialog?.action === 'verify'
                  ? 'Verify & Credit'
                  : actionDialog?.action === 'reject'
                    ? 'Reject'
                    : 'Expire'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-violet-600" />
              Deposit Settings
            </DialogTitle>
            <DialogDescription>
              Configure payment methods, limits, and auto-verification rules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Payment Numbers */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Payment Numbers
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0 text-xs font-bold" style={{ backgroundColor: '#E2136E' }}>
                    bK
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">bKash Number</Label>
                    <Input
                      placeholder="01XXXXXXXXX"
                      value={settings.bkashNumber}
                      onChange={(e) => setSettings({ ...settings, bkashNumber: e.target.value })}
                      className="mt-0.5 font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0 text-xs font-bold" style={{ backgroundColor: '#F6921E' }}>
                    Na
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Nagad Number</Label>
                    <Input
                      placeholder="01XXXXXXXXX"
                      value={settings.nagadNumber}
                      onChange={(e) => setSettings({ ...settings, nagadNumber: e.target.value })}
                      className="mt-0.5 font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0 text-xs font-bold" style={{ backgroundColor: '#8C3494' }}>
                    RK
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Rocket Number</Label>
                    <Input
                      placeholder="01XXXXXXXXX"
                      value={settings.rocketNumber}
                      onChange={(e) => setSettings({ ...settings, rocketNumber: e.target.value })}
                      className="mt-0.5 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Limits */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Amount Limits
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Min Amount (TK)</Label>
                  <Input
                    type="number"
                    value={settings.minAmount}
                    onChange={(e) => setSettings({ ...settings, minAmount: e.target.value })}
                    className="mt-0.5"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Max Amount (TK)</Label>
                  <Input
                    type="number"
                    value={settings.maxAmount}
                    onChange={(e) => setSettings({ ...settings, maxAmount: e.target.value })}
                    className="mt-0.5"
                  />
                </div>
              </div>
            </div>

            {/* Auto Verification */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Auto Verification
              </p>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Enable Auto-Verify</p>
                  <p className="text-xs text-muted-foreground">
                    Deposits ≤500 TK are verified automatically
                  </p>
                </div>
                <Switch
                  checked={settings.autoVerify}
                  onCheckedChange={(checked) => setSettings({ ...settings, autoVerify: checked })}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Expiry Time (minutes)</Label>
                <div className="relative mt-0.5">
                  <Input
                    type="number"
                    value={settings.expireMinutes}
                    onChange={(e) => setSettings({ ...settings, expireMinutes: e.target.value })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    min
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pending deposits auto-expire after this time
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveSettings}
              disabled={savingSettings}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {savingSettings ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}