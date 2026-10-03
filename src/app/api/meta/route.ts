import { NextResponse } from 'next/server'
import { getTurso } from '@/lib/turso'
 
 export const dynamic = 'force-dynamic'
 export const runtime = 'nodejs'

type MetaRow = {
    last_updated: number | string | null
    total_records: number | string | null
}

export async function GET() {
    try {
        const db = getTurso()

        const result = await db.execute(
            'SELECT MAX(updated_at) AS last_updated, COUNT(*) AS total_records FROM licenses'
        )

        const rawRow = result.rows[0] as unknown as MetaRow | undefined

        const lastUpdatedMs = Number(rawRow?.last_updated ?? 0)
        const totalRecords = Number(rawRow?.total_records ?? 0)

        let totalViews = 0
        try {
            const viewsResult = await db.execute(
                "SELECT value FROM site_stats WHERE key = 'page_views' LIMIT 1"
            )
            totalViews = Number(viewsResult.rows[0]?.value ?? 0)
        } catch {
            // site_stats table may not exist yet
        }

        return NextResponse.json({
            status: 'success',
            data: {
                lastUpdated:
                    Number.isFinite(lastUpdatedMs) && lastUpdatedMs > 0
                        ? new Date(lastUpdatedMs).toISOString()
                        : null,
                totalRecords,
                totalViews,
            },
        })
    } catch (error) {
        console.error('Meta API error:', error)
        return NextResponse.json(
            { status: 'error', error: 'Failed to load metadata' },
            { status: 500 }
        )
    }
}