'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { ShieldAlert, Check, ShieldBan, User, AlertTriangle, Info } from 'lucide-react'
import { toast } from 'sonner'

interface FraudAlertItem {
  id: string
  type: string
  severity: string
  details: string
  isResolved: boolean
  createdAt: string
  userId: string | null
  telegramId: number | null
  user: {
    id: string
    firstName: string
    lastName: string | null
    username: string | null
    telegramId: number
  } | null
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-sky-100 text-sky-700 border-sky-200',
}

const SEVERITY_ICONS: Record<string, typeof AlertTriangle> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: Info,
  low: Info,
}

const TYPE_LABELS: Record<string, string> = {
  multi_account: 'Multi-Account',
  ip_abuse: 'IP Abuse',
  referral_abuse: 'Referral Abuse',
  rate_abuse: 'Rate Abuse',
  behavior_anomaly: 'Behavior Anomaly',
}

export default function FraudAlerts() {
  const [alerts, setAlerts] = useState<FraudAlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [resolvedFilter, setResolvedFilter] = useState('false')
  const [detailDialog, setDetailDialog] = useState<FraudAlertItem | null>(null)
  const [blockDialog, setBlockDialog] = useState<FraudAlertItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [unresolvedCount, setUnresolvedCount] = useState(0)

  const loadAlerts = (resolved: string) => {
    setLoading(true)
    const params = new URLSearchParams({ resolved })
    fetch(`/api/admin/fraud?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setAlerts(data.alerts || [])
        return fetch('/api/admin/fraud?resolved=false')
      })
      .then((r) => r.json())
      .then((data) => {
        setUnresolvedCount(data.alerts?.length || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAlerts(resolvedFilter)
  }, [resolvedFilter])

  const fetchAlerts = () => loadAlerts(resolvedFilter)

  const handleResolve = async (alertId: string) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/fraud', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, action: 'resolve' }),
      })
      if (res.ok) {
        toast.success('Alert resolved')
        fetchAlerts()
      }
    } catch {
      toast.error('Failed to resolve')
    }
    setActionLoading(false)
  }

  const handleBlockUser = async () => {
    if (!blockDialog) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/fraud', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: blockDialog.id, action: 'block_user' }),
      })
      if (res.ok) {
        toast.success('User blocked and alert resolved')
        setBlockDialog(null)
        fetchAlerts()
      }
    } catch {
      toast.error('Failed to block user')
    }
    setActionLoading(false)
  }

  const formatDetails = (details: string) => {
    try {
      const parsed = JSON.parse(details)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return details
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">Unresolved</SelectItem>
              <SelectItem value="true">Resolved</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{alerts.length} alerts</span>
        </div>
        {unresolvedCount > 0 && (
          <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">
            <ShieldAlert className="h-3 w-3 mr-1" />
            {unresolvedCount} unresolved
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">Severity</TableHead>
                  <TableHead className="min-w-[120px]">Type</TableHead>
                  <TableHead className="min-w-[180px]">User</TableHead>
                  <TableHead className="min-w-[200px]">Details</TableHead>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="min-w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : alerts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      No fraud alerts found
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.map((alert) => {
                    const SevIcon = SEVERITY_ICONS[alert.severity] || Info
                    return (
                      <TableRow key={alert.id} className={alert.isResolved ? 'opacity-60' : ''}>
                        <TableCell>
                          <Badge variant="outline" className={`border ${SEVERITY_COLORS[alert.severity] || ''}`}>
                            <SevIcon className="h-3 w-3 mr-1" />
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {TYPE_LABELS[alert.type] || alert.type}
                        </TableCell>
                        <TableCell>
                          {alert.user ? (
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                <User className="h-3.5 w-3.5 text-red-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{alert.user.firstName} {alert.user.lastName || ''}</p>
                                <p className="text-xs text-muted-foreground">ID: {alert.user.telegramId}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unknown (TG: {alert.telegramId || 'N/A'})</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-xs text-muted-foreground line-clamp-2">{alert.details}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={alert.isResolved ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}>
                            {alert.isResolved ? 'Resolved' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => setDetailDialog(alert)}
                            >
                              Details
                            </Button>
                            {!alert.isResolved && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-emerald-600"
                                  onClick={() => handleResolve(alert.id)}
                                  disabled={actionLoading}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Resolve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-red-600"
                                  onClick={() => setBlockDialog(alert)}
                                  disabled={actionLoading}
                                >
                                  <ShieldBan className="h-3.5 w-3.5 mr-1" />
                                  Block
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={(open) => !open && setDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Fraud Alert Details
              <Badge variant="outline" className={SEVERITY_COLORS[detailDialog?.severity || ''] || ''}>
                {detailDialog?.severity}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {TYPE_LABELS[detailDialog?.type || ''] || detailDialog?.type} — {new Date(detailDialog?.createdAt || '').toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {detailDialog?.user && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <span className="text-muted-foreground">User: </span>
                <span className="font-medium">{detailDialog.user.firstName} {detailDialog.user.lastName || ''}</span>
                {detailDialog.user.username && <span className="text-muted-foreground"> (@{detailDialog.user.username})</span>}
              </div>
            )}
            <div>
              <p className="text-sm font-medium mb-2">Full Details:</p>
              <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-auto max-h-64 whitespace-pre-wrap font-mono">
                {detailDialog ? formatDetails(detailDialog.details) : ''}
              </pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>Close</Button>
            {!detailDialog?.isResolved && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  if (detailDialog) handleResolve(detailDialog.id)
                  setDetailDialog(null)
                }}
              >
                Mark Resolved
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={!!blockDialog} onOpenChange={(open) => !open && setBlockDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block User</DialogTitle>
            <DialogDescription>
              This will block the user associated with this fraud alert and mark the alert as resolved. The user will lose access to the bot.
            </DialogDescription>
          </DialogHeader>
          {blockDialog?.user && (
            <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <p><span className="font-medium">User:</span> {blockDialog.user.firstName} {blockDialog.user.lastName || ''}</p>
              <p><span className="font-medium">Telegram ID:</span> {blockDialog.user.telegramId}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlockUser} disabled={actionLoading}>
              {actionLoading ? 'Blocking...' : 'Block User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}