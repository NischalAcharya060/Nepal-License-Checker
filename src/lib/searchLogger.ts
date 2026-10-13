import { getTurso } from './turso'
import { getNepalMidnightTimestamp } from './cronHelper'

export interface SearchLogRecord {
    id: number
    license_number: string
    status: 'found' | 'not_found' | 'error'
    holder_name?: string | null
    office?: string | null
    category?: string | null
    ip: string
    country?: string | null
    city?: string | null
    region?: string | null
    user_agent?: string | null
    created_at: number
}

let tableChecked = false

export async function ensureSearchLogsTable(): Promise<void> {
    if (tableChecked) return
    const db = getTurso()
    await db.batch(
        [
            `CREATE TABLE IF NOT EXISTS search_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_number TEXT NOT NULL,
                status TEXT NOT NULL,
                holder_name TEXT,
                office TEXT,
                category TEXT,
                ip TEXT NOT NULL,
                country TEXT,
                city TEXT,
                region TEXT,
                user_agent TEXT,
                created_at INTEGER NOT NULL
            )`,
            `CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at DESC)`,
            `CREATE INDEX IF NOT EXISTS idx_search_logs_license ON search_logs(license_number)`,
            `CREATE INDEX IF NOT EXISTS idx_search_logs_ip ON search_logs(ip)`,
        ],
        'write'
    )
    tableChecked = true
}

