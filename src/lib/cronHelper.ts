// src/lib/cronHelper.ts

export const DEFAULT_CRON_SCHEDULE = '15 15 1,15 * *'

function parseCronField(field: string, minVal: number, maxVal: number): Set<number> | null {
  if (!field || field === '*') return null
  const parts = field.split(',')
  const values = new Set<number>()

  for (const p of parts) {
    if (p.includes('/')) {
      const [range, step] = p.split('/')
      const s = parseInt(step, 10)
      const [rStart, rEnd] = range === '*' ? [minVal, maxVal] : range.split('-').map(Number)
      for (let i = rStart; i <= rEnd; i += s) values.add(i)
    } else if (p.includes('-')) {
      const [start, end] = p.split('-').map(Number)
      for (let i = start; i <= end; i++) values.add(i)
    } else {
      values.add(parseInt(p, 10))
    }
  }
  return values
}

/**
 * Calculates the next UTC Date when a standard 5-part cron will trigger.
 */
export function getNextCronRun(
  cronExpr: string = DEFAULT_CRON_SCHEDULE,
  fromDate: Date = new Date()
): Date | null {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return null
  const [min, hour, dom, mon, dow] = parts

  const mins = parseCronField(min, 0, 59)
  const hours = parseCronField(hour, 0, 23)
  const doms = parseCronField(dom, 1, 31)
  const mons = parseCronField(mon, 1, 12)
  const dows = parseCronField(dow, 0, 6)

  const d = new Date(fromDate.getTime())
  d.setUTCSeconds(0, 0)
  d.setUTCMinutes(d.getUTCMinutes() + 1)

  const maxTime = fromDate.getTime() + 5 * 365 * 86400 * 1000
  while (d.getTime() < maxTime) {
    if (mons && !mons.has(d.getUTCMonth() + 1)) {
      d.setUTCMonth(d.getUTCMonth() + 1, 1)
      d.setUTCHours(0, 0, 0, 0)
      continue
    }
    const dayMatches = (!doms || doms.has(d.getUTCDate())) && (!dows || dows.has(d.getUTCDay()))
    if (!dayMatches) {
      d.setUTCDate(d.getUTCDate() + 1)
      d.setUTCHours(0, 0, 0, 0)
      continue
    }
    if (hours && !hours.has(d.getUTCHours())) {
      d.setUTCHours(d.getUTCHours() + 1, 0, 0, 0)
      continue
    }
    if (mins && !mins.has(d.getUTCMinutes())) {
      d.setUTCMinutes(d.getUTCMinutes() + 1, 0, 0)
      continue
    }
    return d
  }
  return null
}

/**
 * Formats a given date to Nepal Standard Time (UTC+5:45).
 * Resilient to null/undefined, strings, epoch numbers (both seconds and milliseconds).
 */
export function formatNepalDateTime(
  dateInput: string | number | Date | null | undefined,
  language: 'en' | 'ne' = 'en',
  includeSeconds: boolean = false
): string {
  if (!dateInput) return '—'
  let ms: number
  if (typeof dateInput === 'number') {
    ms = dateInput
  } else if (typeof dateInput === 'string') {
    const num = Number(dateInput)
    ms = !isNaN(num) && dateInput.trim() !== '' ? num : new Date(dateInput).getTime()
  } else if (dateInput instanceof Date) {
    ms = dateInput.getTime()
  } else {
    return '—'
  }

  if (isNaN(ms) || ms <= 0) return '—'
  // Auto-convert timestamps in seconds to milliseconds
  if (ms < 100000000000) {
    ms *= 1000
  }

  const d = new Date(ms)
  if (isNaN(d.getTime())) return '—'

  const locale = language === 'ne' ? 'ne-NP' : 'en-NP'
  return d.toLocaleString(locale, {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
  })
}

/**
 * Returns unix epoch milliseconds for 00:00:00 (midnight) today in Nepal Standard Time (Asia/Kathmandu, UTC+5:45).
 */
export function getNepalMidnightTimestamp(now: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const nepalDateString = formatter.format(now)
  return new Date(`${nepalDateString}T00:00:00+05:45`).getTime()
}

/**
 * Formats relative time until the next scheduled run (e.g., "in 36 days" or "३६ दिनपछि").
 */
export function formatTimeUntil(
  targetDateInput: string | number | Date,
  language: 'en' | 'ne' = 'en'
): string {
  const target = typeof targetDateInput === 'string' || typeof targetDateInput === 'number'
    ? new Date(targetDateInput)
    : targetDateInput
  const diffMs = target.getTime() - Date.now()

  if (diffMs <= 0) {
    return language === 'ne' ? 'चाँडै चल्दैछ' : 'Due any moment'
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return language === 'ne' ? `${diffDays.toLocaleString('ne-NP')} दिन बाँकी` : `in ${diffDays}d`
  }
  if (diffHours > 0) {
    return language === 'ne' ? `${diffHours.toLocaleString('ne-NP')} घण्टा बाँकी` : `in ${diffHours}h`
  }
  const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)))
  return language === 'ne' ? `${diffMins.toLocaleString('ne-NP')} मिनेट बाँकी` : `in ${diffMins}m`
}

/**
 * Returns the time of day in Nepal Standard Time for a cron expression (e.g., "09:00 PM NPT").
 */
export function formatCronTimeNPT(cronExpr: string = DEFAULT_CRON_SCHEDULE): string {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 2) return ''
  const min = parseInt(parts[0], 10)
  const hour = parseInt(parts[1], 10)
  if (isNaN(min) || isNaN(hour)) return ''
  const d = new Date()
  d.setUTCHours(hour, min, 0, 0)
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kathmandu',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) + ' NPT'
}

