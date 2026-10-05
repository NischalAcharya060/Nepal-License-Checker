import { NextRequest, NextResponse } from 'next/server'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import { getSearchLogs, getSearchStats } from '@/lib/searchLogger'
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
    const status =
        statusParam === 'found' || statusParam === 'not_found' || statusParam === 'error'
            ? statusParam
            : 'all'

    try {
        const [logsData, stats] = await Promise.all([
            getSearchLogs({ page, limit, search, status }),
            getSearchStats(),
        ])

        return NextResponse.json({
            status: 'success',
            data: {
                ...logsData,
                stats,
            },
        })
    } catch (err) {
        console.error('Failed to retrieve search logs:', err)
        return NextResponse.json(
            { status: 'error', error: 'Failed to retrieve search logs.' },
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
        const days = parseInt(searchParams.get('days') || '0', 10)
        const db = getTurso()

        if (days > 0) {
            const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
            await db.execute({
                sql: 'DELETE FROM search_logs WHERE created_at < ?',
                args: [cutoff],
            })
        } else {
            // Delete all logs
            await db.execute('DELETE FROM search_logs')
        }

        return NextResponse.json({ status: 'success' })
    } catch (err) {
        console.error('Failed to delete search logs:', err)
        return NextResponse.json(
            { status: 'error', error: 'Failed to delete logs.' },
            { status: 500 }
        )
    }
}
