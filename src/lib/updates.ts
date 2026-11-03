import { getTurso } from '@/lib/turso'
import { invalidateMetadataCache } from '@/lib/metaCache'

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
  hidden?: boolean
}

export interface AdminUpdatesStatsData {
  totalUpdates: number
  visibleUpdates: number
  hiddenUpdates: number
  totalSavedRecords: number
  latestDateStr: string | null
}

export const DEFAULT_SYNC_HISTORY: SyncHistoryEntry[] = [
  {
    id: 5,
    timestamp: 1793561899946,
    iso: '2026-11-01T19:38:19.946Z',
    dateStr: '2026-11-02',
    status: 'success',
    saved: 0,
    newPdfsCount: 0,
    durationSeconds: 10.2,
    trigger: 'scheduled',
    officeBreakdown: {},
    hidden: false,
  },
  {
    id: 4,
    timestamp: 1793547607614,
    iso: '2026-11-01T15:40:07.614Z',
    dateStr: '2026-11-01',
    status: 'success',
    saved: 0,
    newPdfsCount: 1,
    durationSeconds: 27.4,
    trigger: 'manual_github',
    officeBreakdown: {},
    hidden: false,
  },
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
    hidden: false,
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
    hidden: false,
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
    hidden: false,
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

export function computeUpdatesStats(updates: SyncHistoryEntry[]): AdminUpdatesStatsData {
  let visibleCount = 0
  let hiddenCount = 0
  let totalSaved = 0
  let latestDateStr: string | null = null

  for (const item of updates) {
    if (item.hidden) {
      hiddenCount++
    } else {
      visibleCount++
    }
    totalSaved += Number(item.saved || 0)
    if (!latestDateStr || item.dateStr > latestDateStr) {
      latestDateStr = item.dateStr
    }
  }

  return {
    totalUpdates: updates.length,
    visibleUpdates: visibleCount,
    hiddenUpdates: hiddenCount,
    totalSavedRecords: totalSaved,
    latestDateStr,
  }
}

/**
 * Ensures sync_history table schema exists and has the hidden column
 */
export async function ensureSyncHistorySchema(): Promise<void> {
  const db = getTurso()
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sync_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        date_str TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'success',
        saved_count INTEGER NOT NULL DEFAULT 0,
        new_pdfs_count INTEGER NOT NULL DEFAULT 0,
        office_breakdown TEXT NOT NULL DEFAULT '{}',
        duration_seconds REAL DEFAULT 0,
        trigger TEXT DEFAULT 'scheduled',
        hidden INTEGER NOT NULL DEFAULT 0
      )
    `)
    await db.execute(`CREATE INDEX IF NOT EXISTS sync_history_date_idx ON sync_history(date_str)`)
    await db.execute(`ALTER TABLE sync_history ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0`).catch(() => {})
  } catch (err) {
    console.warn('Could not verify/alter sync_history table schema:', err)
  }
}

/**
 * Retrieves full list of update dates with hidden flags
 */
export async function getAdminUpdatesList(): Promise<{
  updates: SyncHistoryEntry[]
  stats: AdminUpdatesStatsData
}> {
  const db = getTurso()
  let list: SyncHistoryEntry[] = []

  try {
    const statRes = await db.execute({
      sql: 'SELECT value FROM site_stats WHERE key = ? LIMIT 1',
      args: ['sync_history'],
    })

    if (statRes.rows.length > 0 && statRes.rows[0].value) {
      try {
        const parsed = JSON.parse(String(statRes.rows[0].value))
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.map((item, idx) => ({
            id: Number(item.id || idx + 1),
            timestamp: Number(item.timestamp || Date.now()),
            iso: String(item.iso || new Date(Number(item.timestamp || Date.now())).toISOString()),
            dateStr: String(item.dateStr || ''),
            status: item.status || 'success',
            saved: Number(item.saved || 0),
            newPdfsCount: Number(item.newPdfsCount || 0),
            totalPdfsCount: item.totalPdfsCount ? Number(item.totalPdfsCount) : undefined,
            durationSeconds: item.durationSeconds ? Number(item.durationSeconds) : 0,
            trigger: String(item.trigger || 'scheduled'),
            officeBreakdown: item.officeBreakdown || {},
            hidden: Boolean(item.hidden),
          }))
        }
      } catch (err) {
        console.warn('Failed to parse site_stats sync_history:', err)
      }
    }

    // Fallback: If site_stats empty, check table or fallback to default
    if (list.length === 0) {
      try {
        await ensureSyncHistorySchema()
        const tableRes = await db.execute('SELECT * FROM sync_history ORDER BY timestamp DESC LIMIT 50')
        if (tableRes.rows.length > 0) {
          list = tableRes.rows.map((r) => {
            let offices = {}
            try {
              offices = JSON.parse(String(r.office_breakdown || '{}'))
            } catch {}
            return {
              id: Number(r.id),
              timestamp: Number(r.timestamp),
              iso: new Date(Number(r.timestamp)).toISOString(),
              dateStr: String(r.date_str),
              status: (String(r.status || 'success')) as SyncHistoryEntry['status'],
              saved: Number(r.saved_count || 0),
              newPdfsCount: Number(r.new_pdfs_count || 0),
              durationSeconds: Number(r.duration_seconds || 0),
              trigger: String(r.trigger || 'scheduled'),
              officeBreakdown: offices,
              hidden: Boolean(Number(r.hidden || 0)),
            }
          })
        }
      } catch {
        // Ignore
      }
    }

    if (list.length === 0) {
      list = [...DEFAULT_SYNC_HISTORY]
    }
  } catch (err) {
    console.error('Error fetching admin updates list:', err)
    list = [...DEFAULT_SYNC_HISTORY]
  }

  // Ensure sorted by timestamp descending
  list.sort((a, b) => b.timestamp - a.timestamp)

  const stats = computeUpdatesStats(list)
  return { updates: list, stats }
}

/**
 * Toggles visibility for a specific date (hidden: true / false)
 */
export async function toggleUpdateDateVisibility(
  identifier: { id?: number; dateStr?: string },
  hidden: boolean
): Promise<{ updates: SyncHistoryEntry[]; stats: AdminUpdatesStatsData; updatedItem: SyncHistoryEntry | null }> {
  const db = getTurso()
  const { updates } = await getAdminUpdatesList()

  let updatedItem: SyncHistoryEntry | null = null

  const nextList = updates.map((item) => {
    const isTarget =
      (identifier.id !== undefined && item.id === identifier.id) ||
      (identifier.dateStr && item.dateStr === identifier.dateStr)

    if (isTarget) {
      updatedItem = {
        ...item,
        hidden,
      }
      return updatedItem
    }
    return item
  })

  if (!updatedItem) {
    throw new Error(`Target update entry with id ${identifier.id} / date ${identifier.dateStr} was not found.`)
  }

  const now = Date.now()
  await db.execute({
    sql: `INSERT INTO site_stats (key, value, updated_at)
          VALUES ('sync_history', ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [JSON.stringify(nextList), now],
  })

  // Synchronize with sync_history table if present
  try {
    await ensureSyncHistorySchema()
    const targetHiddenVal = hidden ? 1 : 0
    if (identifier.id) {
      await db.execute({
        sql: 'UPDATE sync_history SET hidden = ? WHERE id = ?',
        args: [targetHiddenVal, identifier.id],
      })
    }
    if (identifier.dateStr) {
      await db.execute({
        sql: 'UPDATE sync_history SET hidden = ? WHERE date_str = ?',
        args: [targetHiddenVal, identifier.dateStr],
      })
    }
  } catch (tblErr) {
    console.warn('Failed to mirror hidden state to sync_history table:', tblErr)
  }

  invalidateMetadataCache()

  const stats = computeUpdatesStats(nextList)
  return { updates: nextList, stats, updatedItem }
}

