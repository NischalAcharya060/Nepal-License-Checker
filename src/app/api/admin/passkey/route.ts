// src/app/api/admin/passkey/route.ts
// Lists enrolled passkeys (admin) or returns passkey count/status (public)
// Deletes a passkey by ID (admin only)

import { NextRequest, NextResponse } from 'next/server'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import { countPasskeys, deletePasskey, getPasskeys } from '@/lib/passkey'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checkAdmin(request: NextRequest): Promise<boolean> {
    const secret = getAdminSecret()
    if (!secret) return false
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    return verifyAdminSessionToken(token, secret)
}

export async function GET(request: NextRequest) {
    const isAuth = await checkAdmin(request)
    const secret = getAdminSecret()

    if (!secret) {
        return NextResponse.json({ configured: false, count: 0, passkeys: [] })
    }

    try {
        const count = await countPasskeys()

        // If authenticated, return the full list of enrolled passkeys
        if (isAuth) {
            const passkeys = await getPasskeys()
            return NextResponse.json({
                status: 'success',
                configured: true,
                count,
                passkeys,
            })
        }

        // Public caller (e.g. login screen): only return whether passkeys are available
        return NextResponse.json({
            status: 'success',
            configured: true,
            hasPasskeys: count > 0,
            count,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to query passkeys'
        return NextResponse.json({ status: 'error', error: message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    const isAuth = await checkAdmin(request)
    if (!isAuth) {
        return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
        return NextResponse.json({ status: 'error', error: 'Passkey ID is required' }, { status: 400 })
    }

    try {
        const deleted = await deletePasskey(id)
        if (!deleted) {
            return NextResponse.json({ status: 'error', error: 'Passkey not found' }, { status: 404 })
        }
        return NextResponse.json({ status: 'success' })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete passkey'
        return NextResponse.json({ status: 'error', error: message }, { status: 500 })
    }
}
