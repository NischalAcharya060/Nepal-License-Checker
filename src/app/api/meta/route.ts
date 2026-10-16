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
  officeBreakdown?: Record<string, number>
  newPdfsCount?: number
  skippedPdfsCount?: number
  totalPdfsCount?: number
  durationSeconds: number
  circuitBreakerTripped?: boolean
}

export interface LatestBatchData {
  timestamp: number
  iso: string
  total: number
  offices: Record<string, number>
}

export interface SyncHistoryEntry {
  id?: number
  timestamp: number
  iso: string
  dateStr: string
  status: 'success' | 'partial' | 'circuit_breaker' | 'empty' | 'failed'
  saved: number
  newPdfsCount?: number
  totalPdfsCount?: number
  durationSeconds?: number
  trigger?: string
  officeBreakdown?: Record<string, number>
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
  officeTotals?: Record<string, number>
  latestBatch?: LatestBatchData | null
  scraper: ScraperMeta
  syncHistory: SyncHistoryEntry[]
}

const DEFAULT_SYNC_HISTORY: SyncHistoryEntry[] = [
  {
    id: 1,
    timestamp: 1792091215920,
    iso: '2026-10-15T19:06:55.920Z',
    dateStr: '2026-10-16',
    status: 'success',
    saved: 0,
    newPdfsCount: 0,
    totalPdfsCount: 63,
    durationSeconds: 21.8,
    trigger: 'manual_cron',
    officeBreakdown: {},
  },
  {
    id: 2,
    timestamp: 1790849433649,
    iso: '2026-10-01T10:10:33.649Z',
    dateStr: '2026-10-01',
    status: 'success',
    saved: 166228,
    newPdfsCount: 14,
    totalPdfsCount: 78,
    durationSeconds: 145.2,
    trigger: 'scheduled',
    officeBreakdown: {
      JHAPA: 68422,
      KAWASOTI: 18503,
      DUMRE: 17083,
      GAUR: 16732,
      NAWALPARASI: 8404,
      PALPA: 7362,
      BANEPA: 7025,
      Thulobharyang: 5848,
      ILLAM: 4383,
      GAIGHAT: 3498,
      DHANKUTA: 3314,
      SURKHET: 2700,
      KHURKOT: 1913,
      JUMLA: 1041,
    },
  },
  {
    id: 3,
    timestamp: 1784277000000,
    iso: '2026-07-17T08:30:00.000Z',
    dateStr: '2026-07-17',
    status: 'success',
    saved: 1019282,
    newPdfsCount: 48,
    totalPdfsCount: 48,
    durationSeconds: 310.0,
    trigger: 'initial',
    officeBreakdown: {
      RADHERADHE: 223583,
      POKHARA: 192187,
      CHABAHIL: 178226,
      ITAHARI: 93988,
      LAHAN: 52785,
      DANG: 35457,
      Thulobharyang: 34400,
      KALAIYA: 34185,
      DHANGADI: 31581,
      BARDIBAS: 31563,
      CHITWAN: 27320,
      KANCHANPUR: 24183,
      JANAKPUR: 23238,
      SARLAHI: 14170,
      BAGLUNG: 7425,
      SAPTARI: 5472,
      Dadeldhura: 1702,
      RUKUM: 1591,
      OKHALDHUNGA: 1189,
      DIPAYAL: 772,
    },
  },
]

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
    let officeTotals: Record<string, number> = {}
    let latestBatchRaw: string | null = null
    let syncHistoryRaw: string | null = null

    try {
      const statsRes = await db.execute(
        "SELECT key, value, updated_at FROM site_stats WHERE key IN ('total_records', 'page_views', 'scraper_last_run', 'next_scraper_run', 'scraper_schedule', 'office_totals', 'latest_batch_breakdown', 'sync_history')"
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
        } else if (key === 'office_totals') {
          try {
            officeTotals = JSON.parse(String(row.value))
          } catch {
            // Ignore
          }
        } else if (key === 'latest_batch_breakdown') {
          latestBatchRaw = String(row.value)
        } else if (key === 'sync_history') {
          syncHistoryRaw = String(row.value)
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
          officeBreakdown: parsed.officeBreakdown || undefined,
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

    let latestBatch: LatestBatchData | null = null
    if (latestBatchRaw) {
      try {
        const parsedBatch = JSON.parse(latestBatchRaw)
        latestBatch = {
          timestamp: Number(parsedBatch.timestamp) || now,
          iso: new Date(Number(parsedBatch.timestamp) || now).toISOString(),
          total: Number(parsedBatch.total) || 0,
          offices: parsedBatch.offices || {},
        }
      } catch {
        // Ignore
      }
    } else if (scraperLastRun && scraperLastRun.saved > 0 && scraperLastRun.officeBreakdown) {
      latestBatch = {
        timestamp: scraperLastRun.timestamp || now,
        iso: new Date(scraperLastRun.timestamp || now).toISOString(),
        total: scraperLastRun.saved,
        offices: scraperLastRun.officeBreakdown,
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

    // Parse sync history
    let syncHistory: SyncHistoryEntry[] = DEFAULT_SYNC_HISTORY
    if (syncHistoryRaw) {
      try {
        const parsedHistory = JSON.parse(syncHistoryRaw)
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
          syncHistory = parsedHistory
        }
      } catch {
        // Fallback to DEFAULT_SYNC_HISTORY
      }
    }

    const payload: AppMetadata = {
      lastUpdated:
        Number.isFinite(lastUpdatedMs) && lastUpdatedMs > 0
          ? new Date(lastUpdatedMs).toISOString()
          : null,
      totalRecords,
      totalViews,
      nextScheduledRun: nextRunIso,
      officeTotals,
      latestBatch,
      scraper: {
        lastRun: scraperLastRun,
        nextRun: {
          timestamp: nextRunTimestamp,
          iso: nextRunIso,
        },
        schedule: scraperSchedule,
      },
      syncHistory,
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