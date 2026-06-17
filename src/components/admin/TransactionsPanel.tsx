'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  Crown,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

interface Transaction {
  id: string
  type: 'ad_reward' | 'referral_bonus' | 'withdrawal' | 'vip_purchase' | 'admin_adjust'
  amount: number
  balanceAfter: number
  description: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string | null
    username: string | null
  }
}

const TYPE_COLORS: Record<string, string> = {
  ad_reward: 'bg-emerald-100 text-emerald-700',
  referral_bonus: 'bg-sky-100 text-sky-700',
  withdrawal: 'bg-red-100 text-red-700',
  vip_purchase: 'bg-purple-100 text-purple-700',
  admin_adjust: 'bg-amber-100 text-amber-700',
}

const TYPE_LABELS: Record<string, string> = {
  ad_reward: 'Ad Reward',
  referral_bonus: 'Referral Bonus',
  withdrawal: 'Withdrawal',
  vip_purchase: 'VIP Purchase',
  admin_adjust: 'Admin Adjust',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ad_reward: <ArrowUpRight className="h-3.5 w-3.5" />,
  referral_bonus: <Repeat className="h-3.5 w-3.5" />,
  withdrawal: <ArrowDownRight className="h-3.5 w-3.5" />,
  vip_purchase: <Crown className="h-3.5 w-3.5" />,
  admin_adjust: <Settings className="h-3.5 w-3.5" />,
}

export default function TransactionsPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const pageSize = 10

  const loadTransactions = (currentPage: number, currentType: string) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: currentPage.toString(),
      pageSize: pageSize.toString(),
    })
    if (currentType !== 'all') {
      params.set('type', currentType)
    }
    fetch(`/api/admin/transactions?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch')
        return r.json()
      })
      .then((data) => {
        setTransactions(data.transactions || [])
        setTotal(data.total || 0)
        setLoading(false)
      })
      .catch(() => {
        toast.error('Failed to load transactions')
        setLoading(false)
      })
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTransactions(page, typeFilter)
  }, [page, typeFilter])

  const handleTypeChange = (value: string) => {
    setTypeFilter(value)
    setPage(1)
  }

  const totalPages = Math.ceil(total / pageSize)
  const isPositive = (type: string) => type !== 'withdrawal' && type !== 'vip_purchase'

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Transaction type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ad_reward">Ad Reward</SelectItem>
                  <SelectItem value="referral_bonus">Referral Bonus</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="vip_purchase">VIP Purchase</SelectItem>
                  <SelectItem value="admin_adjust">Admin Adjust</SelectItem>
                </SelectContent>
              </Select>
              {!loading && (
                <span className="text-sm text-muted-foreground">
                  {total} transaction{total !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadTransactions(page, typeFilter)}
              disabled={loading}
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-0 pt-4 px-4">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Transaction History</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Date</TableHead>
                  <TableHead className="min-w-[180px]">User</TableHead>
                  <TableHead className="min-w-[140px]">Type</TableHead>
                  <TableHead className="min-w-[110px]">Amount</TableHead>
                  <TableHead className="min-w-[110px]">Balance After</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        <br />
                        <span className="text-xs">
                          {new Date(tx.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {tx.user.firstName} {tx.user.lastName || ''}
                            </p>
                            {tx.user.username && (
                              <p className="text-xs text-muted-foreground">@{tx.user.username}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={TYPE_COLORS[tx.type] || ''}
                        >
                          <span className="flex items-center gap-1.5">
                            {TYPE_ICONS[tx.type]}
                            {TYPE_LABELS[tx.type] || tx.type}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`font-semibold text-sm whitespace-nowrap ${
                          isPositive(tx.type)
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {isPositive(tx.type) ? '+' : '-'}
                        {Math.abs(tx.amount).toFixed(1)}{' '}
                        <span className="text-muted-foreground font-normal text-xs">TK</span>
                      </TableCell>
                      <TableCell className="text-sm font-medium whitespace-nowrap">
                        {tx.balanceAfter.toFixed(1)}{' '}
                        <span className="text-muted-foreground font-normal text-xs">TK</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                        {tx.description || '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && transactions.length > 0 && (
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
                <span className="text-sm font-medium">{page} / {totalPages || 1}</span>
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
    </div>
  )
}