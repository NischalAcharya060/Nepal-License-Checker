// src/app/api/admin/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
    getFeedbackLogs,
    getFeedbackStats,
    updateFeedbackStatus,
    deleteFeedback,
} from '@/lib/feedback'

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
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10) || 50))
    const search = searchParams.get('search') || ''
    const statusParam = searchParams.get('status') || 'all'
    const categoryParam = searchParams.get('category') || 'all'

    try {
        const [logsData, stats] = await Promise.all([
            getFeedbackLogs({
                page,
                limit,
                search,
                status: statusParam,
                category: categoryParam,
            }),
            getFeedbackStats(),
        ])

        return NextResponse.json({
            status: 'success',
            data: {
                ...logsData,
                stats,
            },
        })
    } catch (err: unknown) {
        console.error('Failed to retrieve feedback logs:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to retrieve feedback logs.' },
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
        const { id, status, adminNotes } = body

        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { status: 'error', error: 'Feedback ID is required.' },
                { status: 400 }
            )
        }

        if (status !== 'new' && status !== 'resolved') {
            return NextResponse.json(
                { status: 'error', error: "Status must be either 'new' or 'resolved'." },
                { status: 400 }
            )
        }

        const success = await updateFeedbackStatus(id, status, adminNotes)
        if (!success) {
            return NextResponse.json(
                { status: 'error', error: 'Feedback record not found.' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            status: 'success',
            message: `Feedback marked as ${status}.`,
        })
    } catch (err: unknown) {
        console.error('Failed to update feedback:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to update feedback.' },
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
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { status: 'error', error: 'Specify an id to delete.' },
                { status: 400 }
            )
        }

        const success = await deleteFeedback(id)
        if (!success) {
            return NextResponse.json(
                { status: 'error', error: 'Feedback record not found.' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            status: 'success',
            message: 'Feedback deleted successfully.',
        })
    } catch (err: unknown) {
        console.error('Failed to delete feedback:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to delete feedback.' },
            { status: 500 }
        )
    }
}
