import { NextRequest, NextResponse } from 'next/server'
import { getTurso } from '@/lib/turso'
import { RateLimiter } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Separate rate limiters:
// - Read views: up to 60/min
// - Increment view count: max 10/min per IP to prevent spamming writes
const readRateLimiter = new RateLimiter(60, 60000)
const writeRateLimiter = new RateLimiter(10, 60000)

async function ensureStatsTable(db: ReturnType<typeof getTurso>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_stats (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `)
}

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    if (!readRateLimiter.check(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const db = getTurso()
    await ensureStatsTable(db)

    const result = await db.execute(
      "SELECT value FROM site_stats WHERE key = 'page_views' LIMIT 1"
    )
    const views = Number(result.rows[0]?.value ?? 0)

    return NextResponse.json(
      {
        status: 'success',
        data: { views },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('Views API GET error:', error)
    return NextResponse.json(
      { status: 'error', error: 'Failed to retrieve views' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Cross-Site Request Forgery (CSRF) & Origin Protection
    const fetchSite = request.headers.get('sec-fetch-site')
    if (fetchSite && fetchSite === 'cross-site') {
      return NextResponse.json({ error: 'Cross-origin request forbidden' }, { status: 403 })
    }

    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (origin) {
      try {
        const originHost = new URL(origin).host
        if (
          host &&
          originHost !== host &&
          !originHost.endsWith('acharyanischal.com.np') &&
          !originHost.includes('localhost') &&
          !originHost.includes('127.0.0.1')
        ) {
          return NextResponse.json({ error: 'Untrusted origin' }, { status: 403 })
        }
      } catch {
        return NextResponse.json({ error: 'Invalid origin header' }, { status: 403 })
      }
    }

    // 2. Strict Rate Limiting for database write operations
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    if (!writeRateLimiter.check(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    const db = getTurso()
    await ensureStatsTable(db)

    const now = Date.now()
    const result = await db.execute({
      sql: `INSERT INTO site_stats (key, value, updated_at)
            VALUES ('page_views', 1, ?)
            ON CONFLICT(key) DO UPDATE SET
              value = site_stats.value + 1,
              updated_at = excluded.updated_at
            RETURNING value`,
      args: [now],
    })

    const views = Number(result.rows[0]?.value ?? 1)

    return NextResponse.json({
      status: 'success',
      data: { views },
    })
  } catch (error) {
    console.error('Views API POST error:', error)
    return NextResponse.json(
      { status: 'error', error: 'Failed to record view' },
      { status: 500 }
    )
  }
}
