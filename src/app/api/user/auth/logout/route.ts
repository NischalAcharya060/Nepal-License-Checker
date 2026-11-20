// src/app/api/user/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { USER_SESSION_COOKIE } from '@/lib/userAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
    const response = NextResponse.json({
        success: true,
        message: 'Successfully logged out.',
    })

    response.cookies.set({
        name: USER_SESSION_COOKIE,
        value: '',
        httpOnly: true,
        expires: new Date(0),
        path: '/',
    })

    return response
}
