// src/app/api/developer/auth/github/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DEV_STATE_COOKIE } from '@/lib/developerAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const clientId = process.env.GITHUB_CLIENT_ID

    if (!clientId) {
        return NextResponse.json(
            {
                error: 'GitHub OAuth is not configured on this server. GITHUB_CLIENT_ID environment variable is missing.',
            },
            { status: 500 }
        )
    }

    // Generate cryptographically random state to prevent CSRF attacks
    const stateBytes = new Uint8Array(16)
    crypto.getRandomValues(stateBytes)
    const state = Array.from(stateBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

    // Optional redirect_uri handling
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
    const origin = `${proto}://${host}`
    const redirectUri = `${origin}/api/developer/auth/callback`

    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
    githubAuthUrl.searchParams.set('client_id', clientId)
    githubAuthUrl.searchParams.set('redirect_uri', redirectUri)
    githubAuthUrl.searchParams.set('scope', 'read:user user:email')
    githubAuthUrl.searchParams.set('state', state)

    const response = NextResponse.redirect(githubAuthUrl.toString(), 302)
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')

    // Store state in a short-lived HTTP-only cookie (10 minutes)
    response.cookies.set(DEV_STATE_COOKIE, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60, // 10 minutes
    })

    return response
}
