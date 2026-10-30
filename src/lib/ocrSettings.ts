// src/lib/ocrSettings.ts
import { getTurso } from './turso'
import { getNepalMidnightTimestamp } from './cronHelper'

export interface OcrConfig {
  apiKey: string
  maskedApiKey: string
  hasKey: boolean
  keySource: 'database' | 'environment' | 'none'
  secondaryApiKey: string
  maskedSecondaryApiKey: string
  hasSecondaryKey: boolean
  secondaryKeySource: 'database' | 'environment' | 'none'
  model: string
  enabled: boolean
}

export interface OcrLogItem {
  id: number
  license_number: string | null
  status: 'success' | 'not_found' | 'timeout' | 'error'
  latency_ms: number
  confidence: string | null
  detected_source: string | null
  model_used: string | null
  ip: string | null
  error_message: string | null
  created_at: number
}

export interface OcrStatsData {
  totalScans: number
  todayScans: number
  successCount: number
  notFoundCount: number
  timeoutCount: number
  errorCount: number
  successRate: number
  avgLatencyMs: number
  dailyQuotaLimit: number
  dailyQuotaUsed: number
  dailyQuotaPercent: number
  rpmLimit: number
}

let tableChecked = false

export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••'
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`
}

export async function ensureOcrLogsTable(): Promise<void> {
  if (tableChecked) return
  const db = getTurso()
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS ocr_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_number TEXT,
        status TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        confidence TEXT,
        detected_source TEXT,
        model_used TEXT,
        ip TEXT,
        error_message TEXT,
        created_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_ocr_logs_created_at ON ocr_logs(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_ocr_logs_status ON ocr_logs(status)`,
      `CREATE INDEX IF NOT EXISTS idx_ocr_logs_license ON ocr_logs(license_number)`,
    ],
    'write'
  )
  tableChecked = true
}

export async function getActiveOcrConfig(): Promise<OcrConfig> {
  const db = getTurso()
  let dbKey = ''
  let dbSecondaryKey = ''
  let dbModel = ''
  let dbEnabled: boolean | null = null

  try {
    const res = await db.execute(
      "SELECT key, value FROM site_stats WHERE key IN ('gemini_api_key', 'gemini_api_key_secondary', 'gemini_model', 'ocr_enabled')"
    )
    for (const row of res.rows) {
      const k = String(row.key)
      const v = String(row.value)
      if (k === 'gemini_api_key' && v.trim()) {
        dbKey = v.trim()
      } else if (k === 'gemini_api_key_secondary' && v.trim()) {
        dbSecondaryKey = v.trim()
      } else if (k === 'gemini_model' && v.trim()) {
        dbModel = v.trim()
      } else if (k === 'ocr_enabled') {
        dbEnabled = v === '1' || v === 'true'
      }
    }
  } catch {
    // If table doesn't have keys yet, fallback safely
  }

  const envKey = (process.env.GEMINI_API_KEY || '').trim()
  const activeKey = dbKey || envKey
  const keySource: 'database' | 'environment' | 'none' = dbKey
    ? 'database'
    : envKey
    ? 'environment'
    : 'none'

  const envSecondaryKey = (
    process.env.GEMINI_API_KEY_SECONDARY ||
    process.env.GEMINI_SECONDARY_API_KEY ||
    process.env.GEMINI_API_KEY_BACKUP ||
    ''
  ).trim()
  const activeSecondaryKey = dbSecondaryKey || envSecondaryKey
  const secondaryKeySource: 'database' | 'environment' | 'none' = dbSecondaryKey
    ? 'database'
    : envSecondaryKey
    ? 'environment'
    : 'none'

  return {
    apiKey: activeKey,
    maskedApiKey: maskApiKey(activeKey),
    hasKey: Boolean(activeKey),
    keySource,
    secondaryApiKey: activeSecondaryKey,
    maskedSecondaryApiKey: maskApiKey(activeSecondaryKey),
    hasSecondaryKey: Boolean(activeSecondaryKey),
    secondaryKeySource,
    model: dbModel || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    enabled: dbEnabled !== null ? dbEnabled : true,
  }
}

