'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Settings, Save } from 'lucide-react'
import { toast } from 'sonner'

interface Setting {
  id: string
  key: string
  value: string
}

const CATEGORY_MAP: Record<string, string[]> = {
  'General': ['platform_name', 'bot_token', 'admin_telegram_ids', 'support_channel'],
  'Anti-Fraud': ['max_accounts_per_device', 'ad_watch_cooldown_seconds', 'rate_limit_window_seconds', 'rate_limit_max_actions'],
  'Earnings': ['referral_bonus', 'default_ad_reward'],
  'Withdrawals': ['min_withdrawal', 'withdrawal_auto_approve'],
}

const FRIENDLY_NAMES: Record<string, string> = {
  platform_name: 'Platform Name',
  bot_token: 'Bot Token',
  admin_telegram_ids: 'Admin Telegram IDs',
  support_channel: 'Support Channel',
  max_accounts_per_device: 'Max Accounts/Device',
  ad_watch_cooldown_seconds: 'Ad Watch Cooldown (s)',
  rate_limit_window_seconds: 'Rate Limit Window (s)',
  rate_limit_max_actions: 'Rate Limit Max Actions',
  referral_bonus: 'Referral Bonus (pts)',
  default_ad_reward: 'Default Ad Reward (pts)',
  min_withdrawal: 'Min Withdrawal (TK)',
  withdrawal_auto_approve: 'Auto-Approve Withdrawals',
  fraud_alert_webhook: 'Fraud Alert Webhook',
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [edits, setEdits] = useState<Record<string, string>>({})

  const loadSettings = () => {
    setLoading(true)
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data.settings || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings()
  }, [])

  const fetchSettings = loadSettings

  const getValue = (key: string) => {
    if (key in edits) return edits[key]
    return settings.find((s) => s.key === key)?.value || ''
  }

  const handleChange = (key: string, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: value }))
  }

  const hasChanges = Object.keys(edits).length > 0

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = Object.entries(edits).map(([key, value]) => ({ key, value }))
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      })
      if (res.ok) {
        toast.success('Settings saved successfully')
        setEdits({})
        fetchSettings()
      } else {
        toast.error('Failed to save settings')
      }
    } catch {
      toast.error('Network error')
    }
    setSaving(false)
  }

  // Group settings by category
  const getGroupedSettings = (): { category: string; items: Setting[] }[] => {
    const grouped: { category: string; items: Setting[] }[] = []
    const assigned = new Set<string>()

    for (const [category, keys] of Object.entries(CATEGORY_MAP)) {
      const items = settings.filter((s) => keys.includes(s.key))
      if (items.length > 0) {
        grouped.push({ category, items })
        items.forEach((s) => assigned.add(s.key))
      }
    }

    // Unassigned settings
    const unassigned = settings.filter((s) => !assigned.has(s.key))
    if (unassigned.length > 0) {
      grouped.push({ category: 'Other', items: unassigned })
    }

    return grouped
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const grouped = getGroupedSettings()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage system configuration and thresholds</p>
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      {grouped.map((group, idx) => (
        <div key={group.category}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{group.category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.items.map((setting) => (
                  <div key={setting.key} className="grid gap-1.5">
                    <Label className="text-sm">
                      {FRIENDLY_NAMES[setting.key] || setting.key}
                    </Label>
                    <Input
                      value={getValue(setting.key)}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                      className={`h-9 ${setting.key in edits ? 'border-emerald-300 bg-emerald-50/50' : ''}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {idx < grouped.length - 1 && <Separator className="my-4" />}
        </div>
      ))}

      {settings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No settings configured yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}