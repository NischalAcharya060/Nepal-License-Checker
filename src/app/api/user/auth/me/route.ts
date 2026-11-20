// src/app/api/user/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/userAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            return NextResponse.json({ authenticated: false, user: null })
        }

        return NextResponse.json({
            authenticated: true,
            user,
        })
    } catch (err: unknown) {
        console.error('[API user/auth/me] Error:', err)
        return NextResponse.json({ authenticated: false, user: null }, { status: 500 })
    }
}
