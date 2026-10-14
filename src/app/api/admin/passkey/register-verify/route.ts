// src/app/api/admin/passkey/register-verify/route.ts
// Verifies WebAuthn attestation response and stores the passkey in database (admin only)

import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
    PASSKEY_CHALLENGE_COOKIE,
    getRpInfo,
    savePasskey,
    verifyChallengeToken,
} from '@/lib/passkey'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    const secret = getAdminSecret()
    if (!secret) {
        return NextResponse.json({ status: 'error', error: 'Admin access is not configured.' }, { status: 503 })
    }

    const token = request.cookies.get(ADMIN_COOKIE)?.value
    const valid = await verifyAdminSessionToken(token, secret)
    if (!valid) {
        return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
    }

    const challengeCookie = request.cookies.get(PASSKEY_CHALLENGE_COOKIE)?.value
    const expectedChallenge = await verifyChallengeToken(challengeCookie, 'registration', secret)

    if (!expectedChallenge) {
        return NextResponse.json(
            { status: 'error', error: 'Registration session expired. Please try again.' },
            { status: 400 }
        )
    }

    let regResponse: RegistrationResponseJSON
    let deviceName = 'Biometric Passkey'

    try {
        const body = await request.json()
        regResponse = body?.response
        if (typeof body?.deviceName === 'string' && body.deviceName.trim()) {
            deviceName = body.deviceName.trim().slice(0, 50)
        }
        if (!regResponse || !regResponse.id) {
            return NextResponse.json({ status: 'error', error: 'Invalid registration response' }, { status: 400 })
        }
    } catch {
        return NextResponse.json({ status: 'error', error: 'Invalid request body' }, { status: 400 })
    }

    const { rpID, origin } = getRpInfo(request)

    try {
        const verification = await verifyRegistrationResponse({
            response: regResponse,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            supportedAlgorithmIDs: [-7, -257],
            requireUserVerification: false,
        })

        if (!verification.verified || !verification.registrationInfo) {
            return NextResponse.json(
                { status: 'error', error: 'Passkey registration could not be verified.' },
                { status: 400 }
            )
        }

        const { credential, credentialDeviceType, credentialBackedUp, aaguid } = verification.registrationInfo

        await savePasskey({
            id: credential.id,
            publicKey: credential.publicKey,
            counter: credential.counter,
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
            transports: credential.transports,
            deviceName,
            aaguid,
        })

        const response = NextResponse.json({
            status: 'success',
            passkey: {
                id: credential.id,
                device_name: deviceName,
                device_type: credentialDeviceType,
                backed_up: credentialBackedUp,
                created_at: Date.now(),
            },
        })

        // Clear challenge cookie
        response.cookies.delete(PASSKEY_CHALLENGE_COOKIE)

        return response
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Passkey registration failed'
        return NextResponse.json({ status: 'error', error: message }, { status: 400 })
    }
}
