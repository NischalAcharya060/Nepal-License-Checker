import { NextRequest, NextResponse } from 'next/server'
import {
    ADMIN_COOKIE,
    getAdminSecret,
    verifyAdminSessionToken,
} from '@/lib/adminAuth'
import { getSearchLogs, getSearchStats } from '@/lib/searchLogger'
import { getTurso } from '@/lib/turso'
import { DEFAULT_CRON_SCHEDULE, getNextCronRun } from '@/lib/cronHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function checkAuth(request: NextRequest): Promise<boolean> {
    const secret = getAdminSecret()
    if (!secret) return false
    const token = request.cookies.get(ADMIN_COOKIE)?.value
    return verifyAdminSessionToken(token, secret)
}

async function getAdminScraperMeta(db: ReturnType<typeof getTurso>) {
    const now = Date.now()
    let scraperLastRunRaw: string | null = null
    let nextScraperRunMs: number | null = null
    let scraperSchedule = DEFAULT_CRON_SCHEDULE
    let totalRecords = 0

    try {
        const statsRes = await db.execute(
            "SELECT key, value, updated_at FROM site_stats WHERE key IN ('total_records', 'scraper_last_run', 'next_scraper_run', 'scraper_schedule')"
        )
        for (const row of statsRes.rows) {
            const key = String(row.key)
            if (key === 'total_records') {
                totalRecords = Number(row.value) || 0
            } else if (key === 'scraper_last_run') {
                scraperLastRunRaw = String(row.value)
            } else if (key === 'next_scraper_run') {
                nextScraperRunMs = Number(row.value)
            } else if (key === 'scraper_schedule') {
                if (row.value && String(row.value).trim()) {
                    scraperSchedule = String(row.value).trim()
                }
            }
        }
    } catch {
        // Ignore fallback
    }

    let lastRun: Record<string, unknown> | null = null
    if (scraperLastRunRaw) {
        try {
            lastRun = JSON.parse(scraperLastRunRaw) as Record<string, unknown>
        } catch {
            // Ignore
        }
    }

    let nextRunDate: Date | null = null
    if (nextScraperRunMs && nextScraperRunMs > now) {
        nextRunDate = new Date(nextScraperRunMs)
    } else {
        nextRunDate = getNextCronRun(scraperSchedule, new Date())
    }

    const nextRunTimestamp = nextRunDate ? nextRunDate.getTime() : now + 30 * 24 * 60 * 60 * 1000

    return {
        totalRecords,
        lastRun,
        nextRun: {
            timestamp: nextRunTimestamp,
            iso: new Date(nextRunTimestamp).toISOString(),
        },
        schedule: scraperSchedule,
    }
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
        const db = getTurso()
        const [logsData, stats, scraper] = await Promise.all([
            getSearchLogs({ page, limit, search, status }),
            getSearchStats(),
            getAdminScraperMeta(db),
        ])

        return NextResponse.json({
            status: 'success',
            data: {
                ...logsData,
                stats,
                scraper,
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
