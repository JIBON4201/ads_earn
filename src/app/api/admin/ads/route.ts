import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const ads = await db.ad.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ ads })
  } catch (error) {
    console.error('Ads fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, url, rewardPoints, requiredSeconds, dailyLimit, totalBudget, adType, priority } = body

    if (!title || !url || rewardPoints === undefined) {
      return NextResponse.json({ error: 'title, url, and rewardPoints are required' }, { status: 400 })
    }

    const ad = await db.ad.create({
      data: {
        title,
        description: description || null,
        url,
        rewardPoints: parseFloat(rewardPoints),
        requiredSeconds: parseInt(requiredSeconds) || 30,
        dailyLimit: parseInt(dailyLimit) || 5,
        totalBudget: totalBudget ? parseFloat(totalBudget) : null,
        adType: adType || 'cpm',
        priority: parseInt(priority) || 0,
        isActive: true,
      },
    })

    return NextResponse.json({ ad }, { status: 201 })
  } catch (error) {
    console.error('Ad create error:', error)
    return NextResponse.json({ error: 'Failed to create ad' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.url !== undefined) updateData.url = data.url
    if (data.rewardPoints !== undefined) updateData.rewardPoints = parseFloat(data.rewardPoints)
    if (data.requiredSeconds !== undefined) updateData.requiredSeconds = parseInt(data.requiredSeconds)
    if (data.dailyLimit !== undefined) updateData.dailyLimit = parseInt(data.dailyLimit)
    if (data.totalBudget !== undefined) updateData.totalBudget = data.totalBudget ? parseFloat(data.totalBudget) : null
    if (data.adType !== undefined) updateData.adType = data.adType
    if (data.priority !== undefined) updateData.priority = parseInt(data.priority)
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const ad = await db.ad.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ ad })
  } catch (error) {
    console.error('Ad update error:', error)
    return NextResponse.json({ error: 'Failed to update ad' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await db.userAdWatch.deleteMany({ where: { adId: id } })
    await db.ad.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Ad delete error:', error)
    return NextResponse.json({ error: 'Failed to delete ad' }, { status: 500 })
  }
}