import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      orderBy: { key: 'asc' },
    })
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body // Array of { key: string, value: string }

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: 'settings must be an array' }, { status: 400 })
    }

    const results = await Promise.all(
      settings.map(({ key, value }: { key: string; value: string }) =>
        db.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    )

    return NextResponse.json({ settings: results })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}