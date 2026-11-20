// src/app/api/user/auth/login-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { loginWithPassword, USER_SESSION_COOKIE, USER_SESSION_TTL_MS } from '@/lib/userAuth'
import { extractGeo } from '@/lib/geo'
import { RateLimiter } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const loginLimiter = new RateLimiter(5, 60000, 300000)

export async function POST(request: NextRequest) {
    try {
        const geo = extractGeo(request)
        const ip = geo.ip
        const rateStatus = loginLimiter.checkLimit(ip)

        if (!rateStatus.allowed) {
            return NextResponse.json(
                { error: 'Too many login attempts. Please wait a few minutes before trying again.' },
                { status: 429 }
            )
        }

        const body = await request.json().catch(() => ({}))
        const email = String(body.email || '').trim()
        const password = String(body.password || '')

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
        }

        const result = await loginWithPassword(email, password)

        if (!result.success || !result.token || !result.user) {
            return NextResponse.json(
                { error: result.error || 'Invalid credentials.' },
                { status: 401 }
            )
        }

        const response = NextResponse.json({
            success: true,
            user: result.user,
            message: 'Successfully logged in.',
        })

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
        console.error('[API user/auth/login-password] Error:', err)
        return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 })
    }
}
