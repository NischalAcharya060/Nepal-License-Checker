// src/app/api/admin/developers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
    getAdminDevelopersList,
    getAdminDeveloperStats,
    adminToggleDeveloperKey,
    adminUpdateDeveloperKeyRateLimit,
    adminDeleteDeveloperKey,
} from '@/lib/developerAuth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest): Promise<boolean> {
    const secret = getAdminSecret()
    if (!secret) return false
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    return verifyAdminSessionToken(token, secret)
}

export async function GET(request: NextRequest) {
    if (!(await checkAuth(request))) {
        return NextResponse.json(
            { status: 'error', error: 'Unauthorized' },
            { status: 401 }
        )
    }

    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '10', 10) || 10))
    const search = searchParams.get('search') || ''

    try {
        const [devsData, stats] = await Promise.all([
            getAdminDevelopersList({ page, limit, search }),
            getAdminDeveloperStats(),
        ])

        return NextResponse.json({
            status: 'success',
            data: {
                ...devsData,
                stats,
            },
        })
    } catch (err: unknown) {
        console.error('Admin developers fetch error:', err)
        return NextResponse.json(
            { status: 'error', error: 'Failed to fetch developer accounts' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    if (!(await checkAuth(request))) {
        return NextResponse.json(
            { status: 'error', error: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { keyId, isActive, rateLimit, rateLimitPerMinute } = body

        if (!keyId) {
            return NextResponse.json(
                { status: 'error', error: 'keyId is required' },
                { status: 400 }
            )
        }

        if (typeof isActive === 'boolean') {
            const ok = await adminToggleDeveloperKey(keyId, isActive)
            return NextResponse.json({ status: 'success', updated: ok, isActive })
        }

        const targetRate =
            typeof rateLimit === 'number'
                ? rateLimit
                : typeof rateLimitPerMinute === 'number'
                ? rateLimitPerMinute
                : null

        if (targetRate !== null) {
            const ok = await adminUpdateDeveloperKeyRateLimit(keyId, targetRate)
            return NextResponse.json({ status: 'success', updated: ok, rateLimit: targetRate })
        }

        return NextResponse.json(
            { status: 'error', error: 'Invalid update payload' },
            { status: 400 }
        )
    } catch (err: unknown) {
        console.error('Admin update key error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to update developer key'
        return NextResponse.json(
            { status: 'error', error: errorMessage },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    if (!(await checkAuth(request))) {
        return NextResponse.json(
            { status: 'error', error: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const { searchParams } = request.nextUrl
        const keyId = searchParams.get('keyId')

        if (!keyId) {
            return NextResponse.json(
                { status: 'error', error: 'keyId is required' },
                { status: 400 }
            )
        }

        const ok = await adminDeleteDeveloperKey(keyId)
        return NextResponse.json({ status: 'success', deleted: ok })
    } catch (err: unknown) {
        console.error('Admin delete key error:', err)
        return NextResponse.json(
            { status: 'error', error: 'Failed to delete developer key' },
            { status: 500 }
        )
    }
}
