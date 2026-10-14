// src/app/api/admin/passkey/login-options/route.ts
// Generates WebAuthn authentication options for passkey sign-in

import { NextRequest, NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { RateLimiter } from '@/lib/rateLimit'
import { getAdminSecret } from '@/lib/adminAuth'
import {
    PASSKEY_CHALLENGE_COOKIE,
    countPasskeys,
    createChallengeToken,
    getRpInfo,
} from '@/lib/passkey'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const limiter = new RateLimiter(15, 15 * 60 * 1000)

export async function GET(request: NextRequest) {
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'anonymous'

    if (!limiter.check(ip)) {
        return NextResponse.json(
            { status: 'error', error: 'Too many attempts. Try again in 15 minutes.' },
            { status: 429 }
        )
    }

    const secret = getAdminSecret()
    if (!secret) {
        return NextResponse.json(
            { status: 'error', error: 'Admin access is not configured.' },
            { status: 503 }
        )
    }

    try {
        const count = await countPasskeys()
        if (count === 0) {
            return NextResponse.json(
                { status: 'error', error: 'No passkeys registered. Please sign in with your password first to register a passkey.' },
                { status: 400 }
            )
        }

        const { rpID } = getRpInfo(request)

        const options = await generateAuthenticationOptions({
            rpID,
            userVerification: 'preferred',
            timeout: 60000,
        })

        const challengeToken = await createChallengeToken(options.challenge, 'authentication', secret)

        const response = NextResponse.json({ status: 'success', options })
        response.cookies.set(PASSKEY_CHALLENGE_COOKIE, challengeToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 300, // 5 minutes
        })

        return response
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to generate passkey login options'
        return NextResponse.json({ status: 'error', error: message }, { status: 500 })
    }
}