/**
 * Creates or updates an update record
 */
export async function saveUpdateEntry(
  entry: Partial<SyncHistoryEntry>
): Promise<{ updates: SyncHistoryEntry[]; stats: AdminUpdatesStatsData; savedItem: SyncHistoryEntry }> {
  if (!entry.dateStr || !entry.dateStr.trim()) {
    throw new Error('Valid date string (YYYY-MM-DD) is required.')
  }

  const db = getTurso()
  const { updates } = await getAdminUpdatesList()
  const now = Date.now()

  const dateTimestamp = entry.timestamp || new Date(entry.dateStr + 'T12:00:00Z').getTime() || now
  const iso = new Date(dateTimestamp).toISOString()

  let savedItem: SyncHistoryEntry

  const existingIndex = updates.findIndex(
    (u) => (entry.id && u.id === entry.id) || u.dateStr === entry.dateStr
  )

  if (existingIndex >= 0) {
    // Update existing
    savedItem = {
      ...updates[existingIndex],
      ...entry,
      timestamp: dateTimestamp,
      iso,
      saved: Number(entry.saved ?? updates[existingIndex].saved ?? 0),
      durationSeconds: Number(entry.durationSeconds ?? updates[existingIndex].durationSeconds ?? 0),
      hidden: entry.hidden !== undefined ? Boolean(entry.hidden) : Boolean(updates[existingIndex].hidden),
      officeBreakdown: entry.officeBreakdown || updates[existingIndex].officeBreakdown || {},
    }
    updates[existingIndex] = savedItem
  } else {
    // Insert new
    const maxId = updates.reduce((acc, curr) => Math.max(acc, curr.id || 0), 0)
    savedItem = {
      id: maxId + 1,
      timestamp: dateTimestamp,
      iso,
      dateStr: entry.dateStr.trim(),
      status: entry.status || 'success',
      saved: Number(entry.saved || 0),
      newPdfsCount: Number(entry.newPdfsCount || 0),
      durationSeconds: Number(entry.durationSeconds || 0),
      trigger: entry.trigger || 'manual',
      officeBreakdown: entry.officeBreakdown || {},
      hidden: Boolean(entry.hidden),
    }
    updates.unshift(savedItem)
  }

  updates.sort((a, b) => b.timestamp - a.timestamp)

  await db.execute({
    sql: `INSERT INTO site_stats (key, value, updated_at)
          VALUES ('sync_history', ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [JSON.stringify(updates), now],
  })

  // Mirror to sync_history table
  try {
    await ensureSyncHistorySchema()
    const breakdownStr = JSON.stringify(savedItem.officeBreakdown || {})
    const hiddenInt = savedItem.hidden ? 1 : 0

    const existingRow = await db.execute({
      sql: 'SELECT id FROM sync_history WHERE date_str = ? ORDER BY id DESC LIMIT 1',
      args: [savedItem.dateStr],
    })

    if (existingRow.rows.length > 0) {
      await db.execute({
        sql: `UPDATE sync_history
              SET timestamp = ?, status = ?, saved_count = ?, office_breakdown = ?,
                  duration_seconds = ?, trigger = ?, hidden = ?
              WHERE id = ?`,
        args: [
          savedItem.timestamp,
          savedItem.status,
          savedItem.saved,
          breakdownStr,
          savedItem.durationSeconds || 0,
          savedItem.trigger || 'manual',
          hiddenInt,
          existingRow.rows[0].id,
        ],
      })
    } else {
      await db.execute({
        sql: `INSERT INTO sync_history
              (timestamp, date_str, status, saved_count, new_pdfs_count, office_breakdown, duration_seconds, trigger, hidden)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          savedItem.timestamp,
          savedItem.dateStr,
          savedItem.status,
          savedItem.saved,
          savedItem.newPdfsCount || 0,
          breakdownStr,
          savedItem.durationSeconds || 0,
          savedItem.trigger || 'manual',
          hiddenInt,
        ],
      })
    }
  } catch (mirrorErr) {
    console.warn('Could not mirror save to sync_history table:', mirrorErr)
  }

  invalidateMetadataCache()

  const stats = computeUpdatesStats(updates)
  return { updates, stats, savedItem }
}

