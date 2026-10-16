// src/app/api/admin/testimonials/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import {
    getAdminTestimonials,
    getTestimonialStats,
    updateTestimonialStatus,
    bulkUpdateTestimonialStatus,
    toggleFeaturedTestimonial,
    deleteTestimonial,
    bulkDeleteTestimonials,
    ensureTestimonialsTable,
} from '@/lib/testimonials'
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
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10) || 50))
    const search = searchParams.get('search') || ''
    const statusParam = searchParams.get('status') || 'all'

    try {
        const [logsData, stats] = await Promise.all([
            getAdminTestimonials({
                page,
                limit,
                search,
                status: statusParam,
            }),
            getTestimonialStats(),
        ])

        return NextResponse.json({
            status: 'success',
            data: {
                ...logsData,
                stats,
            },
        })
    } catch (err: unknown) {
        console.error('Failed to retrieve admin testimonials:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to retrieve testimonials.' },
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
        const { id, ids, status, is_featured, adminNotes } = body

        // Bulk status update
        if (Array.isArray(ids) && ids.length > 0 && status) {
            if (status !== 'pending' && status !== 'approved' && status !== 'rejected') {
                return NextResponse.json(
                    { status: 'error', error: "Status must be 'pending', 'approved', or 'rejected'." },
                    { status: 400 }
                )
            }
            const count = await bulkUpdateTestimonialStatus(ids, status)
            return NextResponse.json({
                status: 'success',
                message: `${count} testimonials marked as ${status}.`,
            })
        }

        if (!id || typeof id !== 'string') {
            return NextResponse.json(
                { status: 'error', error: 'Testimonial ID is required.' },
                { status: 400 }
            )
        }

        // Toggle featured only
        if (typeof is_featured === 'boolean' && !status) {
            const success = await toggleFeaturedTestimonial(id, is_featured)
            if (!success) {
                return NextResponse.json(
                    { status: 'error', error: 'Testimonial not found.' },
                    { status: 404 }
                )
            }
            return NextResponse.json({
                status: 'success',
                message: is_featured ? 'Marked as featured.' : 'Unmarked from featured.',
            })
        }

        if (status && status !== 'pending' && status !== 'approved' && status !== 'rejected') {
            return NextResponse.json(
                { status: 'error', error: "Status must be 'pending', 'approved', or 'rejected'." },
                { status: 400 }
            )
        }

        const success = await updateTestimonialStatus(id, status, {
            is_featured: typeof is_featured === 'boolean' ? is_featured : undefined,
            adminNotes,
        })

        if (!success) {
            return NextResponse.json(
                { status: 'error', error: 'Testimonial record not found.' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            status: 'success',
            message: `Testimonial updated to ${status}.`,
        })
    } catch (err: unknown) {
        console.error('Failed to update testimonial:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to update testimonial.' },
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

        await ensureTestimonialsTable()
        const db = getTurso()

        if (id) {
            const success = await deleteTestimonial(id)
            if (!success) {
                return NextResponse.json(
                    { status: 'error', error: 'Testimonial not found.' },
                    { status: 404 }
                )
            }
            return NextResponse.json({
                status: 'success',
                message: 'Testimonial deleted successfully.',
            })
        }

        if (idsParam) {
            const ids = idsParam.split(',').map((x) => x.trim()).filter(Boolean)
            if (ids.length > 0) {
                const count = await bulkDeleteTestimonials(ids)
                return NextResponse.json({
                    status: 'success',
                    message: `${count} testimonials deleted successfully.`,
                })
            }
        }

        if (status === 'rejected' || status === 'pending') {
            const res = await db.execute({
                sql: 'DELETE FROM testimonials WHERE status = ?',
                args: [status],
            })
            return NextResponse.json({
                status: 'success',
                message: `All ${status} testimonials (${res.rowsAffected}) deleted.`,
            })
        }

        if (all === 'true') {
            await db.execute('DELETE FROM testimonials')
            return NextResponse.json({
                status: 'success',
                message: 'All testimonials deleted.',
            })
        }

        return NextResponse.json(
            { status: 'error', error: 'Specify id, ids, status, or all=true to delete.' },
            { status: 400 }
        )
    } catch (err: unknown) {
        console.error('Failed to delete testimonial:', err)
        const error = err as Error
        return NextResponse.json(
            { status: 'error', error: error?.message || 'Failed to delete testimonial.' },
            { status: 500 }
        )
    }
}
