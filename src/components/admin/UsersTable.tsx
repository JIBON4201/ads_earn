'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, ShieldBan, ShieldCheck, DollarSign, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { toast } from 'sonner'

interface UserRow {
  id: string
  telegramId: number
  username: string | null
  firstName: string
  lastName: string | null
  balance: number
  totalEarned: number
  vipLevel: number
  referralCode: string
  referralCount: number
  isBlocked: boolean
  blockReason: string | null
  createdAt: string
  _count: { referrals: number }
}

const VIP_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-emerald-100 text-emerald-700',
  2: 'bg-sky-100 text-sky-700',
  3: 'bg-purple-100 text-purple-700',
  4: 'bg-amber-100 text-amber-700',
}

const VIP_NAMES: Record<number, string> = {
  0: 'Free',
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
  4: 'Platinum',
}

export default function UsersTable() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [vipFilter, setVipFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const pageSize = 10

  // Dialogs
  const [balanceDialog, setBalanceDialog] = useState<UserRow | null>(null)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceDesc, setBalanceDesc] = useState('')
  const [blockDialog, setBlockDialog] = useState<{ user: UserRow; action: 'block' | 'unblock' } | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadUsers = (currentPage: number, currentSearch: string, currentVip: string, currentStatus: string) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: currentPage.toString(),
      pageSize: pageSize.toString(),
      search: currentSearch,
      vipLevel: currentVip,
      status: currentStatus,
    })
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || [])
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers(page, search, vipFilter, statusFilter)
  }, [page, search, vipFilter, statusFilter])

  const fetchUsers = () => loadUsers(page, search, vipFilter, statusFilter)

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const handleAction = async (userId: string, action: string, data?: Record<string, string>) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, data }),
      })
      if (res.ok) {
        toast.success(`User ${action} successful`)
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Action failed')
      }
    } catch {
      toast.error('Network error')
    }
    setActionLoading(false)
  }

  const handleBalanceAdjust = () => {
    if (!balanceDialog || !balanceAmount) return
    handleAction(balanceDialog.id, 'adjust_balance', {
      amount: balanceAmount,
      description: balanceDesc || undefined,
    })
    setBalanceDialog(null)
    setBalanceAmount('')
    setBalanceDesc('')
  }

  const handleBlock = () => {
    if (!blockDialog) return
    handleAction(blockDialog.user.id, blockDialog.action, {
      reason: blockReason || undefined,
    })
    setBlockDialog(null)
    setBlockReason('')
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username, or Telegram ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary">Search</Button>
            </div>
            <Select value={vipFilter} onValueChange={(v) => { setVipFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="VIP Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All VIP</SelectItem>
                <SelectItem value="0">Free</SelectItem>
                <SelectItem value="1">Bronze</SelectItem>
                <SelectItem value="2">Silver</SelectItem>
                <SelectItem value="3">Gold</SelectItem>
                <SelectItem value="4">Platinum</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">User</TableHead>
                  <TableHead className="min-w-[100px]">Telegram ID</TableHead>
                  <TableHead className="min-w-[90px]">Balance</TableHead>
                  <TableHead className="min-w-[90px]">VIP Level</TableHead>
                  <TableHead className="min-w-[80px]">Referrals</TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="min-w-[100px]">Joined</TableHead>
                  <TableHead className="min-w-[150px] text-right">Actions</TableHead>
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
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{user.firstName} {user.lastName || ''}</p>
                            {user.username && (
                              <p className="text-xs text-muted-foreground">@{user.username}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{user.telegramId}</TableCell>
                      <TableCell className="font-semibold text-sm">{user.balance.toFixed(1)} <span className="text-muted-foreground font-normal">TK</span></TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={VIP_COLORS[user.vipLevel] || VIP_COLORS[0]}>
                          {VIP_NAMES[user.vipLevel] || `L${user.vipLevel}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{user._count.referrals}</TableCell>
                      <TableCell>
                        <Badge variant={user.isBlocked ? 'destructive' : 'default'} className={
                          user.isBlocked ? '' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        }>
                          {user.isBlocked ? 'Blocked' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => setBalanceDialog(user)}
                          >
                            <DollarSign className="h-3.5 w-3.5 mr-1" />
                            Balance
                          </Button>
                          {user.isBlocked ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-emerald-600 hover:text-emerald-700"
                              onClick={() => setBlockDialog({ user, action: 'unblock' })}
                            >
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                              Unblock
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-red-600 hover:text-red-700"
                              onClick={() => setBlockDialog({ user, action: 'block' })}
                            >
                              <ShieldBan className="h-3.5 w-3.5 mr-1" />
                              Block
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && users.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">{page} / {totalPages}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Adjust Dialog */}
      <Dialog open={!!balanceDialog} onOpenChange={(open) => !open && setBalanceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance</DialogTitle>
            <DialogDescription>
              Adjust balance for {balanceDialog?.firstName} {balanceDialog?.lastName || ''} (Current: {balanceDialog?.balance?.toFixed(1)} TK)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (use negative to deduct)</Label>
              <Input
                type="number"
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="e.g. 50 or -20"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={balanceDesc}
                onChange={(e) => setBalanceDesc(e.target.value)}
                placeholder="Reason for adjustment"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialog(null)}>Cancel</Button>
            <Button onClick={handleBalanceAdjust} disabled={actionLoading || !balanceAmount}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block/Unblock Dialog */}
      <Dialog open={!!blockDialog} onOpenChange={(open) => !open && setBlockDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{blockDialog?.action === 'block' ? 'Block User' : 'Unblock User'}</DialogTitle>
            <DialogDescription>
              {blockDialog?.action === 'block'
                ? `Are you sure you want to block ${blockDialog?.user.firstName}? They will not be able to use the bot.`
                : `Unblock ${blockDialog?.user.firstName}? They will regain access to the bot.`}
            </DialogDescription>
          </DialogHeader>
          {blockDialog?.action === 'block' && (
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Reason for blocking"
                rows={2}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(null)}>Cancel</Button>
            <Button
              variant={blockDialog?.action === 'block' ? 'destructive' : 'default'}
              onClick={handleBlock}
              disabled={actionLoading}
            >
              {blockDialog?.action === 'block' ? 'Block User' : 'Unblock User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}