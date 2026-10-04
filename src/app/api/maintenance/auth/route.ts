import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter } from '@/lib/rateLimit'
import { MAINT_COOKIE, SESSION_MAX_AGE, createSessionToken } from '@/lib/maintenanceAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Brute-force guard: 8 attempts per IP per 15 minutes.
const limiter = new RateLimiter(8, 15 * 60 * 1000)

export async function POST(request: NextRequest) {
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'anonymous'

    if (!limiter.check(ip)) {
        return NextResponse.json(
            { status: 'error', error: 'Too many attempts. Try again later.' },
            { status: 429, headers: { 'Retry-After': '900' } }
        )
    }

    const secret = process.env.MAINTENANCE_PASSWORD
    if (!secret) {
        console.error('MAINTENANCE_PASSWORD is not configured')
        return NextResponse.json(
            { status: 'error', error: 'Maintenance access is not configured on this server.' },
            { status: 503 }
        )
    }

    let password = ''
    try {
        const body = await request.json()
        password = typeof body?.password === 'string' ? body.password : ''
    } catch {
        return NextResponse.json(
            { status: 'error', error: 'Invalid request.' },
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
    response.cookies.set(MAINT_COOKIE, await createSessionToken(secret), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_MAX_AGE / 1000,
    })

    return response
}

export async function DELETE() {
    const response = NextResponse.json({ status: 'success' })
    response.cookies.set(MAINT_COOKIE, '', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    })
    return response
}
