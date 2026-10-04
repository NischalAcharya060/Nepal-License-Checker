import { NextResponse } from 'next/server'
import { getTurso } from '@/lib/turso'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// In-memory cache to prevent repeated database queries across serverless invocations
let cachedMetadata: {
  data: {
    lastUpdated: string | null
    totalRecords: number
    totalViews: number
  }
  cachedAt: number
} | null = null

const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes in-memory cache

export async function GET() {
  try {
    const now = Date.now()
    if (cachedMetadata && now - cachedMetadata.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(
        { status: 'success', data: cachedMetadata.data },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=86400',
          },
        }
      )
    }

    const db = getTurso()

    // 1. Fast read from site_stats (reads only 2 rows instead of a 1.2M row full table scan)
    let totalRecords = 1186574
    let totalViews = 0
    let lastUpdatedMs = 0

    try {
      const statsRes = await db.execute(
        "SELECT key, value, updated_at FROM site_stats WHERE key IN ('total_records', 'page_views')"
      )

      for (const row of statsRes.rows) {
        if (row.key === 'total_records') {
          totalRecords = Number(row.value)
          lastUpdatedMs = Math.max(lastUpdatedMs, Number(row.updated_at || 0))
        } else if (row.key === 'page_views') {
          totalViews = Number(row.value)
        }
      }

      // If total_records was never recorded in site_stats, do a single fallback count and save it
      if (!statsRes.rows.some((r) => r.key === 'total_records')) {
        const countRes = await db.execute(
          'SELECT MAX(updated_at) AS last_updated, COUNT(*) AS total_records FROM licenses'
        )
        const row = countRes.rows[0]
        totalRecords = Number(row?.total_records ?? totalRecords)
        lastUpdatedMs = Number(row?.last_updated ?? lastUpdatedMs)

        // Save into site_stats so future calls never do a full table scan
        await db.execute({
          sql: `INSERT INTO site_stats (key, value, updated_at)
                VALUES ('total_records', ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
          args: [totalRecords, now],
        })
      }
    } catch {
      // Graceful fallback to default values
    }

    const payload = {
      lastUpdated:
        Number.isFinite(lastUpdatedMs) && lastUpdatedMs > 0
          ? new Date(lastUpdatedMs).toISOString()
          : null,
      totalRecords,
      totalViews,
    }

    cachedMetadata = { data: payload, cachedAt: now }

    return NextResponse.json(
      { status: 'success', data: payload },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('Meta API error:', error)
    return NextResponse.json(
      { status: 'error', error: 'Failed to load metadata' },
      { status: 500 }
    )
  }
}