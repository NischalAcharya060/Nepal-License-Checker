// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createNotification } from '@/lib/notifications'
import { RateLimiter } from '@/lib/rateLimit'
import { extractGeo } from '@/lib/geo'
import { sanitizeInput } from '@/utils/sanitize'
import { formatLicenseNumber } from '@/utils/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Allow up to 8 notification registrations per 5 minutes per IP
const rateLimiter = new RateLimiter(8, 5 * 60 * 1000, 10 * 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    const geo = extractGeo(request)
    const rateStatus = rateLimiter.checkLimit(geo.ip)
    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: 'Too many notification requests. Please wait a few minutes before trying again.',
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

    let { licenseNumber, email } = body
    if (!licenseNumber || typeof licenseNumber !== 'string') {
      return NextResponse.json(
        { error: 'License number is required' },
        { status: 400 }
      )
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    licenseNumber = formatLicenseNumber(sanitizeInput(licenseNumber).toUpperCase())
    email = email.trim().toLowerCase()

    const licenseRegex = /^\d{2}-\d{2}-\d{8}$/
    if (!licenseRegex.test(licenseNumber)) {
      return NextResponse.json(
        { error: 'Invalid license number format. Expected XX-XX-XXXXXXXX' },
        { status: 400 }
      )
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      )
    }

    const result = await createNotification({ licenseNumber, email })

    if (result.status === 'already_printed') {
      return NextResponse.json({
        status: 'already_printed',
        message: result.message,
        data: result.license,
      })
    }

    if (result.status === 'already_subscribed') {
      return NextResponse.json({
        status: 'already_subscribed',
        message: result.message,
        unsubscribeToken: result.unsubscribeToken,
      })
    }

    return NextResponse.json({
      status: 'success',
      message: result.message,
      data: {
        id: result.id,
        licenseNumber: result.licenseNumber,
        email: result.email,
        unsubscribeToken: result.unsubscribeToken,
      },
    })
  } catch (error: unknown) {
    console.error('API Error in /api/notifications:', error)
    const err = error as Error
    return NextResponse.json(
      { error: err?.message || 'Failed to process notification request' },
      { status: 500 }
    )
  }
}
