import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const devices = await db.device.findMany({
      orderBy: { accountCount: 'desc' },
      include: {
        users: {
          select: {
            id: true,
            telegramId: true,
            firstName: true,
            lastName: true,
            username: true,
            isBlocked: true,
          },
        },
      },
    })

    return NextResponse.json({ devices })
  } catch (error) {
    console.error('Devices fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
  }
}
