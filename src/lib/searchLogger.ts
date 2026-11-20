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
    source?: 'manual' | 'scanner' | string | null
    created_at: number
    duplicate_count?: number
    is_latest?: boolean
}

let tableChecked = false

export async function ensureSearchLogsTable(): Promise<void> {
    if (tableChecked) return
    const db = getTurso()
    try {
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
                    source TEXT DEFAULT 'manual',
                    created_at INTEGER NOT NULL
                )`,
                `CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at DESC)`,
                `CREATE INDEX IF NOT EXISTS idx_search_logs_license ON search_logs(license_number)`,
                `CREATE INDEX IF NOT EXISTS idx_search_logs_ip ON search_logs(ip)`,
            ],
            'write'
        )
    } catch {
        // Table or core indexes already exist
    }

    // Non-destructive column addition for existing deployments
    try {
        await db.execute(`ALTER TABLE search_logs ADD COLUMN source TEXT DEFAULT 'manual'`)
    } catch {
        // Column already exists, safe to ignore
    }

    // Create index on source column once column is guaranteed to exist
    try {
        await db.execute(`CREATE INDEX IF NOT EXISTS idx_search_logs_source ON search_logs(source)`)
    } catch {
        // Index already exists, safe to ignore
    }

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
    source?: 'manual' | 'scanner' | string | null
}): Promise<void> {
    try {
        await ensureSearchLogsTable()
        const db = getTurso()
        const now = Date.now()
        await db.execute({
            sql: `INSERT INTO search_logs (
                license_number, status, holder_name, office, category, ip, country, city, region, user_agent, source, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
                entry.source === 'scanner' ? 'scanner' : 'manual',
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
    status?: 'all' | 'found' | 'not_found' | 'error' | 'duplicates'
    source?: 'all' | 'scanner' | 'manual'
    onlyDuplicates?: boolean
}