export async function logSearch(entry: {
    license_number: string
    status: 'found' | 'not_found' | 'error'
    holder_name?: string | null
    office?: string | null
    category?: string | null
    ip: string
    country?: string | null
    city?: string | null
    region?: string | null
    user_agent?: string | null
}): Promise<void> {
    try {
        await ensureSearchLogsTable()
        const db = getTurso()
        const now = Date.now()
        await db.execute({
            sql: `INSERT INTO search_logs (
                license_number, status, holder_name, office, category, ip, country, city, region, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                entry.license_number,
                entry.status,
                entry.holder_name || null,
                entry.office || null,
                entry.category || null,
                entry.ip,
                entry.country || null,
                entry.city || null,
                entry.region || null,
                entry.user_agent ? entry.user_agent.slice(0, 255) : null,
                now,
            ],
        })
    } catch (err) {
        console.error('Failed to record search log in background:', err)
    }
}

export interface SearchLogsFilter {
    page?: number
    limit?: number
    search?: string
    status?: 'all' | 'found' | 'not_found' | 'error'
}

export async function getSearchLogs({
    page = 1,
    limit = 50,
    search = '',
    status = 'all',
}: SearchLogsFilter) {
    await ensureSearchLogsTable()
    const db = getTurso()
    const offset = Math.max(0, (page - 1) * limit)

    const whereClauses: string[] = []
    const args: (string | number)[] = []

    const trimmedSearch = search.trim()
    if (trimmedSearch) {
        whereClauses.push(
            '(license_number LIKE ? OR ip LIKE ? OR holder_name LIKE ? OR city LIKE ? OR country LIKE ?)'
        )
        const pattern = `%${trimmedSearch}%`
        args.push(pattern, pattern, pattern, pattern, pattern)
    }

    if (status && status !== 'all') {
        whereClauses.push('status = ?')
        args.push(status)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const countRes = await db.execute({
        sql: `SELECT COUNT(*) as total FROM search_logs ${whereSql}`,
        args: [...args],
    })
    const total = Number(countRes.rows[0]?.total || 0)

    const listRes = await db.execute({
        sql: `SELECT id, license_number, status, holder_name, office, category, ip, country, city, region, user_agent, created_at
              FROM search_logs ${whereSql}
              ORDER BY created_at DESC
              LIMIT ? OFFSET ?`,
        args: [...args, limit, offset],
    })

    const logs = listRes.rows.map((row) => ({
        id: Number(row.id),
        license_number: String(row.license_number || ''),
        status: String(row.status || 'not_found') as 'found' | 'not_found' | 'error',
        holder_name: row.holder_name ? String(row.holder_name) : null,
        office: row.office ? String(row.office) : null,
        category: row.category ? String(row.category) : null,
        ip: String(row.ip || ''),
        country: row.country ? String(row.country) : null,
        city: row.city ? String(row.city) : null,
        region: row.region ? String(row.region) : null,
        user_agent: row.user_agent ? String(row.user_agent) : null,
        created_at: Number(row.created_at || 0),
    }))

    return {
        logs,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
    }
}

export interface SearchLogsStats {
    total: number
    today: number
    found: number
    uniqueIps: number
    foundRate: number
    topLocations: Array<{ city: string; country: string; count: number }>
    dailyTrend: Array<{
        date: string
        label: string
        total: number
        found: number
        notFound: number
    }>
    topLicenses: Array<{
        license_number: string
        status: string
        count: number
    }>
    topOffices: Array<{
        office: string
        count: number
    }>
    topIps: Array<{
        ip: string
        city: string
        country: string
        count: number
    }>
}

export async function getSearchStats(): Promise<SearchLogsStats> {
    await ensureSearchLogsTable()
    const db = getTurso()

    const DAY_MS = 24 * 60 * 60 * 1000
    const todayTimestamp = getNepalMidnightTimestamp()
    const sevenDaysAgoTimestamp = todayTimestamp - 6 * DAY_MS

    try {
        const batchResults = await db.batch(
            [
                `SELECT COUNT(*) as total FROM search_logs`,
                {
                    sql: `SELECT COUNT(*) as today FROM search_logs WHERE created_at >= ?`,
                    args: [todayTimestamp],
                },
                `SELECT COUNT(*) as found FROM search_logs WHERE status = 'found'`,
                `SELECT COUNT(DISTINCT ip) as unique_ips FROM search_logs`,
                `SELECT 
                    COALESCE(NULLIF(city, ''), 'Unknown') as city,
                    COALESCE(NULLIF(country, ''), 'NP') as country,
                    COUNT(*) as count
                 FROM search_logs
                 GROUP BY city, country
                 ORDER BY count DESC
                 LIMIT 5`,
                {
                    sql: `SELECT 
                            CAST((created_at - ?) / 86400000 AS INTEGER) as day_idx,
                            status,
                            COUNT(*) as count
                          FROM search_logs
                          WHERE created_at >= ?
                          GROUP BY day_idx, status`,
                    args: [sevenDaysAgoTimestamp, sevenDaysAgoTimestamp],
                },
                `SELECT 
                    license_number,
                    MAX(status) as status,
                    COUNT(*) as count
                 FROM search_logs
                 GROUP BY license_number
                 ORDER BY count DESC
                 LIMIT 5`,
                `SELECT 
                    TRIM(office) as office,
                    COUNT(*) as count
                 FROM search_logs
                 WHERE status = 'found' AND office IS NOT NULL AND TRIM(office) != ''
                 GROUP BY TRIM(office)
                 ORDER BY count DESC
                 LIMIT 5`,
                `SELECT 
                    ip,
                    COALESCE(NULLIF(city, ''), 'Unknown') as city,
                    COALESCE(NULLIF(country, ''), 'NP') as country,
                    COUNT(*) as count
                 FROM search_logs
                 GROUP BY ip
                 ORDER BY count DESC
                 LIMIT 5`,
            ],
            'read'
        )

        const total = Number(batchResults[0]?.rows[0]?.total || 0)
        const today = Number(batchResults[1]?.rows[0]?.today || 0)
        const found = Number(batchResults[2]?.rows[0]?.found || 0)
        const uniqueIps = Number(batchResults[3]?.rows[0]?.unique_ips || 0)
        const foundRate = total > 0 ? Math.round((found / total) * 100) : 0

        const topLocations = (batchResults[4]?.rows || []).map((r) => ({
            city: String(r.city || 'Unknown'),
            country: String(r.country || 'NP'),
            count: Number(r.count || 0),
        }))

        const dailyBuckets = Array.from({ length: 7 }, (_, idx) => {
            const dayStartMs = sevenDaysAgoTimestamp + idx * DAY_MS
            const d = new Date(dayStartMs + 12 * 60 * 60 * 1000)
            const dateStr = d.toLocaleDateString('en-US', {
                timeZone: 'Asia/Kathmandu',
                month: 'short',
                day: 'numeric',
            })
            const labelStr =
                idx === 6
                    ? 'Today'
                    : d.toLocaleDateString('en-US', {
                          timeZone: 'Asia/Kathmandu',
                          weekday: 'short',
                      })
            return {
                date: dateStr,
                label: labelStr,
                total: 0,
                found: 0,
                notFound: 0,
            }
        })

        for (const r of batchResults[5]?.rows || []) {
            const idx = Number(r.day_idx)
            const st = String(r.status || '')
            const c = Number(r.count || 0)
            if (idx >= 0 && idx < 7) {
                dailyBuckets[idx].total += c
                if (st === 'found') {
                    dailyBuckets[idx].found += c
                } else {
                    dailyBuckets[idx].notFound += c
                }
            }
        }

        const topLicenses = (batchResults[6]?.rows || []).map((r) => ({
            license_number: String(r.license_number || ''),
            status: String(r.status || 'not_found'),
            count: Number(r.count || 0),
        }))

        const topOffices = (batchResults[7]?.rows || []).map((r) => ({
            office: String(r.office || 'Unknown'),
            count: Number(r.count || 0),
        }))

        const topIps = (batchResults[8]?.rows || []).map((r) => ({
            ip: String(r.ip || ''),
            city: String(r.city || 'Unknown'),
            country: String(r.country || 'NP'),
            count: Number(r.count || 0),
        }))

        return {
            total,
            today,
            found,
            uniqueIps,
            foundRate,
            topLocations,
            dailyTrend: dailyBuckets,
            topLicenses,
            topOffices,
            topIps,
        }
    } catch (err) {
        console.error('Failed to compute search stats:', err)
        return {
            total: 0,
            today: 0,
            found: 0,
            uniqueIps: 0,
            foundRate: 0,
            topLocations: [],
            dailyTrend: [],
            topLicenses: [],
            topOffices: [],
            topIps: [],
        }
    }
}
