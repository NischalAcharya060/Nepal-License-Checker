// src/app/api/developer/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DEV_SESSION_COOKIE } from '@/lib/developerAuth'

export const dynamic = 'force-dynamic'

export async function POST() {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
    response.cookies.delete(DEV_SESSION_COOKIE)
    return response
}

export async function GET(request: NextRequest) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const origin = `${proto}://${host}`

    const response = NextResponse.redirect(new URL('/developer', origin), 302)
    response.cookies.delete(DEV_SESSION_COOKIE)
    return response
}