export async function getSearchLogs({
    page = 1,
    limit = 50,
    search = '',
    status = 'all',
    source = 'all',
    onlyDuplicates = false,
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

    if (status === 'duplicates' || onlyDuplicates) {
        whereClauses.push(
            `license_number IN (
                SELECT license_number 
                FROM search_logs 
                WHERE TRIM(license_number) != '' 
                GROUP BY license_number 
                HAVING COUNT(*) > 1
            )`
        )
    } else if (status && status !== 'all') {
        whereClauses.push('status = ?')
        args.push(status)
    }

    if (source && source !== 'all') {
        whereClauses.push("COALESCE(source, 'manual') = ?")
        args.push(source)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const countRes = await db.execute({
        sql: `SELECT COUNT(*) as total FROM search_logs ${whereSql}`,
        args: [...args],
    })
    const total = Number(countRes.rows[0]?.total || 0)

    const isDupView = status === 'duplicates' || onlyDuplicates
    const orderSql = isDupView
        ? 'ORDER BY license_number ASC, created_at DESC'
        : 'ORDER BY created_at DESC'

    const listRes = await db.execute({
        sql: `SELECT id, license_number, status, holder_name, office, category, ip, country, city, region, user_agent, source, created_at,
                     (SELECT COUNT(*) FROM search_logs s2 WHERE s2.license_number = search_logs.license_number) as duplicate_count,
                     (CASE WHEN id = (
                         SELECT s3.id FROM search_logs s3 
                         WHERE s3.license_number = search_logs.license_number 
                         ORDER BY s3.created_at DESC, s3.id DESC 
                         LIMIT 1
                     ) THEN 1 ELSE 0 END) as is_latest
              FROM search_logs ${whereSql}
              ${orderSql}
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
        source: row.source ? String(row.source) : 'manual',
        created_at: Number(row.created_at || 0),
        duplicate_count: Number(row.duplicate_count || 1),
        is_latest: Number(row.is_latest || 0) === 1,
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
    duplicateCount: number
    duplicateLicenses: number
    redundantCount: number
}

export interface GetSearchStatsOptions {
    days?: number
    startDate?: string
    endDate?: string
}

export async function getSearchStats(options?: GetSearchStatsOptions): Promise<SearchLogsStats> {
    await ensureSearchLogsTable()
    const db = getTurso()

    const DAY_MS = 24 * 60 * 60 * 1000
    const todayTimestamp = getNepalMidnightTimestamp()

    let numDays = 7
    let trendStartMs = todayTimestamp - 6 * DAY_MS
    let trendEndMs = todayTimestamp + DAY_MS

    if (options?.startDate && options?.endDate) {
        try {
            const sTime = new Date(`${options.startDate}T00:00:00+05:45`).getTime()
            const eTime = new Date(`${options.endDate}T00:00:00+05:45`).getTime()
            if (!isNaN(sTime) && !isNaN(eTime) && eTime >= sTime) {
                trendStartMs = sTime
                trendEndMs = eTime + DAY_MS
                numDays = Math.min(365, Math.max(1, Math.round((trendEndMs - trendStartMs) / DAY_MS)))
            }
        } catch {
            // fallback to default
        }
    } else if (options?.days && typeof options.days === 'number' && !isNaN(options.days)) {
        numDays = Math.min(365, Math.max(1, options.days))
        trendStartMs = todayTimestamp - (numDays - 1) * DAY_MS
        trendEndMs = todayTimestamp + DAY_MS
    }

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
                          WHERE created_at >= ? AND created_at < ?
                          GROUP BY day_idx, status`,
                    args: [trendStartMs, trendStartMs, trendEndMs],
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
                `SELECT 
                    COUNT(*) as total_dup_rows,
                    COUNT(DISTINCT license_number) as dup_licenses
                 FROM search_logs
                 WHERE license_number IN (
                    SELECT license_number 
                    FROM search_logs 
                    WHERE TRIM(license_number) != '' 
                    GROUP BY license_number 
                    HAVING COUNT(*) > 1
                 )`,
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

        const dailyBuckets = Array.from({ length: numDays }, (_, idx) => {
            const dayStartMs = trendStartMs + idx * DAY_MS
            const d = new Date(dayStartMs + 12 * 60 * 60 * 1000)
            const dateStr = d.toLocaleDateString('en-US', {
                timeZone: 'Asia/Kathmandu',
                month: 'short',
                day: 'numeric',
            })
            const isToday = Math.abs(dayStartMs - todayTimestamp) < DAY_MS / 2
            const labelStr = isToday
                ? 'Today'
                : numDays <= 7
                ? d.toLocaleDateString('en-US', {
                      timeZone: 'Asia/Kathmandu',
                      weekday: 'short',
                  })
                : dateStr
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
            if (idx >= 0 && idx < numDays) {
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

        const dupRow = batchResults[9]?.rows[0]
        const duplicateCount = Number(dupRow?.total_dup_rows || 0)
        const duplicateLicenses = Number(dupRow?.dup_licenses || 0)
        const redundantCount = Math.max(0, duplicateCount - duplicateLicenses)

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
            duplicateCount,
            duplicateLicenses,
            redundantCount,
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
            duplicateCount: 0,
            duplicateLicenses: 0,
            redundantCount: 0,
        }
    }
}

export interface DeduplicateOptions {
    keep?: 'newest' | 'oldest'
    license?: string
    mode?: 'keep_one' | 'delete_all'
}

export async function deduplicateSearchLogs(options: DeduplicateOptions = {}) {
    await ensureSearchLogsTable()
    const db = getTurso()
    const { keep = 'newest', license, mode = 'keep_one' } = options

    if (mode === 'delete_all') {
        if (license && license.trim()) {
            const res = await db.execute({
                sql: 'DELETE FROM search_logs WHERE license_number = ?',
                args: [license.trim()],
            })
            return { deletedCount: Number(res.rowsAffected || 0) }
        } else {
            const res = await db.execute(`
                DELETE FROM search_logs 
                WHERE license_number IN (
                    SELECT license_number 
                    FROM search_logs 
                    WHERE TRIM(license_number) != '' 
                    GROUP BY license_number 
                    HAVING COUNT(*) > 1
                )
            `)
            return { deletedCount: Number(res.rowsAffected || 0) }
        }
    }

    // Default mode: 'keep_one' (prunes older duplicate rows, preserving 1 record per license by date)
    const sortOrder = keep === 'oldest' ? 'ASC' : 'DESC'
    if (license && license.trim()) {
        const trimmedLicense = license.trim()
        const res = await db.execute({
            sql: `DELETE FROM search_logs 
                  WHERE license_number = ? 
                    AND id IN (
                        SELECT id FROM (
                            SELECT id, 
                                   ROW_NUMBER() OVER (ORDER BY created_at ${sortOrder}, id ${sortOrder}) as rn
                            FROM search_logs 
                            WHERE license_number = ?
                        ) WHERE rn > 1
                    )`,
            args: [trimmedLicense, trimmedLicense],
        })
        return { deletedCount: Number(res.rowsAffected || 0) }
    } else {
        const res = await db.execute(`
            DELETE FROM search_logs 
            WHERE id IN (
                SELECT id FROM (
                    SELECT id, 
                           ROW_NUMBER() OVER (PARTITION BY license_number ORDER BY created_at ${sortOrder}, id ${sortOrder}) as rn
                    FROM search_logs 
                    WHERE TRIM(license_number) != ''
                ) WHERE rn > 1
            )
        `)
        return { deletedCount: Number(res.rowsAffected || 0) }
    }
}

export async function deleteSearchLogsByLicense(license: string, keepLatest: boolean = true) {
    await ensureSearchLogsTable()
    const trimmedLicense = license.trim()
    if (keepLatest) {
        return deduplicateSearchLogs({ license: trimmedLicense, keep: 'newest', mode: 'keep_one' })
    }
    const db = getTurso()
    const res = await db.execute({
        sql: 'DELETE FROM search_logs WHERE license_number = ?',
        args: [trimmedLicense],
    })
    return { deletedCount: Number(res.rowsAffected || 0) }
}

export interface DuplicateLogEntry {
    id: number
    created_at: number
    ip: string
    city?: string | null
    country?: string | null
    region?: string | null
    status: 'found' | 'not_found' | 'error'
    user_agent?: string | null
    is_latest?: boolean
}

export interface DuplicateLicenseGroup {
    license_number: string
    total_count: number
    redundant_count: number
    holder_name?: string | null
    office?: string | null
    category?: string | null
    status: 'found' | 'not_found' | 'error'
    latest_created_at: number
    earliest_created_at: number
    latest_ip: string
    latest_city?: string | null
    latest_country?: string | null
    entries: DuplicateLogEntry[]
}

export interface DuplicateSummaryResult {
    groups: DuplicateLicenseGroup[]
    stats: {
        duplicateCount: number
        duplicateLicenses: number
        redundantCount: number
    }
}

export async function getDuplicateLicenseSummary(limit: number = 200): Promise<DuplicateSummaryResult> {
    await ensureSearchLogsTable()
    const db = getTurso()

    const res = await db.execute({
        sql: `SELECT id, license_number, status, holder_name, office, category, ip, country, city, region, user_agent, created_at
              FROM search_logs
              WHERE license_number IN (
                  SELECT license_number 
                  FROM search_logs 
                  WHERE TRIM(license_number) != '' 
                  GROUP BY license_number 
                  HAVING COUNT(*) > 1
              )
              ORDER BY license_number ASC, created_at DESC`,
        args: [],
    })

    const groupMap = new Map<string, {
        license_number: string
        holder_name?: string | null
        office?: string | null
        category?: string | null
        status: 'found' | 'not_found' | 'error'
        entries: DuplicateLogEntry[]
    }>()

    for (const row of res.rows) {
        const lic = String(row.license_number || '').trim()
        if (!lic) continue

        let group = groupMap.get(lic)
        if (!group) {
            group = {
                license_number: lic,
                holder_name: row.holder_name ? String(row.holder_name) : null,
                office: row.office ? String(row.office) : null,
                category: row.category ? String(row.category) : null,
                status: String(row.status || 'not_found') as 'found' | 'not_found' | 'error',
                entries: [],
            }
            groupMap.set(lic, group)
        } else {
            if (!group.holder_name && row.holder_name) {
                group.holder_name = String(row.holder_name)
            }
            if (!group.office && row.office) {
                group.office = String(row.office)
            }
            if (!group.category && row.category) {
                group.category = String(row.category)
            }
            if (row.status === 'found') {
                group.status = 'found'
            }
        }

        const isLatest = group.entries.length === 0
        group.entries.push({
            id: Number(row.id),
            created_at: Number(row.created_at || 0),
            ip: String(row.ip || ''),
            city: row.city ? String(row.city) : null,
            country: row.country ? String(row.country) : null,
            region: row.region ? String(row.region) : null,
            status: String(row.status || 'not_found') as 'found' | 'not_found' | 'error',
            user_agent: row.user_agent ? String(row.user_agent) : null,
            is_latest: isLatest,
        })
    }

    const groups: DuplicateLicenseGroup[] = []
    let totalDuplicateRows = 0

    for (const group of groupMap.values()) {
        totalDuplicateRows += group.entries.length
        const latestEntry = group.entries[0]
        const earliestEntry = group.entries[group.entries.length - 1]

        groups.push({
            license_number: group.license_number,
            total_count: group.entries.length,
            redundant_count: Math.max(0, group.entries.length - 1),
            holder_name: group.holder_name,
            office: group.office,
            category: group.category,
            status: group.status,
            latest_created_at: latestEntry?.created_at || 0,
            earliest_created_at: earliestEntry?.created_at || 0,
            latest_ip: latestEntry?.ip || '',
            latest_city: latestEntry?.city,
            latest_country: latestEntry?.country,
            entries: group.entries,
        })
    }

    // Sort groups so that the license searched most recently comes first
    groups.sort((a, b) => b.latest_created_at - a.latest_created_at)

    const duplicateLicenses = groups.length
    const redundantCount = Math.max(0, totalDuplicateRows - duplicateLicenses)

    return {
        groups: groups.slice(0, limit),
        stats: {
            duplicateCount: totalDuplicateRows,
            duplicateLicenses,
            redundantCount,
        },
    }
}

export interface PruneLogsPreviewResult {
    days: number
    cutoff: number
    matchingCount: number
    keptCount: number
    totalCount: number
    logs: SearchLogRecord[]
}

export async function getPruneLogsPreview(days: number, limit: number = 100): Promise<PruneLogsPreviewResult> {
    await ensureSearchLogsTable()
    const db = getTurso()
    const safeDays = Math.max(1, Math.min(3650, days))
    const cutoff = Date.now() - safeDays * 24 * 60 * 60 * 1000

    const [matchingRes, totalRes, listRes] = await Promise.all([
        db.execute({
            sql: 'SELECT COUNT(*) as count FROM search_logs WHERE created_at < ?',
            args: [cutoff],
        }),
        db.execute({
            sql: 'SELECT COUNT(*) as count FROM search_logs',
            args: [],
        }),
        db.execute({
            sql: `SELECT id, license_number, status, holder_name, office, category, ip, country, city, region, user_agent, source, created_at
                  FROM search_logs
                  WHERE created_at < ?
                  ORDER BY created_at DESC
                  LIMIT ?`,
            args: [cutoff, limit],
        }),
    ])

    const matchingCount = Number(matchingRes.rows[0]?.count || 0)
    const totalCount = Number(totalRes.rows[0]?.count || 0)
    const keptCount = Math.max(0, totalCount - matchingCount)

    const logs: SearchLogRecord[] = listRes.rows.map((row) => ({
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
        source: row.source ? String(row.source) : 'manual',
        created_at: Number(row.created_at || 0),
    }))

    return {
        days: safeDays,
        cutoff,
        matchingCount,
        keptCount,
        totalCount,
        logs,
    }
}
