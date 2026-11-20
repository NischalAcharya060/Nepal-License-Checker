// src/app/api/user/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp, USER_SESSION_COOKIE, USER_SESSION_TTL_MS } from '@/lib/userAuth'
import { extractGeo } from '@/lib/geo'
import { RateLimiter } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const verifyLimiter = new RateLimiter(10, 60000, 300000)

export async function POST(request: NextRequest) {
    try {
        const geo = extractGeo(request)
        const ip = geo.ip
        const rateStatus = verifyLimiter.checkLimit(ip)

        if (!rateStatus.allowed) {
            return NextResponse.json(
                { error: 'Too many verification attempts. Please wait a few minutes before trying again.' },
                { status: 429 }
            )
        }

        const body = await request.json().catch(() => ({}))
        const email = String(body.email || '').trim()
        const otp = String(body.otp || '').trim()

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and 6-digit code are required.' }, { status: 400 })
        }

        const result = await verifyOtp(email, otp)

        if (!result.success || !result.token || !result.user) {
            return NextResponse.json(
                { error: result.error || 'Invalid or expired code.' },
                { status: 400 }
            )
        }

        const response = NextResponse.json({
            success: true,
            user: result.user,
            message: 'Successfully authenticated.',
        })

        // Set secure HTTP-only cookie
        response.cookies.set({
            name: USER_SESSION_COOKIE,
            value: result.token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: Math.floor(USER_SESSION_TTL_MS / 1000),
            path: '/',
        })

        return response
    } catch (err: unknown) {
        console.error('[API user/auth/verify] Error:', err)
        return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
    }
}
