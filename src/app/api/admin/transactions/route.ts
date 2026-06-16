import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const type = searchParams.get('type') || ''

    const where: Record<string, unknown> = {}
    if (type) {
      where.type = type
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, username: true, telegramId: true },
          },
        },
      }),
      db.transaction.count({ where }),
    ])

    return NextResponse.json({ transactions, total, page, pageSize })
  } catch (error) {
    console.error('Transactions fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
