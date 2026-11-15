import { getTurso } from './turso'
import { invalidateMetadataCache } from './metaCache'

export type SystemMode = 'normal' | 'maintenance' | 'degraded'

export interface SystemModeConfig {
    mode: SystemMode
    message: string
    updated_at: number
    updated_by: string
}

const DEFAULT_CONFIG: SystemModeConfig = {
    mode: (process.env.NEXT_PUBLIC_MAINTENANCE === '1' ? 'maintenance' : 'normal') as SystemMode,
    message: '',
    updated_at: 0,
    updated_by: 'system',
}

let memoryCache: { config: SystemModeConfig; expiresAt: number } | null = null
const CACHE_TTL_MS = 3000 // 3 seconds in-memory cache

async function fetchSystemModeFromTurso(): Promise<SystemModeConfig> {
    const url = process.env.TURSO_DATABASE_URL
    const token = process.env.TURSO_AUTH_TOKEN
    if (!url || !token) {
        return DEFAULT_CONFIG
    }

    const httpUrl = url.replace('libsql://', 'https://') + '/v2/pipeline'
    const res = await fetch(httpUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            requests: [
                {
                    type: 'execute',
                    stmt: {
                        sql: "SELECT key, value, updated_at FROM site_stats WHERE key IN ('system_mode', 'system_mode_message', 'system_mode_updated_by')",
                    },
                },
            ],
        }),
        cache: 'no-store',
    })

    if (!res.ok) return DEFAULT_CONFIG
    const data = await res.json().catch(() => null)
    const rows = data?.results?.[0]?.response?.result?.rows || []

    let mode: SystemMode = DEFAULT_CONFIG.mode
    let message = ''
    let updatedAt = 0
    let updatedBy = 'system'

    for (const row of rows) {
        const k = row[0]?.value
        const v = row[1]?.value
        const u = Number(row[2]?.value || 0)
        if (k === 'system_mode' && v) {
            if (v === 'normal' || v === 'maintenance' || v === 'degraded') {
                mode = v
            }
            if (u > updatedAt) updatedAt = u
        } else if (k === 'system_mode_message' && v) {
            message = String(v)
        } else if (k === 'system_mode_updated_by' && v) {
            updatedBy = String(v)
        }
    }

    return {
        mode,
        message,
        updated_at: updatedAt,
        updated_by: updatedBy,
    }
}

export async function getSystemMode(): Promise<SystemModeConfig> {
    const now = Date.now()
    if (memoryCache && now < memoryCache.expiresAt) {
        return memoryCache.config
    }
    try {
        const config = await fetchSystemModeFromTurso()
        memoryCache = { config, expiresAt: now + CACHE_TTL_MS }
        return config
    } catch {
        return memoryCache?.config || DEFAULT_CONFIG
    }
}

export async function setSystemMode(
    mode: SystemMode,
    message: string = '',
    updatedBy: string = 'admin'
): Promise<SystemModeConfig> {
    const now = Date.now()
    const db = getTurso()

    await db.batch(
        [
            {
                sql: `INSERT INTO site_stats (key, value, updated_at) VALUES ('system_mode', ?, ?)
                      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                args: [mode, now],
            },
            {
                sql: `INSERT INTO site_stats (key, value, updated_at) VALUES ('system_mode_message', ?, ?)
                      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                args: [message.trim(), now],
            },
            {
                sql: `INSERT INTO site_stats (key, value, updated_at) VALUES ('system_mode_updated_by', ?, ?)
                      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
                args: [updatedBy.trim(), now],
            },
        ],
        'write'
    )

    const updatedConfig: SystemModeConfig = {
        mode,
        message: message.trim(),
        updated_at: now,
        updated_by: updatedBy.trim(),
    }

    memoryCache = { config: updatedConfig, expiresAt: now + CACHE_TTL_MS }
    invalidateMetadataCache()
    return updatedConfig
}
