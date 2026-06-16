'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Pencil, Trash2, Megaphone, BarChart3, Target, Star } from 'lucide-react'
import { toast } from 'sonner'

interface Ad {
  id: string
  title: string
  description: string | null
  url: string
  rewardPoints: number
  requiredSeconds: number
  dailyLimit: number
  totalBudget: number | null
  totalSpent: number
  clickCount: number
  isActive: boolean
  adType: string
  priority: number
  createdAt: string
}

const emptyAd = {
  title: '',
  description: '',
  url: '',
  rewardPoints: '1',
  requiredSeconds: '30',
  dailyLimit: '5',
  totalBudget: '',
  adType: 'cpm',
  priority: '0',
}

export default function AdsManager() {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAd, setEditingAd] = useState<Ad | null>(null)
  const [form, setForm] = useState(emptyAd)
  const [saving, setSaving] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)

  const loadAds = () => {
    setLoading(true)
    fetch('/api/admin/ads')
      .then((r) => r.json())
      .then((data) => {
        setAds(data.ads || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAds()
  }, [])

  const fetchAds = loadAds

  const openCreate = () => {
    setEditingAd(null)
    setForm(emptyAd)
    setDialogOpen(true)
  }

  const openEdit = (ad: Ad) => {
    setEditingAd(ad)
    setForm({
      title: ad.title,
      description: ad.description || '',
      url: ad.url,
      rewardPoints: ad.rewardPoints.toString(),
      requiredSeconds: ad.requiredSeconds.toString(),
      dailyLimit: ad.dailyLimit.toString(),
      totalBudget: ad.totalBudget?.toString() || '',
      adType: ad.adType,
      priority: ad.priority.toString(),
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.url || !form.rewardPoints) {
      toast.error('Title, URL, and reward points are required')
      return
    }
    setSaving(true)
    try {
      const isEdit = !!editingAd
      const res = await fetch('/api/admin/ads', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(isEdit ? { id: editingAd.id } : {}), ...form }),
      })
      if (res.ok) {
        toast.success(`Ad ${isEdit ? 'updated' : 'created'} successfully`)
        setDialogOpen(false)
        fetchAds()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to save ad')
      }
    } catch {
      toast.error('Network error')
    }
    setSaving(false)
  }

  const handleToggle = async (ad: Ad) => {
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ad.id, isActive: !ad.isActive }),
      })
      if (res.ok) {
        toast.success(`Ad ${ad.isActive ? 'deactivated' : 'activated'}`)
        fetchAds()
      }
    } catch {
      toast.error('Failed to toggle ad')
    }
  }

  const handleDelete = async () => {
    if (!deleteDialog) return
    try {
      const res = await fetch(`/api/admin/ads?id=${deleteDialog}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Ad deleted')
        fetchAds()
      }
    } catch {
      toast.error('Failed to delete ad')
    }
    setDeleteDialog(null)
  }

  const typeIcons: Record<string, typeof Megaphone> = {
    cpm: BarChart3,
    cpa: Target,
    sponsored: Star,
  }

  const typeColors: Record<string, string> = {
    cpm: 'bg-emerald-100 text-emerald-700',
    cpa: 'bg-amber-100 text-amber-700',
    sponsored: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{ads.length} total ads</h3>
        <Button onClick={openCreate} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1.5" />
          New Ad
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : ads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No ads yet. Create your first ad to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => {
            const TypeIcon = typeIcons[ad.adType] || Megaphone
            return (
              <Card key={ad.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${typeColors[ad.adType] || 'bg-gray-100 text-gray-700'}`}>
                        <TypeIcon className="h-3.5 w-3.5" />
                      </div>
                      <Badge variant="secondary" className={typeColors[ad.adType] || ''}>
                        {ad.adType.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(ad)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600 hover:text-red-700"
                        onClick={() => setDeleteDialog(ad.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <h4 className="font-semibold text-sm mb-1 line-clamp-1">{ad.title}</h4>
                  {ad.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{ad.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-muted-foreground">Reward</span>
                      <p className="font-semibold text-emerald-600">{ad.rewardPoints} pts</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration</span>
                      <p className="font-semibold">{ad.requiredSeconds}s</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Daily Limit</span>
                      <p className="font-semibold">{ad.dailyLimit}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Clicks</span>
                      <p className="font-semibold">{ad.clickCount}</p>
                    </div>
                  </div>

                  {ad.totalBudget && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Budget Used</span>
                        <span>{ad.totalSpent.toFixed(1)} / {ad.totalBudget.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (ad.totalSpent / ad.totalBudget) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className={`text-xs font-medium ${ad.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {ad.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={ad.isActive}
                      onCheckedChange={() => handleToggle(ad)}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAd ? 'Edit Ad' : 'Create New Ad'}</DialogTitle>
            <DialogDescription>
              {editingAd ? 'Update the ad details below.' : 'Fill in the details to create a new ad.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ad title" />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description" rows={2} />
            </div>
            <div className="grid gap-2">
              <Label>URL *</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Reward Points *</Label>
                <Input type="number" value={form.rewardPoints} onChange={(e) => setForm({ ...form, rewardPoints: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Duration (sec)</Label>
                <Input type="number" value={form.requiredSeconds} onChange={(e) => setForm({ ...form, requiredSeconds: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Daily Limit</Label>
                <Input type="number" value={form.dailyLimit} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Total Budget</Label>
                <Input type="number" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Ad Type</Label>
                <Select value={form.adType} onValueChange={(v) => setForm({ ...form, adType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpm">CPM</SelectItem>
                    <SelectItem value="cpa">CPA</SelectItem>
                    <SelectItem value="sponsored">Sponsored</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Priority</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Saving...' : editingAd ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this ad and all associated watch records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}