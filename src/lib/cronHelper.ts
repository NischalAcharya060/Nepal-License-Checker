// src/lib/cronHelper.ts

export const DEFAULT_CRON_SCHEDULE = '0 2 1,15 * *'

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
 */
export function formatNepalDateTime(
  dateInput: string | number | Date,
  language: 'en' | 'ne' = 'en'
): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return ''

  const locale = language === 'ne' ? 'ne-NP' : 'en-NP'
  return d.toLocaleString(locale, {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
