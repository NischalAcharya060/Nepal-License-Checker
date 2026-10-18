// src/lib/developerAuth.ts
import { getTurso } from '@/lib/turso'

export const DEV_SESSION_COOKIE = 'nlc_dev_session'
export const DEV_STATE_COOKIE = 'nlc_gh_oauth_state'
export const DEV_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export interface DeveloperProfile {
    id: string
    github_id: number
    username: string
    name: string | null
    email: string | null
    avatar_url: string | null
    created_at: number
    updated_at: number
}

export interface DeveloperApiKey {
    id: string
    developer_id: string
    key_prefix: string
    name: string
    rate_limit_per_minute: number
    is_active: boolean
    created_at: number
    last_used_at: number | null
    total_requests: number
}

let tablesChecked = false

export async function ensureDeveloperTables(): Promise<void> {
    if (tablesChecked) return
    const db = getTurso()
    await db.batch(
        [
            `CREATE TABLE IF NOT EXISTS developers (
                id TEXT PRIMARY KEY,
                github_id INTEGER NOT NULL UNIQUE,
                username TEXT NOT NULL,
                name TEXT,
                email TEXT,
                avatar_url TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )`,
            `CREATE INDEX IF NOT EXISTS idx_developers_github_id ON developers(github_id)`,
            `CREATE TABLE IF NOT EXISTS developer_api_keys (
                id TEXT PRIMARY KEY,
                developer_id TEXT NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
                key_prefix TEXT NOT NULL,
                key_hash TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL DEFAULT 'Default API Key',
                rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                last_used_at INTEGER,
                total_requests INTEGER NOT NULL DEFAULT 0
            )`,
            `CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON developer_api_keys(key_hash)`,
            `CREATE INDEX IF NOT EXISTS idx_api_keys_dev_id ON developer_api_keys(developer_id)`,
            `CREATE TABLE IF NOT EXISTS developer_usage_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                developer_id TEXT NOT NULL,
                key_id TEXT NOT NULL,
                status_code INTEGER NOT NULL DEFAULT 200,
                latency_ms INTEGER NOT NULL DEFAULT 40,
                created_at INTEGER NOT NULL
            )`,
            `CREATE INDEX IF NOT EXISTS idx_dev_metrics_dev_time ON developer_usage_metrics(developer_id, created_at)`,
            `CREATE INDEX IF NOT EXISTS idx_dev_metrics_key ON developer_usage_metrics(key_id)`,
        ],
        'write'
    )

    // For existing tables, add total_requests if not yet present
    try {
        await db.execute('ALTER TABLE developer_api_keys ADD COLUMN total_requests INTEGER NOT NULL DEFAULT 0')
    } catch {
        // Column already exists
    }

    tablesChecked = true
}

/* -------------------------------------------------------------------------- */
/* Cryptographic Session Helper (Zero-dependency Web Crypto)                  */
/* -------------------------------------------------------------------------- */

let warnedAboutSecret = false

function getSecretKey(): string {
    const secret =
        process.env.DEVELOPER_SESSION_SECRET ||
        process.env.CRON_SECRET ||
        process.env.MAINTENANCE_PASSWORD

    if (!secret) {
        if (process.env.NODE_ENV === 'production' && !warnedAboutSecret) {
            console.warn(
                '[SECURITY WARNING] No DEVELOPER_SESSION_SECRET configured in production. ' +
                'Falling back to default secret. Please configure DEVELOPER_SESSION_SECRET in your environment.'
            )
            warnedAboutSecret = true
        }
        return 'nlc-developer-portal-secure-fallback-secret-2026'
    }

    return secret
}

function b64urlEncode(bytes: Uint8Array): string {
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(value: string): Uint8Array<ArrayBuffer> {
    const remainder = value.length % 4
    const padded = remainder === 0 ? value : value + '='.repeat(4 - remainder)
    const bin = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    const out = new Uint8Array(new ArrayBuffer(bin.length))
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
    return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
        'verify',
    ])
}

export interface DevSessionPayload {
    id: string
    github_id: number
    username: string
    exp: number
}