/**
 * Deletes an update record
 */
export async function deleteUpdateEntry(
  identifier: { id?: number; dateStr?: string }
): Promise<{ updates: SyncHistoryEntry[]; stats: AdminUpdatesStatsData }> {
  const db = getTurso()
  const { updates } = await getAdminUpdatesList()

  const nextList = updates.filter(
    (item) =>
      !(
        (identifier.id !== undefined && item.id === identifier.id) ||
        (identifier.dateStr && item.dateStr === identifier.dateStr)
      )
  )

  const now = Date.now()
  await db.execute({
    sql: `INSERT INTO site_stats (key, value, updated_at)
          VALUES ('sync_history', ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [JSON.stringify(nextList), now],
  })

  try {
    await ensureSyncHistorySchema()
    if (identifier.id !== undefined) {
      await db.execute({
        sql: 'DELETE FROM sync_history WHERE id = ?',
        args: [identifier.id],
      })
    } else if (identifier.dateStr) {
      await db.execute({
        sql: 'DELETE FROM sync_history WHERE date_str = ?',
        args: [identifier.dateStr],
      })
    }
  } catch (err) {
    console.warn('Failed to delete row from sync_history table:', err)
  }

  invalidateMetadataCache()

  const stats = computeUpdatesStats(nextList)
  return { updates: nextList, stats }
}

/**
 * Restores default updates list
 */
export async function resetDefaultUpdates(): Promise<{
  updates: SyncHistoryEntry[]
  stats: AdminUpdatesStatsData
}> {
  const db = getTurso()
  const now = Date.now()
  const defaults = [...DEFAULT_SYNC_HISTORY]

  await db.execute({
    sql: `INSERT INTO site_stats (key, value, updated_at)
          VALUES ('sync_history', ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [JSON.stringify(defaults), now],
  })

  invalidateMetadataCache()

  const stats = computeUpdatesStats(defaults)
  return { updates: defaults, stats }
}
