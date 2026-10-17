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
                last_used_at INTEGER
            )`,
            `CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON developer_api_keys(key_hash)`,
            `CREATE INDEX IF NOT EXISTS idx_api_keys_dev_id ON developer_api_keys(developer_id)`,
        ],
        'write'
    )
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

/**
 * Validates an API key (using in-memory cache + Turso database).
 * Returns key info if valid and active, null otherwise.
 */
export async function validateDeveloperApiKey(
    rawKey: string
): Promise<{ keyId: string; developerId: string; rateLimit: number } | null> {
    if (!rawKey || !rawKey.startsWith('nlc_live_')) {
        return null
    }

    const keyHash = await hashApiKey(rawKey)
    const now = Date.now()

    // 1. Check in-memory cache
    const cached = API_KEY_CACHE.get(keyHash)
    if (cached && now - cached.cached_at < CACHE_TTL_MS) {
        if (!cached.is_active) return null
        return {
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
        return null
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

    if (!isActive) return null

    return { keyId, developerId, rateLimit }
}

// Throttle last_used_at updates so we do not write to DB on every single request
const LAST_USED_THROTTLE = new Map<string, number>()

export function recordApiKeyUsage(keyId: string): void {
    const now = Date.now()
    const last = LAST_USED_THROTTLE.get(keyId) || 0
    // Write at most once every 60 seconds per key
    if (now - last < 60000) return

    LAST_USED_THROTTLE.set(keyId, now)
    getTurso()
        .execute({
            sql: `UPDATE developer_api_keys SET last_used_at = ? WHERE id = ?`,
            args: [now, keyId],
        })
        .catch(() => {})
}
