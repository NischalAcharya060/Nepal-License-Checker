// src/app/api/admin/passkey/register-options/route.ts
// Generates WebAuthn registration options for enrolling a new passkey (admin only)

import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import type { AuthenticatorTransport } from '@simplewebauthn/server'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
    PASSKEY_CHALLENGE_COOKIE,
    createChallengeToken,
    getPasskeys,
    getRpInfo,
} from '@/lib/passkey'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const secret = getAdminSecret()
    if (!secret) {
        return NextResponse.json({ status: 'error', error: 'Admin access is not configured.' }, { status: 503 })
    }

    const token = request.cookies.get(ADMIN_COOKIE)?.value
    const valid = await verifyAdminSessionToken(token, secret)
    if (!valid) {
        return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { rpName, rpID } = getRpInfo(request)
        const existing = await getPasskeys()

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userName: 'admin',
            userDisplayName: 'Admin Console',
            attestationType: 'none',
            supportedAlgorithmIDs: [-7, -257], // ES256 and RS256 for universal device compatibility
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
            excludeCredentials: existing.map((p) => ({
                id: p.id,
                transports: p.transports as AuthenticatorTransport[],
            })),
            timeout: 60000,
        })

        const challengeToken = await createChallengeToken(options.challenge, 'registration', secret)

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
        const message = err instanceof Error ? err.message : 'Failed to generate registration options'
        return NextResponse.json({ status: 'error', error: message }, { status: 500 })
    }
}
