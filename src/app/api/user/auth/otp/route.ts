// src/app/api/user/auth/otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requestOtp } from '@/lib/userAuth'
import { extractGeo } from '@/lib/geo'
import { RateLimiter } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const otpRequestLimiter = new RateLimiter(5, 60000, 300000) // 5 requests per minute per IP

export async function POST(request: NextRequest) {
    try {
        const geo = extractGeo(request)
        const ip = geo.ip
        const rateStatus = otpRequestLimiter.checkLimit(ip)

        if (!rateStatus.allowed) {
            return NextResponse.json(
                { error: 'Too many OTP requests. Please wait a few minutes before trying again.' },
                { status: 429 }
            )
        }

        const body = await request.json().catch(() => ({}))
        const email = String(body.email || '').trim()

        if (!email) {
            return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })
        }

        const result = await requestOtp(email)

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to send OTP code.' },
                { status: result.retryAfter ? 429 : 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'A 6-digit verification code has been sent to your email.',
        })
    } catch (err: unknown) {
        console.error('[API user/auth/otp] Error:', err)
        return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
    }
}
