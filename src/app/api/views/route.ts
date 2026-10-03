import { NextRequest, NextResponse } from 'next/server'
import { getTurso } from '@/lib/turso'
import { RateLimiter } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const rateLimiter = new RateLimiter(60, 60000) // 60 requests per minute per IP

async function ensureStatsTable(db: ReturnType<typeof getTurso>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS site_stats (
      key TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `)
}

export async function GET() {
  try {
    const db = getTurso()
    await ensureStatsTable(db)

    const result = await db.execute(
      "SELECT value FROM site_stats WHERE key = 'page_views' LIMIT 1"
    )
    const views = Number(result.rows[0]?.value ?? 0)

    return NextResponse.json({
      status: 'success',
      data: { views },
    })
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
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'anonymous'

    if (!rateLimiter.check(ip)) {
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
