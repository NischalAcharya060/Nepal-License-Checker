// src/app/api/push/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { savePushSubscription, sendTestPush } from '@/lib/push'
import { RateLimiter } from '@/lib/rateLimit'
import { extractGeo } from '@/lib/geo'
import { sanitizeInput } from '@/utils/sanitize'
import { formatLicenseNumber } from '@/utils/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Allow up to 10 push subscriptions per 5 minutes per IP
const rateLimiter = new RateLimiter(10, 5 * 60 * 1000, 10 * 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    const geo = extractGeo(request)
    const rateStatus = rateLimiter.checkLimit(geo.ip)
    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: 'Too many push subscription requests. Please try again later.',
          retryAfter: rateStatus.retryAfter,
        },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON request payload' },
        { status: 400 }
      )
    }

    const { subscription, licenseNumber, sendWelcome = false } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid push subscription object. Required: endpoint, keys.p256dh, keys.auth' },
        { status: 400 }
      )
    }

    const endpoint = String(subscription.endpoint).trim()
    const p256dh = String(subscription.keys.p256dh || '').trim()
    const auth = String(subscription.keys.auth || '').trim()

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Incomplete push subscription keys' },
        { status: 400 }
      )
    }

    let cleanLicense: string | null = null
    if (licenseNumber && typeof licenseNumber === 'string') {
      const formatted = formatLicenseNumber(sanitizeInput(licenseNumber).toUpperCase())
      const licenseRegex = /^\d{2}-\d{2}-\d{8}$/
      if (licenseRegex.test(formatted)) {
        cleanLicense = formatted
      }
    }

    const userAgent = request.headers.get('user-agent') || ''

    const result = await savePushSubscription({
      endpoint,
      p256dh,
      auth,
      licenseNumber: cleanLicense,
      userAgent,
    })

    // Optionally dispatch an immediate welcome/test notification
    if (sendWelcome) {
      sendTestPush({ endpoint, p256dh, auth }).catch((err) => {
        console.error('Welcome push notification failed:', err)
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Push notification subscription saved successfully',
      data: result,
    })
  } catch (error: unknown) {
    console.error('API Error in /api/push/subscribe:', error)
    const err = error as Error
    return NextResponse.json(
      { error: err?.message || 'Failed to save push subscription' },
      { status: 500 }
    )
  }
}
