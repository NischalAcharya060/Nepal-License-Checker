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
    getFeedbackById,
    updateFeedbackStatus,
    deleteFeedback,
    ensureFeedbackTable,
    FeedbackStatus,
} from '@/lib/feedback'
import { sendFeedbackStatusEmail, sendFeedbackTrackingEmail } from '@/lib/email'
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

export async function POST(request: NextRequest) {
    if (!(await checkAuth(request))) {
        return NextResponse.json(
            { status: 'error', error: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { action, id } = body

        if (action === 'send_tracking' || action === 'resend_tracking') {
            if (!id || typeof id !== 'string') {
                return NextResponse.json(
                    { status: 'error', error: 'Feedback ID is required.' },
                    { status: 400 }
                )
            }

            const item = await getFeedbackById(id)
            if (!item) {
                return NextResponse.json(
                    { status: 'error', error: 'Feedback record not found.' },
                    { status: 404 }
                )
            }

            if (!item.email || !item.email.includes('@')) {
                return NextResponse.json(
                    { status: 'error', error: 'This inquiry does not have a valid email address.' },
                    { status: 400 }
                )
            }

            const result = await sendFeedbackTrackingEmail({
                to: item.email,
                name: item.name,
                ticketId: item.id,
                subject: item.subject,
                category: item.category,
                status: item.status,
                licenseNumber: item.license_number,
                userMessage: item.message,
                adminNotes: item.admin_notes,
            })

            if (!result.success) {
                return NextResponse.json(
                    { status: 'error', error: result.error || 'Failed to dispatch tracking email.' },
                    { status: 500 }
                )
            }

            return NextResponse.json({
                status: 'success',
                message: `Tracking reference number (${item.id}) successfully emailed to ${item.email}!`,
                delivery: result,
            })
        }

        return NextResponse.json(
            { status: 'error', error: `Unknown action: ${action}` },
            { status: 400 }
        )
    } catch (err: unknown) {
        console.error('Failed to process admin feedback POST action:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Internal server error' },
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
        const { id, ids, status, adminNotes, sendEmail } = body

        const validStatuses: FeedbackStatus[] = ['new', 'in_progress', 'resolved']
        if (status && !validStatuses.includes(status)) {
            return NextResponse.json(
                { status: 'error', error: "Status must be 'new', 'in_progress', or 'resolved'." },
                { status: 400 }
            )
        }

        const effectiveStatus = (status as FeedbackStatus) || 'resolved'

        if (Array.isArray(ids) && ids.length > 0) {
            await ensureFeedbackTable()
            const db = getTurso()
            const cleanIds = ids.map((x: unknown) => String(x || '').trim()).filter(Boolean)
            if (cleanIds.length > 0) {
                const placeholders = cleanIds.map(() => '?').join(', ')
                await db.execute({
                    sql: `UPDATE user_feedbacks SET status = ?, updated_at = ? WHERE id IN (${placeholders})`,
                    args: [effectiveStatus, Date.now(), ...cleanIds],
                })
            }
            return NextResponse.json({
                status: 'success',
                message: `Selected feedback marked as ${effectiveStatus}.`,
            })
        }

        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { status: 'error', error: 'Feedback ID is required.' },
                { status: 400 }
            )
        }

        const currentItem = await getFeedbackById(id)
        if (!currentItem) {
            return NextResponse.json(
                { status: 'error', error: 'Feedback record not found.' },
                { status: 404 }
            )
        }

        const success = await updateFeedbackStatus(id, effectiveStatus, adminNotes)
        if (!success) {
            return NextResponse.json(
                { status: 'error', error: 'Failed to update feedback record.' },
                { status: 500 }
            )
        }

        let emailSent = false
        let emailError: string | undefined

        // If requested to send email, or admin supplied reply and sendEmail is true
        if (sendEmail && currentItem.email) {
            try {
                const emailResult = await sendFeedbackStatusEmail({
                    to: currentItem.email,
                    name: currentItem.name,
                    ticketId: currentItem.id,
                    subject: currentItem.subject,
                    category: currentItem.category,
                    licenseNumber: currentItem.license_number,
                    userMessage: currentItem.message,
                    status: effectiveStatus,
                    adminNotes: adminNotes !== undefined ? adminNotes : currentItem.admin_notes,
                    updatedAt: Date.now(),
                })
                emailSent = emailResult.success
                if (!emailResult.success) {
                    emailError = emailResult.error
                }
            } catch (err) {
                console.error('[Admin Feedback] Error sending status email:', err)
                const error = err as Error
                emailError = error.message
            }
        }

        return NextResponse.json({
            status: 'success',
            message: `Feedback updated to ${effectiveStatus}${emailSent ? ' and reply email sent to user' : ''}.`,
            emailSent,
            emailError,
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

        if (status === 'resolved' || status === 'new' || status === 'in_progress') {
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
