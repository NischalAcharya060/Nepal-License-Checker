// src/app/api/notifications/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cancelNotification } from '@/lib/notifications'
import { sanitizeInput } from '@/utils/sanitize'
import { formatLicenseNumber } from '@/utils/validation'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      )
    }

    const result = await cancelNotification({ token })
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error in GET /api/notifications/cancel:', error)
    const err = error as Error
    return NextResponse.json(
      { error: err?.message || 'Failed to cancel notification' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON request payload' },
        { status: 400 }
      )
    }

    const { token, licenseNumber, email } = body

    if (token && typeof token === 'string') {
      const result = await cancelNotification({ token: token.trim() })
      return NextResponse.json(result)
    }

    if (licenseNumber && email) {
      const cleanLicense = formatLicenseNumber(sanitizeInput(licenseNumber).toUpperCase())
      const cleanEmail = String(email).trim().toLowerCase()

      const result = await cancelNotification({
        licenseNumber: cleanLicense,
        email: cleanEmail,
      })
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Either token or both licenseNumber and email are required.' },
      { status: 400 }
    )
  } catch (error: unknown) {
    console.error('Error in POST /api/notifications/cancel:', error)
    const err = error as Error
    return NextResponse.json(
      { error: err?.message || 'Failed to cancel notification' },
      { status: 500 }
    )
  }
}