export async function createDeveloperSessionToken(payload: Omit<DevSessionPayload, 'exp'>): Promise<string> {
    const secret = getSecretKey()
    const fullPayload: DevSessionPayload = {
        ...payload,
        exp: Date.now() + DEV_SESSION_TTL_MS,
    }
    const payloadStr = JSON.stringify(fullPayload)
    const encodedPayload = b64urlEncode(new TextEncoder().encode(payloadStr))
    const signature = await crypto.subtle.sign(
        'HMAC',
        await getHmacKey(secret),
        new TextEncoder().encode(encodedPayload)
    )
    return `${encodedPayload}.${b64urlEncode(new Uint8Array(signature))}`
}

export async function verifyDeveloperSessionToken(token: string | undefined | null): Promise<DevSessionPayload | null> {
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 2) return null

    const [payloadPart, sigPart] = parts
    const secret = getSecretKey()

    try {
        const valid = await crypto.subtle.verify(
            'HMAC',
            await getHmacKey(secret),
            b64urlDecode(sigPart),
            new TextEncoder().encode(payloadPart)
        )
        if (!valid) return null

        const decoded = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadPart))) as DevSessionPayload
        if (typeof decoded.exp !== 'number' || Date.now() >= decoded.exp) {
            return null
        }
        return decoded
    } catch {
        return null
    }
}

/* -------------------------------------------------------------------------- */
/* API Key Generation & Hashing                                               */
/* -------------------------------------------------------------------------- */

export async function hashApiKey(rawKey: string): Promise<string> {
    const data = new TextEncoder().encode(rawKey)
    const digest = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
}

export async function generateApiKey(): Promise<{ rawKey: string; keyPrefix: string; keyHash: string }> {
    const bytes = new Uint8Array(24) // 48 hex characters
    crypto.getRandomValues(bytes)
    const randomHex = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

    const rawKey = `nlc_live_${randomHex}`
    const keyPrefix = `nlc_live_${randomHex.slice(0, 6)}...${randomHex.slice(-4)}`
    const keyHash = await hashApiKey(rawKey)

    return { rawKey, keyPrefix, keyHash }
}

/* -------------------------------------------------------------------------- */
/* In-Memory Validation Cache for API Keys (reduces DB hits)                  */
/* -------------------------------------------------------------------------- */

interface CachedApiKeyInfo {
    id: string
    developer_id: string
    rate_limit: number
    is_active: boolean
    cached_at: number
}

const API_KEY_CACHE = new Map<string, CachedApiKeyInfo>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function invalidateApiKeyCache(keyHash?: string): void {
    if (keyHash) {
        API_KEY_CACHE.delete(keyHash)
    } else {
        API_KEY_CACHE.clear()
    }
}

export type ValidateApiKeyResult =
    | { valid: true; keyId: string; developerId: string; rateLimit: number }
    | { valid: false; reason: 'suspended'; keyId: string; developerId: string }
    | { valid: false; reason: 'invalid' }

/**
 * Validates an API key (using in-memory cache + Turso database).
 * Returns key info if valid and active, or reason ('suspended' | 'invalid') if inactive or not found.
 */
export async function validateDeveloperApiKey(
    rawKey: string
): Promise<ValidateApiKeyResult> {
    if (!rawKey || !rawKey.startsWith('nlc_live_')) {
        return { valid: false, reason: 'invalid' }
    }

    const keyHash = await hashApiKey(rawKey)
    const now = Date.now()

    // 1. Check in-memory cache
    const cached = API_KEY_CACHE.get(keyHash)
    if (cached && now - cached.cached_at < CACHE_TTL_MS) {
        if (!cached.is_active) {
            return {
                valid: false,
                reason: 'suspended',
                keyId: cached.id,
                developerId: cached.developer_id,
            }
        }
        return {
            valid: true,
            keyId: cached.id,
            developerId: cached.developer_id,
            rateLimit: cached.rate_limit,
        }
    }

    // 2. Query database
    await ensureDeveloperTables()
    const db = getTurso()
    const result = await db.execute({
        sql: `SELECT id, developer_id, rate_limit_per_minute, is_active FROM developer_api_keys WHERE key_hash = ? LIMIT 1`,
        args: [keyHash],
    })

    if (!result.rows.length) {
        return { valid: false, reason: 'invalid' }
    }

    const row = result.rows[0]
    const keyId = String(row.id)
    const developerId = String(row.developer_id)
    const rateLimit = Number(row.rate_limit_per_minute) || 60
    const isActive = Boolean(row.is_active)

    // Update cache
    API_KEY_CACHE.set(keyHash, {
        id: keyId,
        developer_id: developerId,
        rate_limit: rateLimit,
        is_active: isActive,
        cached_at: now,
    })

    if (!isActive) {
        return {
            valid: false,
            reason: 'suspended',
            keyId,
            developerId,
        }
    }

    return {
        valid: true,
        keyId,
        developerId,
        rateLimit,
    }
}

