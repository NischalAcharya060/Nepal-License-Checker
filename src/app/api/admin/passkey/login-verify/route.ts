// src/app/api/admin/passkey/login-verify/route.ts
// Verifies WebAuthn assertion response and logs in the administrator

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'
import { RateLimiter } from '@/lib/rateLimit'
import {
    ADMIN_COOKIE,
    ADMIN_SESSION_MAX_AGE,
    createAdminSessionToken,
    getAdminSecret,
} from '@/lib/adminAuth'
import {
    PASSKEY_CHALLENGE_COOKIE,
    getPasskeyById,
    getRpInfo,
    updatePasskeyCounter,
    verifyChallengeToken,
} from '@/lib/passkey'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const limiter = new RateLimiter(15, 15 * 60 * 1000)

export async function POST(request: NextRequest) {
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

    const challengeCookie = request.cookies.get(PASSKEY_CHALLENGE_COOKIE)?.value
    const expectedChallenge = await verifyChallengeToken(challengeCookie, 'authentication', secret)

    if (!expectedChallenge) {
        return NextResponse.json(
            { status: 'error', error: 'Authentication challenge expired. Please try again.' },
            { status: 400 }
        )
    }

    let authResponse: AuthenticationResponseJSON
    try {
        const body = await request.json()
        authResponse = body?.response
        if (!authResponse || !authResponse.id) {
            return NextResponse.json({ status: 'error', error: 'Invalid passkey response' }, { status: 400 })
        }
    } catch {
        return NextResponse.json({ status: 'error', error: 'Invalid request body' }, { status: 400 })
    }

    const storedPasskey = await getPasskeyById(authResponse.id)
    if (!storedPasskey) {
        return NextResponse.json(
            { status: 'error', error: 'Passkey not recognized. It may have been removed.' },
            { status: 401 }
        )
    }

    const { rpID, origin } = getRpInfo(request)

    try {
        const verification = await verifyAuthenticationResponse({
            response: authResponse,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            credential: {
                id: storedPasskey.id,
                publicKey: new Uint8Array(Buffer.from(storedPasskey.public_key, 'base64url')),
                counter: storedPasskey.counter,
                transports: storedPasskey.transports ? JSON.parse(storedPasskey.transports) : undefined,
            },
            requireUserVerification: false,
        })

        if (!verification.verified) {
            return NextResponse.json(
                { status: 'error', error: 'Passkey verification failed.' },
                { status: 401 }
            )
        }

        // Update counter and last_used_at in DB
        await updatePasskeyCounter(
            storedPasskey.id,
            verification.authenticationInfo.newCounter
        )

        // Issue standard admin session cookie
        const response = NextResponse.json({ status: 'success' })
        response.cookies.set(ADMIN_COOKIE, await createAdminSessionToken(secret), {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: ADMIN_SESSION_MAX_AGE / 1000,
        })

        // Clear challenge cookie
        response.cookies.delete(PASSKEY_CHALLENGE_COOKIE)

        return response
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Passkey verification failed'
        return NextResponse.json({ status: 'error', error: message }, { status: 400 })
    }
}
