'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

interface VipTier {
  id: string
  level: number
  name: string
  price: number
  dailyAdLimit: number
  rewardBoost: number
  description: string | null
  minWithdrawal: number
  maxWithdrawals: number
  isActive: boolean
}

const TIER_COLORS: Record<number, { border: string; bg: string; text: string; accent: string }> = {
  0: { border: 'border-gray-200', bg: 'bg-gray-50', text: 'text-gray-700', accent: 'bg-gray-400' },
  1: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', accent: 'bg-emerald-500' },
  2: { border: 'border-sky-200', bg: 'bg-sky-50', text: 'text-sky-700', accent: 'bg-sky-500' },
  3: { border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-700', accent: 'bg-purple-500' },
  4: { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-700', accent: 'bg-amber-500' },
}

export default function VipTiersPanel() {
  const [tiers, setTiers] = useState<VipTier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [edited, setEdited] = useState<Record<string, Partial<VipTier>>>({})

  const loadTiers = () => {
    setLoading(true)
    fetch('/api/admin/vip-tiers')
      .then((r) => r.json())
      .then((data) => {
        setTiers(data.tiers || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTiers()
  }, [])

  const fetchTiers = loadTiers

  const updateField = (id: string, field: string, value: string | number | boolean) => {
    setEdited((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const getField = (tier: VipTier, field: keyof VipTier) => {
    const override = edited[tier.id]
    if (override && field in override) {
      return override[field]
    }
    return tier[field]
  }

  const handleSave = async () => {
    setSaving(true)
    const updatedTiers = tiers.map((t) => ({
      ...t,
      ...(edited[t.id] || {}),
    }))

    try {
      const res = await fetch('/api/admin/vip-tiers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiers: updatedTiers }),
      })
      if (res.ok) {
        toast.success('VIP tiers updated successfully')
        setEdited({})
        fetchTiers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to save')
      }
    } catch {
      toast.error('Network error')
    }
    setSaving(false)
  }

  const hasChanges = Object.keys(edited).length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Configure VIP tier benefits and pricing</p>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => {
            const colors = TIER_COLORS[tier.level] || TIER_COLORS[0]
            const isEdited = !!edited[tier.id]
            return (
              <Card key={tier.id} className={`border-2 ${isEdited ? 'border-emerald-300' : colors.border} transition-colors`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`${colors.accent} h-2 w-2 rounded-full`} />
                      <CardTitle className="text-base">{tier.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Level {tier.level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Price (TK)</Label>
                      <Input
                        type="number"
                        value={getField(tier, 'price') as number}
                        onChange={(e) => updateField(tier.id, 'price', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Daily Ad Limit</Label>
                      <Input
                        type="number"
                        value={getField(tier, 'dailyAdLimit') as number}
                        onChange={(e) => updateField(tier.id, 'dailyAdLimit', parseInt(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">Reward Boost (%)</Label>
                      <Input
                        type="number"
                        value={getField(tier, 'rewardBoost') as number}
                        onChange={(e) => updateField(tier.id, 'rewardBoost', parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground">Min. Withdraw (TK)</Label>
                        <Input
                          type="number"
                          value={getField(tier, 'minWithdrawal') as number}
                          onChange={(e) => updateField(tier.id, 'minWithdrawal', parseFloat(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs text-muted-foreground">Max Withdrawals</Label>
                        <Input
                          type="number"
                          value={getField(tier, 'maxWithdrawals') as number}
                          onChange={(e) => updateField(tier.id, 'maxWithdrawals', parseInt(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Label className="text-xs text-muted-foreground">Active</Label>
                    <Switch
                      checked={getField(tier, 'isActive') as boolean}
                      onCheckedChange={(v) => updateField(tier.id, 'isActive', v)}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}