// Throttle DB updates so we do not write to Turso on every single request
const LAST_USED_THROTTLE = new Map<string, number>()
const PENDING_REQUEST_COUNTS = new Map<string, number>()

export function recordApiKeyUsage(keyId: string): void {
    const currentPending = (PENDING_REQUEST_COUNTS.get(keyId) || 0) + 1
    PENDING_REQUEST_COUNTS.set(keyId, currentPending)

    const now = Date.now()
    const last = LAST_USED_THROTTLE.get(keyId) || 0
    // Flush to DB if 60 seconds have elapsed or if pending requests >= 10
    if (now - last < 60000 && currentPending < 10) return

    LAST_USED_THROTTLE.set(keyId, now)
    const countToAdd = PENDING_REQUEST_COUNTS.get(keyId) || 1
    PENDING_REQUEST_COUNTS.delete(keyId)

    getTurso()
        .execute({
            sql: `UPDATE developer_api_keys 
                  SET last_used_at = ?, total_requests = COALESCE(total_requests, 0) + ? 
                  WHERE id = ?`,
            args: [now, countToAdd, keyId],
        })
        .catch(() => {})
}

export function recordDeveloperUsageMetric(entry: {
    developerId: string
    keyId: string
    statusCode: number
    latencyMs: number
}): void {
    const now = Date.now()
    getTurso()
        .execute({
            sql: `INSERT INTO developer_usage_metrics (developer_id, key_id, status_code, latency_ms, created_at)
                  VALUES (?, ?, ?, ?, ?)`,
            args: [entry.developerId, entry.keyId, entry.statusCode, Math.max(1, entry.latencyMs), now],
        })
        .catch(() => {})
}

/* -------------------------------------------------------------------------- */
/* Admin Developer Management Helpers                                         */
/* -------------------------------------------------------------------------- */

export async function getAdminDeveloperStats(): Promise<{
    totalDevelopers: number
    totalKeys: number
    activeKeys: number
    totalQueries: number
    queriesToday: number
}> {
    await ensureDeveloperTables()
    const db = getTurso()

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const todayTimestamp = startOfToday.getTime()

    const [devsRes, keysRes, queriesTodayRes] = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM developers'),
        db.execute(`
            SELECT 
                COUNT(*) as total_keys,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_keys,
                COALESCE(SUM(total_requests), 0) as total_queries
            FROM developer_api_keys
        `),
        db.execute({
            sql: 'SELECT COUNT(*) as count FROM developer_usage_metrics WHERE created_at >= ?',
            args: [todayTimestamp],
        }).catch(() => ({ rows: [{ count: 0 }] })),
    ])

    const totalDevelopers = Number(devsRes.rows[0]?.count || 0)
    const keysRow = keysRes.rows[0] || {}
    const totalKeys = Number(keysRow.total_keys || 0)
    const activeKeys = Number(keysRow.active_keys || 0)
    const totalQueries = Number(keysRow.total_queries || 0)
    const queriesToday = Number(queriesTodayRes.rows[0]?.count || 0)

    return {
        totalDevelopers,
        totalKeys,
        activeKeys,
        totalQueries,
        queriesToday,
    }
}

