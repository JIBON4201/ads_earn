'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Check, X, User } from 'lucide-react'
import { toast } from 'sonner'

interface Withdrawal {
  id: string
  amount: number
  paymentMethod: string
  paymentNumber: string
  status: string
  adminNote: string | null
  requestedAt: string
  processedAt: string | null
  user: {
    id: string
    firstName: string
    lastName: string | null
    username: string | null
    telegramId: number
    balance: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  paid: 'bg-sky-100 text-sky-700',
}

export default function WithdrawalsPanel() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [actionDialog, setActionDialog] = useState<{ w: Withdrawal; action: 'approve' | 'reject' } | null>(null)
  const [note, setNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadWithdrawals = (status: string) => {
    setLoading(true)
    const params = new URLSearchParams({ status })
    fetch(`/api/admin/withdrawals?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setWithdrawals(data.withdrawals || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadWithdrawals(statusFilter)
  }, [statusFilter])

  const fetchWithdrawals = () => loadWithdrawals(statusFilter)

  const handleAction = async () => {
    if (!actionDialog) return
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdrawalId: actionDialog.w.id,
          action: actionDialog.action,
          adminNote: note || undefined,
        }),
      })
      if (res.ok) {
        toast.success(`Withdrawal ${actionDialog.action}d successfully`)
        setActionDialog(null)
        setNote('')
        fetchWithdrawals()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Action failed')
      }
    } catch {
      toast.error('Network error')
    }
    setActionLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{withdrawals.length} results</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">User</TableHead>
                  <TableHead className="min-w-[90px]">Amount</TableHead>
                  <TableHead className="min-w-[90px]">Method</TableHead>
                  <TableHead className="min-w-[130px]">Number</TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Date</TableHead>
                  {statusFilter === 'pending' && <TableHead className="min-w-[160px] text-right">Actions</TableHead>}
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
                ) : withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No withdrawals found
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{w.user.firstName} {w.user.lastName || ''}</p>
                            <p className="text-xs text-muted-foreground">
                              Balance: {w.user.balance.toFixed(1)} TK
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{w.amount.toFixed(1)} <span className="text-muted-foreground font-normal text-xs">TK</span></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{w.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{w.paymentNumber}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[w.status] || ''}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(w.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      {statusFilter === 'pending' && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => setActionDialog({ w, action: 'approve' })}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => setActionDialog({ w, action: 'reject' })}
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
              {actionDialog?.action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.action === 'approve'
                ? `Approve ${actionDialog?.w.amount} TK withdrawal for ${actionDialog?.w.user.firstName}? This will deduct from their balance.`
                : `Reject ${actionDialog?.w.amount} TK withdrawal for ${actionDialog?.w.user.firstName}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
              <div>
                <span className="text-muted-foreground">Amount</span>
                <p className="font-semibold">{actionDialog?.w.amount} TK</p>
              </div>
              <div>
                <span className="text-muted-foreground">Method</span>
                <p className="font-semibold capitalize">{actionDialog?.w.paymentMethod}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Number</span>
                <p className="font-mono">{actionDialog?.w.paymentNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">User Balance</span>
                <p className="font-semibold">{actionDialog?.w.user.balance.toFixed(1)} TK</p>
              </div>
            </div>
            <div>
              <Label>Admin Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={actionDialog?.action === 'approve' ? 'Optional approval note' : 'Reason for rejection'}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setNote('') }}>Cancel</Button>
            <Button
              variant={actionDialog?.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={actionLoading}
              className={actionDialog?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              {actionLoading ? 'Processing...' : actionDialog?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}