// src/app/api/push/test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sendTestPush } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.subscription || !body.subscription.endpoint || !body.subscription.keys) {
      return NextResponse.json(
        { error: 'Valid subscription object is required' },
        { status: 400 }
      )
    }

    const { endpoint, keys } = body.subscription
    const result = await sendTestPush({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to dispatch test notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'success',
      message: 'Test notification sent successfully',
    })
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json(
      { error: err?.message || 'Failed to send test push' },
      { status: 500 }
    )
  }
}
