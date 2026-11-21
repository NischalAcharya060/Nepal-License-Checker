// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, getAdminSecret, verifyAdminSessionToken } from '@/lib/adminAuth'
import {
    getAdminUsersList,
    getAdminUserStats,
    adminGetUserDetail,
    adminBanUser,
    adminDeleteUser,
} from '@/lib/userAuth'

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
        return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const userId = searchParams.get('userId')

    try {
        if (userId) {
            const user = await adminGetUserDetail(userId)
            if (!user) {
                return NextResponse.json({ status: 'error', error: 'User not found' }, { status: 404 })
            }
            return NextResponse.json({ status: 'success', data: { user } })
        }

        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
        const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '10', 10) || 10))
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || 'all'

        const [usersData, stats] = await Promise.all([
            getAdminUsersList({ page, limit, search, status }),
            getAdminUserStats(),
        ])

        return NextResponse.json({
            status: 'success',
            data: {
                ...usersData,
                stats,
            },
        })
    } catch (err: unknown) {
        console.error('[API admin/users GET] Error:', err)
        return NextResponse.json({ status: 'error', error: 'Failed to retrieve users.' }, { status: 500 })
    }
}

export async function PATCH(request: NextRequest) {
    if (!(await checkAuth(request))) {
        return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json().catch(() => ({}))
        const userId = String(body.userId || '').trim()
        const action = String(body.action || '').trim().toLowerCase()
        const reason = body.reason ? String(body.reason).trim() : null

        if (!userId) {
            return NextResponse.json({ status: 'error', error: 'User ID is required.' }, { status: 400 })
        }

        if (action === 'ban') {
            const res = await adminBanUser(userId, true, reason)
            if (!res.success) {
                return NextResponse.json({ status: 'error', error: res.error || 'Failed to ban user.' }, { status: 400 })
            }
            return NextResponse.json({
                status: 'success',
                message: 'Citizen account suspended successfully.',
            })
        } else if (action === 'unban') {
            const res = await adminBanUser(userId, false)
            if (!res.success) {
                return NextResponse.json({ status: 'error', error: res.error || 'Failed to unban user.' }, { status: 400 })
            }
            return NextResponse.json({
                status: 'success',
                message: 'Citizen account reinstated successfully.',
            })
        } else {
            return NextResponse.json({ status: 'error', error: 'Invalid action specified. Must be "ban" or "unban".' }, { status: 400 })
        }
    } catch (err: unknown) {
        console.error('[API admin/users PATCH] Error:', err)
        return NextResponse.json({ status: 'error', error: 'Failed to update user status.' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    if (!(await checkAuth(request))) {
        return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { searchParams } = request.nextUrl
        let userId = searchParams.get('userId')

        if (!userId) {
            const body = await request.json().catch(() => ({}))
            userId = body.userId
        }

        if (!userId) {
            return NextResponse.json({ status: 'error', error: 'User ID is required.' }, { status: 400 })
        }

        const success = await adminDeleteUser(userId)
        if (!success) {
            return NextResponse.json({ status: 'error', error: 'User not found or already deleted.' }, { status: 404 })
        }

        return NextResponse.json({ status: 'success', message: 'User deleted successfully.' })
    } catch (err: unknown) {
        console.error('[API admin/users DELETE] Error:', err)
        return NextResponse.json({ status: 'error', error: 'Failed to delete user.' }, { status: 500 })
    }
}
