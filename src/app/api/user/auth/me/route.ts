// src/app/api/user/auth/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    getCurrentUser,
    getUserById,
    verifySessionToken,
    USER_SESSION_COOKIE,
} from '@/lib/userAuth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user) {
            // Check if there was a valid session for a banned account
            const cookie = request.cookies.get(USER_SESSION_COOKIE)
            if (cookie?.value) {
                const payload = verifySessionToken(cookie.value)
                if (payload?.id) {
                    const rawUser = await getUserById(payload.id)
                    if (rawUser?.is_banned) {
                        const banMsg = rawUser.ban_reason
                            ? `Your account has been suspended: ${rawUser.ban_reason}. Please contact support.`
                            : 'Your account has been suspended by an administrator. Please contact support.'
                        const response = NextResponse.json({
                            authenticated: false,
                            banned: true,
                            ban_reason: rawUser.ban_reason,
                            error: banMsg,
                            user: null,
                        })
                        response.cookies.delete(USER_SESSION_COOKIE)
                        return response
                    }
                }
            }
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
