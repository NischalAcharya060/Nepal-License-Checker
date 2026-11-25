// src/app/api/push/unsubscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { unsubscribePushSubscription } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required to unsubscribe' },
        { status: 400 }
      )
    }

    const { endpoint, licenseNumber } = body

    const result = await unsubscribePushSubscription({
      endpoint: String(endpoint),
      licenseNumber: licenseNumber ? String(licenseNumber) : null,
    })

    return NextResponse.json({
      status: 'success',
      message: 'Unsubscribed successfully',
      data: result,
    })
  } catch (error: unknown) {
    console.error('API Error in /api/push/unsubscribe:', error)
    const err = error as Error
    return NextResponse.json(
      { error: err?.message || 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
