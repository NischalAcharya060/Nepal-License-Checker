import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from '@/lib/rateLimit'
import {
    ADMIN_COOKIE,
    ADMIN_SESSION_MAX_AGE,
    createAdminSessionToken,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Brute-force guard: 8 attempts per IP per 15 minutes
const loginLimiter = new RateLimiter(8, 15 * 60 * 1000)

export async function GET(request: NextRequest) {
    const secret = getAdminSecret()
    if (!secret) {
        return NextResponse.json({ authenticated: false, configured: false })
    }

    const token = request.cookies.get(ADMIN_COOKIE)?.value
    const valid = await verifyAdminSessionToken(token, secret)
    return NextResponse.json({ authenticated: valid, configured: true })
}

export async function POST(request: NextRequest) {
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'anonymous'

    if (!loginLimiter.check(ip)) {
        return NextResponse.json(
            { status: 'error', error: 'Too many attempts. Try again in 15 minutes.' },
            { status: 429, headers: { 'Retry-After': '900' } }
        )
    }

    const secret = getAdminSecret()
    if (!secret) {
        return NextResponse.json(
            { status: 'error', error: 'Admin access is not configured. Set ADMIN_PASSWORD or MAINTENANCE_PASSWORD in your environment.' },
            { status: 503 }
        )
    }

    let password = ''
    try {
        const body = await request.json()
        password = typeof body?.password === 'string' ? body.password : ''
    } catch {
        return NextResponse.json(
            { status: 'error', error: 'Invalid request body.' },
            { status: 400 }
        )
    }

    if (!password || password !== secret) {
        return NextResponse.json(
            { status: 'error', error: 'Incorrect password.' },
            { status: 401 }
        )
    }

    const response = NextResponse.json({ status: 'success' })
    response.cookies.set(ADMIN_COOKIE, await createAdminSessionToken(secret), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: ADMIN_SESSION_MAX_AGE / 1000,
    })

    return response
}

export async function DELETE() {
    const response = NextResponse.json({ status: 'success' })
    response.cookies.delete(ADMIN_COOKIE)
    return response
}