export async function saveOcrConfig(params: {
  apiKey?: string
  secondaryApiKey?: string
  model?: string
  enabled?: boolean
}): Promise<void> {
  const db = getTurso()
  const now = Date.now()
  const statements: Array<{ sql: string; args: (string | number)[] }> = []

  if (params.apiKey !== undefined) {
    statements.push({
      sql: `INSERT INTO site_stats (key, value, updated_at) 
            VALUES ('gemini_api_key', ?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [params.apiKey.trim(), now],
    })
  }

  if (params.secondaryApiKey !== undefined) {
    statements.push({
      sql: `INSERT INTO site_stats (key, value, updated_at) 
            VALUES ('gemini_api_key_secondary', ?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [params.secondaryApiKey.trim(), now],
    })
  }

  if (params.model !== undefined) {
    statements.push({
      sql: `INSERT INTO site_stats (key, value, updated_at) 
            VALUES ('gemini_model', ?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [params.model.trim(), now],
    })
  }

  if (params.enabled !== undefined) {
    statements.push({
      sql: `INSERT INTO site_stats (key, value, updated_at) 
            VALUES ('ocr_enabled', ?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [params.enabled ? '1' : '0', now],
    })
  }

  if (statements.length > 0) {
    await db.batch(statements, 'write')
  }
}

export async function logOcrScan(entry: {
  license_number?: string | null
  status: 'success' | 'not_found' | 'timeout' | 'error'
  latency_ms: number
  confidence?: string | null
  detected_source?: string | null
  model_used?: string | null
  ip?: string | null
  error_message?: string | null
}): Promise<void> {
  try {
    await ensureOcrLogsTable()
    const db = getTurso()
    await db.execute({
      sql: `INSERT INTO ocr_logs (
        license_number, status, latency_ms, confidence, detected_source, model_used, ip, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        entry.license_number || null,
        entry.status,
        entry.latency_ms,
        entry.confidence || null,
        entry.detected_source || null,
        entry.model_used || null,
        entry.ip || null,
        entry.error_message || null,
        Date.now(),
      ],
    })
  } catch {
    // Fail silently so logging never breaks core user flow
  }
}

export async function getOcrStats(): Promise<OcrStatsData> {
  await ensureOcrLogsTable()
  const db = getTurso()
  const midnight = getNepalMidnightTimestamp()

  let totalScans = 0
  let todayScans = 0
  let successCount = 0
  let notFoundCount = 0
  let timeoutCount = 0
  let errorCount = 0
  let totalLatency = 0

  try {
    const totalRes = await db.execute('SELECT COUNT(*) as count FROM ocr_logs')
    totalScans = Number(totalRes.rows[0]?.count) || 0

    const todayRes = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM ocr_logs WHERE created_at >= ?',
      args: [midnight],
    })
    todayScans = Number(todayRes.rows[0]?.count) || 0

    const statusRes = await db.execute(
      'SELECT status, COUNT(*) as count, AVG(latency_ms) as avg_lat FROM ocr_logs GROUP BY status'
    )
    for (const row of statusRes.rows) {
      const st = String(row.status)
      const count = Number(row.count) || 0
      const avg = Number(row.avg_lat) || 0

      if (st === 'success') {
        successCount = count
        totalLatency += avg * count
      } else if (st === 'not_found') {
        notFoundCount = count
        totalLatency += avg * count
      } else if (st === 'timeout') {
        timeoutCount = count
      } else if (st === 'error') {
        errorCount = count
      }
    }
  } catch {
    // Fallback defaults
  }

  const successRate = totalScans > 0 ? Math.round((successCount / totalScans) * 100) : 100
  const measuredCount = successCount + notFoundCount
  const avgLatencyMs = measuredCount > 0 ? Math.round(totalLatency / measuredCount) : 0

  const dailyQuotaLimit = 1500
  const dailyQuotaPercent = Math.min(
    100,
    Math.round((todayScans / dailyQuotaLimit) * 100)
  )

  return {
    totalScans,
    todayScans,
    successCount,
    notFoundCount,
    timeoutCount,
    errorCount,
    successRate,
    avgLatencyMs,
    dailyQuotaLimit,
    dailyQuotaUsed: todayScans,
    dailyQuotaPercent,
    rpmLimit: 15,
  }
}

export async function getOcrLogs(params: {
  page?: number
  limit?: number
  search?: string
  status?: string
}): Promise<{ logs: OcrLogItem[]; total: number; totalPages: number }> {
  await ensureOcrLogsTable()
  const db = getTurso()
  const page = Math.max(1, params.page || 1)
  const limit = Math.max(1, Math.min(100, params.limit || 20))
  const offset = (page - 1) * limit

  const whereConditions: string[] = []
  const queryArgs: (string | number)[] = []

  if (params.status && params.status !== 'all') {
    whereConditions.push('status = ?')
    queryArgs.push(params.status)
  }

  if (params.search && params.search.trim()) {
    whereConditions.push('(license_number LIKE ? OR ip LIKE ? OR error_message LIKE ?)')
    const s = `%${params.search.trim()}%`
    queryArgs.push(s, s, s)
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM ocr_logs ${whereClause}`,
    args: queryArgs,
  })
  const total = Number(countRes.rows[0]?.count) || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const rowsRes = await db.execute({
    sql: `SELECT id, license_number, status, latency_ms, confidence, detected_source, model_used, ip, error_message, created_at 
          FROM ocr_logs ${whereClause} 
          ORDER BY created_at DESC 
          LIMIT ? OFFSET ?`,
    args: [...queryArgs, limit, offset],
  })

  const logs: OcrLogItem[] = rowsRes.rows.map((row) => ({
    id: Number(row.id),
    license_number: row.license_number ? String(row.license_number) : null,
    status: row.status as OcrLogItem['status'],
    latency_ms: Number(row.latency_ms),
    confidence: row.confidence ? String(row.confidence) : null,
    detected_source: row.detected_source ? String(row.detected_source) : null,
    model_used: row.model_used ? String(row.model_used) : null,
    ip: row.ip ? String(row.ip) : null,
    error_message: row.error_message ? String(row.error_message) : null,
    created_at: Number(row.created_at),
  }))

  return { logs, total, totalPages }
}

export async function testGeminiKey(
  apiKey: string,
  model = 'gemini-3.5-flash-lite'
): Promise<{ success: boolean; latencyMs: number; modelVersion?: string; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, latencyMs: 0, error: 'API Key is empty' }
  }

  const t0 = performance.now()
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Return JSON: {"ping": "pong"}' }] }],
        generationConfig: { response_mime_type: 'application/json' },
      }),
      signal: AbortSignal.timeout(8000),
    })

    const latencyMs = Math.round(performance.now() - t0)
    if (!res.ok) {
      const errJson = await res.json().catch(() => null)
      const message =
        errJson?.error?.message || `HTTP error ${res.status}: ${res.statusText}`
      return { success: false, latencyMs, error: message }
    }

    const data = await res.json()
    return {
      success: true,
      latencyMs,
      modelVersion: data?.modelVersion || model,
    }
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - t0)
    const errMessage = err instanceof Error ? err.message : String(err)
    return { success: false, latencyMs, error: errMessage }
  }
}

export async function deleteOcrLogs(ids: number[]): Promise<void> {
  if (!ids || ids.length === 0) return
  const db = getTurso()
  const placeholders = ids.map(() => '?').join(',')
  await db.execute({
    sql: `DELETE FROM ocr_logs WHERE id IN (${placeholders})`,
    args: ids,
  })
}

export async function clearAllOcrLogs(): Promise<void> {
  const db = getTurso()
  await db.execute('DELETE FROM ocr_logs')
}
