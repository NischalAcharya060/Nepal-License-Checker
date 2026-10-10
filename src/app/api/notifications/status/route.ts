// src/app/api/notifications/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getNotificationByToken, maskEmail } from '@/lib/notifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const record = await getNotificationByToken(token)
    if (!record) {
      return NextResponse.json(
        { error: 'Notification subscription not found or link has expired.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      status: 'success',
      data: {
        licenseNumber: record.license_number,
        maskedEmail: maskEmail(record.email),
        subscriptionStatus: record.status,
        createdAt: record.created_at,
        sentAt: record.sent_at || null,
        cancelledAt: record.cancelled_at || null,
      },
    })
  } catch (error: unknown) {
    console.error('Error in /api/notifications/status:', error)
    const err = error as Error
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch notification status' },
      { status: 500 }
    )
  }
}