export async function getAdminDevelopersList(params: {
    page: number
    limit: number
    search?: string
}): Promise<{
    developers: Array<{
        id: string
        github_id: string
        username: string
        name: string | null
        email: string | null
        avatar_url: string | null
        created_at: number
        keys: Array<{
            id: string
            developer_id: string
            key_prefix: string
            name: string
            rate_limit_per_minute: number
            is_active: number
            total_requests: number
            last_used_at: number | null
            created_at: number
        }>
        total_queries: number
    }>
    total: number
    page: number
    totalPages: number
}> {
    await ensureDeveloperTables()
    const db = getTurso()

    const { page, limit, search } = params
    const offset = (page - 1) * limit
    const searchTrimmed = (search || '').trim().toLowerCase()

    let countSql = 'SELECT COUNT(*) as count FROM developers'
    const countArgs: (string | number)[] = []

    let querySql = `
        SELECT id, github_id, username, name, email, avatar_url, created_at, updated_at
        FROM developers
    `
    const queryArgs: (string | number)[] = []

    if (searchTrimmed) {
        const filter = `
            WHERE LOWER(username) LIKE ? 
               OR LOWER(COALESCE(name, '')) LIKE ? 
               OR LOWER(COALESCE(email, '')) LIKE ?
               OR id IN (SELECT developer_id FROM developer_api_keys WHERE LOWER(key_prefix) LIKE ? OR LOWER(name) LIKE ?)
        `
        const pattern = `%${searchTrimmed}%`
        countSql += filter
        countArgs.push(pattern, pattern, pattern, pattern, pattern)

        querySql += filter
        queryArgs.push(pattern, pattern, pattern, pattern, pattern)
    }

    querySql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    queryArgs.push(limit, offset)

    const [countRes, devsRes] = await Promise.all([
        db.execute({ sql: countSql, args: countArgs }),
        db.execute({ sql: querySql, args: queryArgs }),
    ])

    const total = Number(countRes.rows[0]?.count || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))

    if (devsRes.rows.length === 0) {
        return { developers: [], total, page, totalPages }
    }

    const devIds = devsRes.rows.map((r) => String(r.id))
    const placeholders = devIds.map(() => '?').join(',')

    const keysRes = await db.execute({
        sql: `SELECT id, developer_id, key_prefix, name, rate_limit_per_minute, is_active, total_requests, last_used_at, created_at
              FROM developer_api_keys 
              WHERE developer_id IN (${placeholders})
              ORDER BY created_at DESC`,
        args: devIds,
    })

    const keysByDev = new Map<string, Array<{
        id: string
        developer_id: string
        key_prefix: string
        name: string
        rate_limit_per_minute: number
        is_active: number
        total_requests: number
        last_used_at: number | null
        created_at: number
    }>>()

    for (const row of keysRes.rows) {
        const devId = String(row.developer_id)
        if (!keysByDev.has(devId)) {
            keysByDev.set(devId, [])
        }
        keysByDev.get(devId)!.push({
            id: String(row.id),
            developer_id: devId,
            key_prefix: String(row.key_prefix),
            name: String(row.name),
            rate_limit_per_minute: Number(row.rate_limit_per_minute),
            is_active: Number(row.is_active),
            total_requests: Number(row.total_requests || 0),
            last_used_at: row.last_used_at ? Number(row.last_used_at) : null,
            created_at: Number(row.created_at),
        })
    }

    const developers = devsRes.rows.map((r) => {
        const id = String(r.id)
        const keys = keysByDev.get(id) || []
        const total_queries = keys.reduce((sum, k) => sum + k.total_requests, 0)

        return {
            id,
            github_id: String(r.github_id),
            username: String(r.username),
            name: r.name ? String(r.name) : null,
            email: r.email ? String(r.email) : null,
            avatar_url: r.avatar_url ? String(r.avatar_url) : null,
            created_at: Number(r.created_at),
            keys,
            total_queries,
        }
    })

    return {
        developers,
        total,
        page,
        totalPages,
    }
}

export async function adminToggleDeveloperKey(keyId: string, isActive: boolean): Promise<boolean> {
    await ensureDeveloperTables()
    const db = getTurso()

    const activeVal = isActive ? 1 : 0

    const res = await db.execute({
        sql: `UPDATE developer_api_keys 
              SET is_active = ? 
              WHERE id = ?`,
        args: [activeVal, keyId],
    })

    invalidateApiKeyCache()
    return res.rowsAffected > 0
}

export async function adminUpdateDeveloperKeyRateLimit(keyId: string, rateLimit: number): Promise<boolean> {
    await ensureDeveloperTables()
    const db = getTurso()

    const sanitizedRate = Math.min(1000, Math.max(5, rateLimit))

    const res = await db.execute({
        sql: `UPDATE developer_api_keys 
              SET rate_limit_per_minute = ? 
              WHERE id = ?`,
        args: [sanitizedRate, keyId],
    })

    invalidateApiKeyCache()
    return res.rowsAffected > 0
}

export async function adminDeleteDeveloperKey(keyId: string): Promise<boolean> {
    await ensureDeveloperTables()
    const db = getTurso()

    const res = await db.execute({
        sql: `DELETE FROM developer_api_keys WHERE id = ?`,
        args: [keyId],
    })

    invalidateApiKeyCache()
    return res.rowsAffected > 0
}


