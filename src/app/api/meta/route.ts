import { NextResponse } from 'next/server'
import { getTurso } from '@/lib/turso'
import { DEFAULT_CRON_SCHEDULE, getNextCronRun } from '@/lib/cronHelper'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface ScraperLastRunData {
  timestamp: number
  iso: string
  trigger: string
  status: 'success' | 'partial' | 'circuit_breaker' | 'empty' | 'failed'
  scraped: number
  saved: number
  failed: number
  newPdfsCount?: number
  skippedPdfsCount?: number
  totalPdfsCount?: number
  durationSeconds: number
  circuitBreakerTripped?: boolean
}

export interface ScraperMeta {
  lastRun: ScraperLastRunData | null
  nextRun: {
    timestamp: number
    iso: string
  }
  schedule: string
}

export interface AppMetadata {
  lastUpdated: string | null
  totalRecords: number
  totalViews: number
  nextScheduledRun: string
  scraper: ScraperMeta
}

// In-memory cache to prevent repeated database queries across serverless invocations
let cachedMetadata: {
  data: AppMetadata
  cachedAt: number
} | null = null

const CACHE_TTL_MS = 30 * 1000 // 30 seconds cache

export async function GET() {
  try {
    const now = Date.now()
    if (cachedMetadata && now - cachedMetadata.cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(
        { status: 'success', data: cachedMetadata.data },
        {
          headers: {
            'Cache-Control': 'public, max-age=0, s-maxage=30, must-revalidate',
          },
        }
      )
    }

    const db = getTurso()

    let totalRecords = 1185710
    let totalViews = 0
    let lastUpdatedMs = 0
    let scraperLastRunRaw: string | null = null
    let nextScraperRunMs: number | null = null
    let scraperSchedule = DEFAULT_CRON_SCHEDULE

    try {
      const statsRes = await db.execute(
        "SELECT key, value, updated_at FROM site_stats WHERE key IN ('total_records', 'page_views', 'scraper_last_run', 'next_scraper_run', 'scraper_schedule')"
      )

      for (const row of statsRes.rows) {
        const key = String(row.key)
        if (key === 'total_records') {
          totalRecords = Number(row.value)
          lastUpdatedMs = Math.max(lastUpdatedMs, Number(row.updated_at || 0))
        } else if (key === 'page_views') {
          totalViews = Number(row.value)
        } else if (key === 'scraper_last_run') {
          scraperLastRunRaw = String(row.value)
          lastUpdatedMs = Math.max(lastUpdatedMs, Number(row.updated_at || 0))
        } else if (key === 'next_scraper_run') {
          nextScraperRunMs = Number(row.value)
        } else if (key === 'scraper_schedule') {
          if (row.value && String(row.value).trim()) {
            scraperSchedule = String(row.value).trim()
          }
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

    // Parse last run info if available
    let scraperLastRun: ScraperLastRunData | null = null
    if (scraperLastRunRaw) {
      try {
        const parsed = JSON.parse(scraperLastRunRaw)
        scraperLastRun = {
          timestamp: Number(parsed.timestamp) || now,
          iso: new Date(Number(parsed.timestamp) || now).toISOString(),
          trigger: parsed.trigger || 'manual',
          status: parsed.status || 'success',
          scraped: Number(parsed.scraped) || 0,
          saved: Number(parsed.saved) || 0,
          failed: Number(parsed.failed) || 0,
          newPdfsCount: parsed.newPdfsCount,
          skippedPdfsCount: parsed.skippedPdfsCount,
          totalPdfsCount: parsed.totalPdfsCount,
          durationSeconds: Number(parsed.durationSeconds) || 0,
          circuitBreakerTripped: Boolean(parsed.circuitBreakerTripped),
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    // Determine upcoming scheduled run
    let nextRunDate: Date | null = null
    if (nextScraperRunMs && nextScraperRunMs > now) {
      nextRunDate = new Date(nextScraperRunMs)
    } else {
      nextRunDate = getNextCronRun(scraperSchedule, new Date())
    }

    const nextRunTimestamp = nextRunDate ? nextRunDate.getTime() : now + 30 * 24 * 60 * 60 * 1000
    const nextRunIso = new Date(nextRunTimestamp).toISOString()

    const payload: AppMetadata = {
      lastUpdated:
        Number.isFinite(lastUpdatedMs) && lastUpdatedMs > 0
          ? new Date(lastUpdatedMs).toISOString()
          : null,
      totalRecords,
      totalViews,
      nextScheduledRun: nextRunIso,
      scraper: {
        lastRun: scraperLastRun,
        nextRun: {
          timestamp: nextRunTimestamp,
          iso: nextRunIso,
        },
        schedule: scraperSchedule,
      },
    }

    cachedMetadata = { data: payload, cachedAt: now }

    return NextResponse.json(
      { status: 'success', data: payload },
      {
        headers: {
          'Cache-Control': 'public, max-age=0, s-maxage=30, must-revalidate',
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