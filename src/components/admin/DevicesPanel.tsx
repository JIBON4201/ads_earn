'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Fingerprint, Users, AlertTriangle, ShieldAlert, Search } from 'lucide-react'
import { toast } from 'sonner'

interface DeviceUser {
  id: string
  telegramId: number
  firstName: string
  lastName: string | null
  username: string | null
}

interface DeviceRecord {
  id: string
  deviceHash: string
  accountCount: number
  users: DeviceUser[]
  createdAt: string
}

function truncateHash(hash: string, head = 12, tail = 8): string {
  if (hash.length <= head + tail + 3) return hash
  return `${hash.slice(0, head)}...${hash.slice(-tail)}`
}

function getAccountCountColor(count: number): string {
  if (count >= 3) return 'bg-red-100 text-red-700 border-red-200'
  if (count === 2) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Device Hash</TableHead>
              <TableHead className="min-w-[100px]">Accounts</TableHead>
              <TableHead className="min-w-[240px]">Users</TableHead>
              <TableHead className="min-w-[120px]">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(6)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-5 w-36 font-mono" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-12 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default function DevicesPanel() {
  const [devices, setDevices] = useState<DeviceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchDevices = () => {
    setLoading(true)
    fetch('/api/admin/devices')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch devices')
        return res.json()
      })
      .then((data) => {
        setDevices(data.devices || [])
        setLoading(false)
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load device data')
        setLoading(false)
      })
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDevices()
  }, [])

  const filteredDevices = useMemo(() => {
    if (!searchQuery.trim()) return devices
    const q = searchQuery.toLowerCase().trim()
    return devices.filter((d) => d.deviceHash.toLowerCase().includes(q))
  }, [devices, searchQuery])

  const suspiciousCount = useMemo(
    () => devices.filter((d) => d.accountCount >= 2).length,
    [devices]
  )

  return (
    <div className="space-y-4">
      {/* Header with search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search device hash..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[220px] sm:w-[260px] h-9"
            />
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
          </span>
        </div>

        {suspiciousCount > 0 && (
          <Badge
            variant="destructive"
            className="bg-red-100 text-red-700 hover:bg-red-100 border border-red-200"
          >
            <ShieldAlert className="h-3 w-3 mr-1" />
            {suspiciousCount} suspicious
          </Badge>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                        Device Hash
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[100px]">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        Accounts
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[260px]">Users</TableHead>
                    <TableHead className="min-w-[120px]">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        <Fingerprint className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        {searchQuery.trim()
                          ? 'No devices match your search'
                          : 'No device data found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDevices.map((device) => (
                      <TableRow
                        key={device.id}
                        className={
                          device.accountCount >= 2
                            ? 'bg-red-50/50 hover:bg-red-50/80 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                            : undefined
                        }
                      >
                        {/* Device Hash */}
                        <TableCell>
                          <span
                            className="font-mono text-xs select-all"
                            title={device.deviceHash}
                          >
                            {truncateHash(device.deviceHash)}
                          </span>
                        </TableCell>

                        {/* Account Count */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={getAccountCountColor(device.accountCount)}
                            >
                              {device.accountCount}
                            </Badge>
                            {device.accountCount >= 2 && (
                              <Badge
                                variant="outline"
                                className="bg-red-100 text-red-700 border-red-200"
                              >
                                <AlertTriangle className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Users */}
                        <TableCell className="whitespace-normal">
                          <div className="space-y-1.5">
                            {device.users.map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {user.firstName}
                                    {user.lastName ? ` ${user.lastName}` : ''}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    TG:{user.telegramId}
                                    {user.username ? (
                                      <>
                                        {' '}·{' '}
                                        <span className="font-mono">
                                          @{user.username}
                                        </span>
                                      </>
                                    ) : null}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>

                        {/* Created */}
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(device.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}