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
    ensureFeedbackTable,
} from '@/lib/feedback'
import { getTurso } from '@/lib/turso'

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
        const { id, ids, status, adminNotes } = body

        if (status !== 'new' && status !== 'resolved') {
            return NextResponse.json(
                { status: 'error', error: "Status must be either 'new' or 'resolved'." },
                { status: 400 }
            )
        }

        if (Array.isArray(ids) && ids.length > 0) {
            await ensureFeedbackTable()
            const db = getTurso()
            const cleanIds = ids.map((x: unknown) => String(x || '').trim()).filter(Boolean)
            if (cleanIds.length > 0) {
                const placeholders = cleanIds.map(() => '?').join(', ')
                await db.execute({
                    sql: `UPDATE user_feedbacks SET status = ?, updated_at = ? WHERE id IN (${placeholders})`,
                    args: [status, Date.now(), ...cleanIds],
                })
            }
            return NextResponse.json({
                status: 'success',
                message: `Selected feedback marked as ${status}.`,
            })
        }

        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { status: 'error', error: 'Feedback ID is required.' },
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
        const idsParam = searchParams.get('ids')
        const status = searchParams.get('status')
        const all = searchParams.get('all')

        await ensureFeedbackTable()
        const db = getTurso()

        if (id) {
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
        }

        if (idsParam) {
            const ids = idsParam
                .split(',')
                .map((x) => x.trim())
                .filter(Boolean)
            if (ids.length > 0) {
                const placeholders = ids.map(() => '?').join(', ')
                await db.execute({
                    sql: `DELETE FROM user_feedbacks WHERE id IN (${placeholders})`,
                    args: ids,
                })
            }
            return NextResponse.json({
                status: 'success',
                message: 'Selected feedback entries deleted.',
            })
        }

        if (status === 'resolved' || status === 'new') {
            await db.execute({
                sql: 'DELETE FROM user_feedbacks WHERE status = ?',
                args: [status],
            })
            return NextResponse.json({
                status: 'success',
                message: `All ${status} feedback entries deleted.`,
            })
        }

        if (all === 'true') {
            await db.execute('DELETE FROM user_feedbacks')
            return NextResponse.json({
                status: 'success',
                message: 'All feedback entries deleted.',
            })
        }

        return NextResponse.json(
            { status: 'error', error: 'Specify id, ids, status, or all=true to delete.' },
            { status: 400 }
        )
    } catch (err: unknown) {
        console.error('Failed to delete feedback:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to delete feedback.' },
            { status: 500 }
        )
    }
}
