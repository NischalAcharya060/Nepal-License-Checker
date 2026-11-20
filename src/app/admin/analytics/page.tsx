'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { SearchStats } from '../types'

export interface AdminAnalyticsProps {
    stats?: SearchStats | null
    privacyMode?: boolean
    setActiveTab?: (tab: 'searches' | 'notifications' | 'feedback' | 'testimonials' | 'developers' | 'ocr' | 'updates') => void
    setSearchFilter?: (filter: string) => void
    setPage?: (page: number) => void
    setStatusFilter?: (status: 'all' | 'found' | 'not_found' | 'duplicates') => void
}

function getCatmullRomPath(pts: Array<{ x: number; y: number }>): string {
    if (pts.length === 0) return ''
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = i === 0 ? pts[0] : pts[i - 1]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = i + 2 < pts.length ? pts[i + 2] : p2

        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
}

function formatDateYMD(d: Date): string {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminAnalytics(props: any) {
    const {
        stats = null,
    }: AdminAnalyticsProps = props || {}

    // Standalone fallback if navigated directly to /admin/analytics without props
    const [standaloneStats, setStandaloneStats] = useState<SearchStats | null>(null)
    const hasFetchedStandalone = useRef(false)

    // View & Horizon Controls
    const [showLedgerTable, setShowLedgerTable] = useState<boolean>(false)
    const [metricFocus, setMetricFocus] = useState<'all' | 'found' | 'rate'>('all')
    const [rangeMode, setRangeMode] = useState<'7d' | '30d' | '90d' | 'custom'>('7d')
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

    // Custom Date Range State
    const [showCustomPicker, setShowCustomPicker] = useState<boolean>(false)
    const [customStart, setCustomStart] = useState<string>(() => {
        const d = new Date()
        d.setDate(d.getDate() - 14)
        return formatDateYMD(d)
    })
    const [customEnd, setCustomEnd] = useState<string>(() => formatDateYMD(new Date()))
    const [customError, setCustomError] = useState<string>('')

    // Range Cache & Loading
    const [rangeCache, setRangeCache] = useState<Record<string, SearchStats>>({})
    const [isFetchingRange, setIsFetchingRange] = useState<boolean>(false)

    // UI Feedback States
    const [copiedSummary, setCopiedSummary] = useState(false)

    // Standalone data fetch if props.stats is omitted
    useEffect(() => {
        if (!stats && !hasFetchedStandalone.current) {
            hasFetchedStandalone.current = true
            let isCancelled = false
            fetch('/api/admin/logs?stats_only=true', { cache: 'no-store' })
                .then((res) => res.json())
                .then((json) => {
                    if (!isCancelled && json.status === 'success' && json.data?.stats) {
                        setStandaloneStats(json.data.stats)
                    }
                })
                .catch((err) => console.error('Failed to load standalone stats:', err))
            return () => {
                isCancelled = true
            }
        }
    }, [stats])

    // Active stats based on selected range
    const activeStats: SearchStats | null = useMemo(() => {
        const base = stats || standaloneStats
        if (rangeMode === '7d') {
            return base
        }
        const key = rangeMode === 'custom' ? `${customStart}_${customEnd}` : rangeMode
        return rangeCache[key] || base
    }, [rangeMode, stats, standaloneStats, rangeCache, customStart, customEnd])

    const trend = useMemo(() => activeStats?.dailyTrend || [], [activeStats?.dailyTrend])

    // Range-aware metrics calculation
    const {
        totalPeriod,
        foundPeriod,
        notFoundPeriod,
        avgDaily,
        peakDay,
        lowestDay,
        periodFoundRate,
        maxDay,
        firstDate,
        lastDate,
        deltaYesterday,
    } = useMemo(() => {
        const totalP = trend.reduce((sum, d) => sum + d.total, 0)
        const foundP = trend.reduce((sum, d) => sum + d.found, 0)
        const notFoundP = Math.max(0, totalP - foundP)
        const avgD = trend.length > 0 ? Math.round(totalP / trend.length) : 0
        const peak = trend.reduce(
            (max, d) => (d.total > (max?.total || 0) ? d : max),
            trend[0] || null
        )
        const lowest = trend.reduce(
            (min, d) => (d.total < (min?.total ?? Infinity) ? d : min),
            trend[0] || null
        )
        const rate = totalP > 0 ? Math.round((foundP / totalP) * 100) : 0
        const mDay = Math.max(1, ...trend.map((d) => d.total))
        const fDate = trend[0]?.date || ''
        const lDate = trend[trend.length - 1]?.date || ''

        // Calculate vs yesterday
        let deltaText = '+0% vs yesterday'
        let deltaPositive = true
        if (trend.length >= 2) {
            const todayCount = trend[trend.length - 1]?.total || 0
            const yestCount = trend[trend.length - 2]?.total || 0
            if (yestCount === 0) {
                deltaText = todayCount > 0 ? '+100% vs yesterday' : '0% vs yesterday'
                deltaPositive = true
            } else {
                const diff = todayCount - yestCount
                const pct = Math.round((diff / yestCount) * 100)
                deltaPositive = pct >= 0
                deltaText = `${pct >= 0 ? '+' : ''}${pct}% vs yesterday`
            }
        }

        return {
            totalPeriod: totalP,
            foundPeriod: foundP,
            notFoundPeriod: notFoundP,
            avgDaily: avgD,
            peakDay: peak,
            lowestDay: lowest,
            periodFoundRate: rate,
            maxDay: mDay,
            firstDate: fDate,
            lastDate: lDate,
            deltaYesterday: { text: deltaText, positive: deltaPositive },
        }
    }, [trend])

    // Active inspection item
    const activeInspection = useMemo(() => {
        if (trend.length === 0) return null
        const activeIdx =
            hoveredIndex !== null
                ? hoveredIndex
                : selectedIndex !== null
                ? selectedIndex
                : trend.length > 2
                ? 2
                : trend.length - 1
        return trend[activeIdx] || trend[trend.length - 1]
    }, [trend, hoveredIndex, selectedIndex])

    // Fetch range data from backend
    const handleSelectRange = async (
        mode: '7d' | '30d' | '90d' | 'custom',
        startOverride?: string,
        endOverride?: string
    ) => {
        if (mode === '7d') {
            setRangeMode('7d')
            setShowCustomPicker(false)
            setHoveredIndex(null)
            return
        }

        const start = startOverride || customStart
        const end = endOverride || customEnd

        if (mode === 'custom') {
            if (!startOverride && !endOverride && !showCustomPicker) {
                setShowCustomPicker(true)
                return
            }
            if (start > end) {
                setCustomError('Start date must be before or equal to end date')
                return
            }
            setCustomError('')
        }

        const key = mode === 'custom' ? `${start}_${end}` : mode
        if (rangeCache[key]) {
            setRangeMode(mode)
            if (mode === 'custom') setShowCustomPicker(false)
            setHoveredIndex(null)
            return
        }

        setIsFetchingRange(true)
        try {
            let url = '/api/admin/logs?stats_only=true'
            if (mode === '30d') url += '&days=30'
            else if (mode === '90d') url += '&days=90'
            else if (mode === 'custom')
                url += `&startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`

            const res = await fetch(url, { cache: 'no-store' })
            const json = await res.json()
            if (json.status === 'success' && json.data?.stats) {
                setRangeCache((prev) => ({
                    ...prev,
                    [key]: json.data.stats,
                }))
                setRangeMode(mode)
                if (mode === 'custom') setShowCustomPicker(false)
                setHoveredIndex(null)
            }
        } catch (err) {
            console.error('Failed to fetch range stats:', err)
        } finally {
            setIsFetchingRange(false)
        }
    }

    // Export trend data as CSV
    const handleExportCsv = useCallback(() => {
        if (!trend || trend.length === 0) return
        const headers = ['Date', 'Day', 'Total Lookups', 'Verified Found', 'Not Found', 'Resolution Rate (%)']
        const rows = trend.map((d) => {
            const rate = d.total > 0 ? Math.round((d.found / d.total) * 100) : 0
            return [d.date, d.label, d.total, d.found, d.notFound, `${rate}%`]
        })
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `nepal-license-telemetry-${rangeMode}-${formatDateYMD(new Date())}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }, [trend, rangeMode])

    // Copy executive summary to clipboard
    const handleCopySummary = useCallback(() => {
        const currentStats = activeStats || stats
        const text = [
            `🇳🇵 Nepal License Verification Telemetry (${firstDate || 'Start'} to ${lastDate || 'Now'})`,
            `----------------------------------------------------`,
            `• All-Time Total Queries: ${currentStats ? currentStats.total.toLocaleString() : '—'}`,
            `• Period Verification Volume: ${totalPeriod.toLocaleString()} lookups`,
            `• Daily Average Volume: ${avgDaily.toLocaleString()} lookups/day`,
            `• Peak Activity Day: ${peakDay ? `${peakDay.label} (${peakDay.date}): ${peakDay.total} lookups` : '—'}`,
            `• Lowest Activity Day: ${lowestDay ? `${lowestDay.label} (${lowestDay.date}): ${lowestDay.total} lookups` : '—'}`,
            `• Verified Matches: ${foundPeriod.toLocaleString()} printed`,
            `• Unmatched Queries: ${notFoundPeriod.toLocaleString()} not found`,
            `• System Match Rate: ${currentStats ? `${currentStats.foundRate}%` : '—'} (${currentStats ? currentStats.found.toLocaleString() : 0} verified printed)`,
            `• Unique Client Network Origins: ${currentStats ? currentStats.uniqueIps.toLocaleString() : '—'} IPs`,
        ].join('\n')

        navigator.clipboard.writeText(text).then(() => {
            setCopiedSummary(true)
            setTimeout(() => setCopiedSummary(false), 2200)
        })
    }, [activeStats, stats, firstDate, lastDate, totalPeriod, avgDaily, peakDay, lowestDay, foundPeriod, notFoundPeriod])

    // Chart Dimensions (Optimized for smooth high-DPI rendering)
    const svgW = 740
    const svgH = 160
    const px = 32
    const pt = 18
    const pb = 28
    const usableW = svgW - 2 * px
    const usableH = svgH - pt - pb

    // Compute SVG coordinates and Catmull-Rom smooth paths
    const chartData = useMemo(() => {
        if (trend.length === 0) return null

        // 1. Total Volume Points
        const totalPts = trend.map((d, i) => ({
            x: px + (i / Math.max(1, trend.length - 1)) * usableW,
            y: pt + (1 - d.total / maxDay) * usableH,
        }))

        // 2. Verified Found Points
        const foundPts = trend.map((d, i) => ({
            x: px + (i / Math.max(1, trend.length - 1)) * usableW,
            y: pt + (1 - d.found / maxDay) * usableH,
        }))

        // 3. Resolution Rate Points (0-100% scale)
        const ratePts = trend.map((d, i) => {
            const pct = d.total > 0 ? (d.found / d.total) * 100 : 0
            return {
                x: px + (i / Math.max(1, trend.length - 1)) * usableW,
                y: pt + (1 - pct / 100) * usableH,
            }
        })

        const baseline = pt + usableH

        const totalLine = getCatmullRomPath(totalPts)
        const totalArea = `${totalLine} L ${totalPts[totalPts.length - 1].x.toFixed(1)} ${baseline.toFixed(1)} L ${totalPts[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`

        const foundLine = getCatmullRomPath(foundPts)
        const foundArea = `${foundLine} L ${foundPts[foundPts.length - 1].x.toFixed(1)} ${baseline.toFixed(1)} L ${foundPts[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`

        const rateLine = getCatmullRomPath(ratePts)
        const rateArea = `${rateLine} L ${ratePts[ratePts.length - 1].x.toFixed(1)} ${baseline.toFixed(1)} L ${ratePts[0].x.toFixed(1)} ${baseline.toFixed(1)} Z`

        return {
            totalPts,
            foundPts,
            ratePts,
            totalLine,
            totalArea,
            foundLine,
            foundArea,
            rateLine,
            rateArea,
            baseline,
        }
    }, [trend, maxDay, usableW, usableH, px, pt])

    const displayStats = activeStats || stats

    return (
        <section aria-label="Verification Intelligence & Telemetry" className="space-y-4 sm:space-y-5">
            {/* ── Section Header Toolbar ── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 3v18h18" />
                                <path d="m19 9-5 5-4-4-3 3" />
                            </svg>
                        </div>
                        <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
                            Verification Intelligence
                        </h2>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                            </span>
                            Live Telemetry
                        </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        Observability, DOTM match accuracy, and licensing office telemetry
                    </p>
                </div>

                {/* Quick Utility Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopySummary}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)]/80 bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition-all hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] active:scale-95 cursor-pointer"
                        title="Copy analytics summary to clipboard"
                    >
                        {copiedSummary ? (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                            </>
                        ) : (
                            <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                                <span>Copy Summary</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={trend.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)]/80 bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition-all hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 active:scale-95 cursor-pointer"
                        title="Export current trend dataset as CSV"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* ── Top Executive KPI Cards (4 Metric Grid) ── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* 1. Total Verification Queries */}
                <div className="dev-glass-card group relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs transition-all duration-300 hover:border-[var(--nepal-blue)]/50 hover:shadow-md">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-80" />
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Total Verifications
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between">
                        <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                            {displayStats ? displayStats.total.toLocaleString() : '—'}
                        </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>All-time verified queries</span>
                        <span className="font-mono font-medium text-[var(--text-secondary)]">
                            {totalPeriod > 0 ? `${totalPeriod.toLocaleString()} in view` : ''}
                        </span>
                    </div>
                </div>

                {/* 2. Today's Volume */}
                <div className="dev-glass-card group relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs transition-all duration-300 hover:border-sky-500/50 hover:shadow-md">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-80" />
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Today&apos;s Lookups
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--info-bg)] text-[var(--info-text)] border border-[var(--info-border)] shadow-2xs transition-transform duration-300 group-hover:scale-105">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between">
                        <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                            {displayStats ? displayStats.today.toLocaleString() : '—'}
                        </p>
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold font-mono ${
                            deltaYesterday.positive
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        }`}>
                            {deltaYesterday.positive ? '↑' : '↓'} {deltaYesterday.text.replace(' vs yesterday', '')}
                        </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">Since midnight local NPT (+05:45)</p>
                </div>

                {/* 3. Printed Resolution Rate */}
                <div className="dev-glass-card group relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs transition-all duration-300 hover:border-emerald-500/50 hover:shadow-md">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80" />
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Match Accuracy
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)] shadow-2xs transition-transform duration-300 group-hover:scale-105">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between">
                        <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                            {displayStats ? `${displayStats.foundRate}%` : '—'}
                        </p>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {displayStats ? displayStats.found.toLocaleString() : 0} printed
                        </span>
                    </div>
                    {/* Visual Segmented Progress Bar */}
                    <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                        <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${displayStats ? displayStats.foundRate : 0}%` }}
                            title={`Found: ${displayStats ? displayStats.foundRate : 0}%`}
                        />
                        <div
                            className="h-full bg-[var(--nepal-blue)]/50 transition-all duration-500"
                            style={{ width: `${displayStats ? 100 - displayStats.foundRate : 0}%` }}
                            title={`Not found: ${displayStats ? 100 - displayStats.foundRate : 0}%`}
                        />
                    </div>
                </div>

                {/* 4. Unique Client Network Origins */}
                <div className="dev-glass-card group relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs transition-all duration-300 hover:border-purple-500/50 hover:shadow-md">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-80" />
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Unique Clients
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-2xs transition-transform duration-300 group-hover:scale-105">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="2" y1="12" x2="22" y2="12" />
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between">
                        <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                            {displayStats ? displayStats.uniqueIps.toLocaleString() : '—'}
                        </p>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {displayStats && displayStats.uniqueIps > 0
                                ? `~${(displayStats.total / displayStats.uniqueIps).toFixed(1)} req/IP`
                                : ''}
                        </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">Distinct IP network addresses</p>
                </div>
            </div>

            {/* ── Unified Analytics Suite (Side-by-Side Line Graph on Left, Bar Chart on Right) ── */}
            <div className="space-y-4 sm:space-y-5">
                {/* Top Command Toolbar */}
                <div className="dev-glass-card relative overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs backdrop-blur-md transition-all">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-80" />

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Title & Date Scope */}
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 shadow-xs shrink-0">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M3 3v18h18" />
                                    <path d="m19 9-5 5-4-4-3 3" />
                                </svg>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
                                        Analytics
                                    </h3>
                                    {isFetchingRange ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--nepal-blue-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--nepal-blue)] animate-pulse">
                                            <svg className="animate-spin h-2.5 w-2.5" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                            </svg>
                                            Updating...
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Live Telemetry
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                    {firstDate && lastDate ? `${firstDate} — ${lastDate}` : 'Historical daily query activity'}
                                    {trend.length > 0 && ` (${trend.length} days plotted)`}
                                </p>
                            </div>
                        </div>

                        {/* Top Controls: Metric Focus + Time Horizon + Ledger Toggle */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                            {/* Metric Focus (Volume / Found / Rate) */}
                            <div className="inline-flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/80 p-0.5 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setMetricFocus('all')}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                                        metricFocus === 'all'
                                            ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs font-bold'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                    title="Show total verification volume"
                                >
                                    All Lookups
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMetricFocus('found')}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                                        metricFocus === 'found'
                                            ? 'bg-emerald-500 text-white shadow-xs font-bold'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                    title="Show verified found lookups only"
                                >
                                    Verified Only
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMetricFocus('rate')}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                                        metricFocus === 'rate'
                                            ? 'bg-purple-600 text-white shadow-xs font-bold'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                    title="Show match rate percentage trajectory"
                                >
                                    Match Rate %
                                </button>
                            </div>

                            {/* Time Horizon (7d / 30d / 90d / Custom) */}
                            <div className="inline-flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/80 p-0.5 shadow-2xs">
                                {(['7d', '30d', '90d'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => handleSelectRange(mode)}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase transition active:scale-95 cursor-pointer ${
                                            rangeMode === mode
                                                ? 'bg-[var(--nepal-blue)] text-white shadow-xs font-bold'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (rangeMode === 'custom') {
                                            setShowCustomPicker(!showCustomPicker)
                                        } else {
                                            setShowCustomPicker(true)
                                            setRangeMode('custom')
                                        }
                                    }}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                                        rangeMode === 'custom'
                                            ? 'bg-[var(--nepal-blue)] text-white shadow-xs font-bold'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    Custom
                                </button>
                            </div>

                            {/* Ledger Table Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowLedgerTable(!showLedgerTable)}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                                    showLedgerTable
                                        ? 'bg-[var(--nepal-blue)] text-white border-[var(--nepal-blue)] shadow-xs font-bold'
                                        : 'border-[var(--border-default)]/80 bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] shadow-2xs'
                                }`}
                                title={showLedgerTable ? 'Hide table' : 'Show table view'}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M3 12h18" />
                                    <path d="M3 18h18" />
                                </svg>
                                <span>Table</span>
                            </button>
                        </div>
                    </div>

                    {/* Custom Date Range Popover */}
                    {showCustomPicker && (
                        <div className="mt-3.5 rounded-xl border border-[var(--nepal-blue)]/30 bg-[var(--bg-secondary)]/90 p-3.5 shadow-lg backdrop-blur-md animate-in fade-in duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                                <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    Custom Analysis Window:
                                </span>
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                        <span>From:</span>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)] shadow-2xs"
                                        />
                                    </label>
                                    <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                        <span>To:</span>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 font-mono text-xs text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)] shadow-2xs"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectRange('custom', customStart, customEnd)}
                                        className="rounded-lg bg-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-dark)] px-3 py-1 font-semibold text-white shadow-xs transition active:scale-95 cursor-pointer text-xs"
                                    >
                                        Apply Range
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomPicker(false)}
                                        className="rounded-lg border border-[var(--border-default)] bg-transparent px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                            {customError && (
                                <p className="mt-2 text-xs font-semibold text-rose-500">
                                    {customError}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Micro Metric Telemetry Badges Strip */}
                    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3.5">
                        {/* 1. Period Volume */}
                        <div className="group relative overflow-hidden rounded-2xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/40 p-3.5 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-blue-500/50 hover:bg-[var(--bg-secondary)]/70 hover:shadow-xs">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Period Volume</span>
                                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px]">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                            </div>
                            <p className="mt-1 text-xl sm:text-2xl font-black font-mono tabular-nums text-[var(--text-primary)]">
                                {totalPeriod.toLocaleString()}
                            </p>
                            <p className="mt-0.5 text-[10.5px] text-[var(--text-muted)]">queries verified</p>
                        </div>

                        {/* 2. Daily Average */}
                        <div className="group relative overflow-hidden rounded-2xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/40 p-3.5 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-sky-500/50 hover:bg-[var(--bg-secondary)]/70 hover:shadow-xs">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-sky-500/70 to-transparent" />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Daily Average</span>
                                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px]">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="20" x2="18" y2="10" />
                                        <line x1="12" y1="20" x2="12" y2="4" />
                                        <line x1="6" y1="20" x2="6" y2="14" />
                                    </svg>
                                </div>
                            </div>
                            <p className="mt-1 text-xl sm:text-2xl font-black font-mono tabular-nums text-[var(--text-primary)]">
                                {avgDaily.toLocaleString()}
                            </p>
                            <p className="mt-0.5 text-[10.5px] text-[var(--text-muted)]">lookups / day</p>
                        </div>

                        {/* 3. Period Match Rate */}
                        <div className="group relative overflow-hidden rounded-2xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/40 p-3.5 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-emerald-500/50 hover:bg-[var(--bg-secondary)]/70 hover:shadow-xs">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent" />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Period Match Rate</span>
                                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                            </div>
                            <p className="mt-1 text-xl sm:text-2xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                                {periodFoundRate}%
                            </p>
                            <p className="mt-0.5 text-[10.5px] text-[var(--text-muted)] truncate">{foundPeriod.toLocaleString()} printed records</p>
                        </div>

                        {/* 4. Peak Day Activity */}
                        <div className="group relative overflow-hidden rounded-2xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/40 p-3.5 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-purple-500/50 hover:bg-[var(--bg-secondary)]/70 hover:shadow-xs">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500/70 to-transparent" />
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Peak Day Activity</span>
                                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px]">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                    </svg>
                                </div>
                            </div>
                            <p className="mt-1 text-xl sm:text-2xl font-black font-mono tabular-nums text-[var(--text-primary)] truncate">
                                {peakDay ? peakDay.total.toLocaleString() : 0}
                            </p>
                            <p className="mt-0.5 text-[10.5px] text-[var(--text-muted)] truncate">
                                {peakDay ? `${peakDay.label} (${peakDay.date})` : '—'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Side-by-Side Dual Analytics Stage (Line Graph on Left, Bar Chart on Right) ── */}
                {trend.length === 0 ? (
                    <div className="dev-glass-card flex h-56 flex-col items-center justify-center gap-2 rounded-2xl sm:rounded-3xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-6 text-center text-xs text-[var(--text-muted)]">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                            <rect width="18" height="18" x="3" y="3" rx="2" />
                            <path d="M3 9h18" />
                            <path d="M9 21V9" />
                        </svg>
                        <p className="font-medium text-[var(--text-secondary)]">No telemetry records available for this period</p>
                        <p className="text-[11px]">Select another time horizon or custom date range</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 sm:gap-5">
                        {/* ── Left Column: Line Graph (Trajectory & Trend) ── */}
                        <div className="dev-glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-blue-500/40 hover:shadow-md">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" />

                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-[var(--border-default)]/60 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 3v18h18" />
                                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                            Verification Trajectory
                                        </h4>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            Continuous volume spline & verification momentum
                                        </p>
                                    </div>
                                </div>

                                {/* Legend Pills */}
                                <div className="flex items-center gap-2">
                                    {metricFocus === 'all' && (
                                        <>
                                            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--nepal-blue)]" />
                                                Total
                                            </span>
                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                Verified
                                            </span>
                                        </>
                                    )}
                                    {metricFocus === 'found' && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Verified Only
                                        </span>
                                    )}
                                    {metricFocus === 'rate' && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                            Match Rate %
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stage: SVG Line Chart */}
                            <div className="relative w-full pt-3 pb-1">
                                {chartData && (
                                    <svg
                                        viewBox={`0 0 ${svgW} ${svgH}`}
                                        className="w-full h-52 sm:h-60 overflow-visible select-none"
                                        preserveAspectRatio="none"
                                    >
                                        <defs>
                                            <linearGradient id="nlcBlueGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="var(--nepal-blue)" stopOpacity="0.32" />
                                                <stop offset="100%" stopColor="var(--nepal-blue)" stopOpacity="0.0" />
                                            </linearGradient>

                                            <linearGradient id="nlcGreenGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                                                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                                            </linearGradient>

                                            <linearGradient id="nlcRateGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.38" />
                                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Horizontal Gridlines */}
                                        <line x1={px} y1={pt} x2={svgW - px} y2={pt} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" className="text-[var(--text-muted)]" />
                                        <line x1={px} y1={pt + usableH / 2} x2={svgW - px} y2={pt + usableH / 2} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" className="text-[var(--text-muted)]" />
                                        <line x1={px} y1={pt + usableH} x2={svgW - px} y2={pt + usableH} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" className="text-[var(--text-muted)]" />

                                        {/* Dashed Average Line */}
                                        {metricFocus !== 'rate' && maxDay > 0 && (
                                            <g>
                                                <line
                                                    x1={px}
                                                    y1={pt + (1 - avgDaily / maxDay) * usableH}
                                                    x2={svgW - px}
                                                    y2={pt + (1 - avgDaily / maxDay) * usableH}
                                                    stroke="currentColor"
                                                    strokeOpacity="0.35"
                                                    strokeDasharray="4 4"
                                                    strokeWidth="1.2"
                                                    className="text-[var(--text-muted)]"
                                                />
                                                <text
                                                    x={svgW - px - 4}
                                                    y={pt + (1 - avgDaily / maxDay) * usableH - 4}
                                                    textAnchor="end"
                                                    className="text-[9px] font-mono fill-[var(--text-muted)] font-semibold"
                                                >
                                                    Avg: {avgDaily}
                                                </text>
                                            </g>
                                        )}

                                        {/* Area & Curves */}
                                        {metricFocus === 'all' && (
                                            <>
                                                <path d={chartData.totalArea} fill="url(#nlcBlueGrad)" />
                                                <path d={chartData.totalLine} fill="none" stroke="var(--nepal-blue)" strokeWidth="2.8" strokeLinecap="round" />
                                                <path d={chartData.foundArea} fill="url(#nlcGreenGrad)" />
                                                <path d={chartData.foundLine} fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" />
                                            </>
                                        )}
                                        {metricFocus === 'found' && (
                                            <>
                                                <path d={chartData.foundArea} fill="url(#nlcGreenGrad)" />
                                                <path d={chartData.foundLine} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                                            </>
                                        )}
                                        {metricFocus === 'rate' && (
                                            <>
                                                <path d={chartData.rateArea} fill="url(#nlcRateGrad)" />
                                                <path d={chartData.rateLine} fill="none" stroke="#8b5cf6" strokeWidth="3" strokeLinecap="round" />
                                            </>
                                        )}

                                        {/* Hover Crosshair */}
                                        {hoveredIndex !== null && chartData.totalPts[hoveredIndex] && (
                                            <line
                                                x1={chartData.totalPts[hoveredIndex].x}
                                                y1={pt}
                                                x2={chartData.totalPts[hoveredIndex].x}
                                                y2={pt + usableH}
                                                stroke="var(--nepal-blue)"
                                                strokeOpacity="0.5"
                                                strokeDasharray="3 3"
                                                strokeWidth="1.5"
                                            />
                                        )}

                                        {/* Data Points */}
                                        {metricFocus === 'all' &&
                                            chartData.totalPts.map((p, i) => (
                                                <circle
                                                    key={`tot-${i}`}
                                                    cx={p.x}
                                                    cy={p.y}
                                                    r={hoveredIndex === i || selectedIndex === i ? 6 : 3.4}
                                                    fill="var(--surface-primary)"
                                                    stroke="var(--nepal-blue)"
                                                    strokeWidth={hoveredIndex === i || selectedIndex === i ? 3 : 2}
                                                    className="transition-all duration-150"
                                                />
                                            ))}
                                        {chartData.foundPts.map((p, i) => (
                                            <circle
                                                key={`fnd-${i}`}
                                                cx={p.x}
                                                cy={metricFocus === 'rate' ? chartData.ratePts[i].y : p.y}
                                                r={hoveredIndex === i || selectedIndex === i ? 5.5 : 3}
                                                fill="var(--surface-primary)"
                                                stroke={metricFocus === 'rate' ? '#8b5cf6' : '#10b981'}
                                                strokeWidth={hoveredIndex === i || selectedIndex === i ? 2.8 : 1.8}
                                                className="transition-all duration-150"
                                            />
                                        ))}

                                        {/* X-Axis Date Labels */}
                                        {trend.map((day, i) => {
                                            const showX =
                                                trend.length <= 10 ||
                                                i === 0 ||
                                                i === trend.length - 1 ||
                                                i % Math.ceil(trend.length / 7) === 0
                                            if (!showX) return null
                                            const x = px + (i / Math.max(1, trend.length - 1)) * usableW
                                            const isActive = hoveredIndex === i || selectedIndex === i

                                            return (
                                                <text
                                                    key={`lbl-${i}`}
                                                    x={x}
                                                    y={svgH - 8}
                                                    textAnchor="middle"
                                                    className={`text-[10px] font-mono transition ${
                                                        isActive
                                                            ? 'fill-[var(--text-primary)] font-bold'
                                                            : 'fill-[var(--text-muted)] font-normal'
                                                    }`}
                                                >
                                                    {day.label}
                                                </text>
                                            )
                                        })}

                                        {/* Hover Target Overlay Columns */}
                                        {trend.map((_, i) => {
                                            const colW = usableW / Math.max(1, trend.length - 1)
                                            const colX = px + i * colW - colW / 2
                                            return (
                                                <rect
                                                    key={`hit-${i}`}
                                                    x={colX}
                                                    y={0}
                                                    width={colW}
                                                    height={svgH}
                                                    fill="transparent"
                                                    className="cursor-pointer"
                                                    onMouseEnter={() => setHoveredIndex(i)}
                                                    onMouseLeave={() => setHoveredIndex(null)}
                                                    onClick={() => setSelectedIndex(i)}
                                                />
                                            )
                                        })}
                                    </svg>
                                )}
                            </div>

                            {/* Card Footer Micro-Bar */}
                            <div className="mt-2 flex items-center justify-between border-t border-[var(--border-default)]/40 pt-2.5 text-[11px] text-[var(--text-muted)] font-mono">
                                <span>Start: {firstDate || '—'}</span>
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                    Peak: {peakDay ? `${peakDay.total} (${peakDay.label})` : '—'}
                                </span>
                                <span>Latest: {lastDate || '—'}</span>
                            </div>
                        </div>

                        {/* ── Right Column: Bar Chart (Daily Distribution Breakdown) ── */}
                        <div className="dev-glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:shadow-md">
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent" />

                            {/* Card Header */}
                            <div className="flex items-center justify-between border-b border-[var(--border-default)]/60 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="12" width="4" height="9" rx="1" />
                                            <rect x="10" y="6" width="4" height="15" rx="1" />
                                            <rect x="17" y="3" width="4" height="18" rx="1" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                            Daily Breakdown
                                        </h4>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            Pillar telemetry & resolution per weekday
                                        </p>
                                    </div>
                                </div>

                                {/* Micro stat pill */}
                                <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/50 px-2.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]">
                                    <span>Avg:</span>
                                    <strong className="text-[var(--text-primary)] font-bold">{avgDaily}</strong>
                                    <span className="text-[var(--text-muted)]">/day</span>
                                </div>
                            </div>

                            {/* Stage: Bars Chart */}
                            <div className="relative w-full pt-3 pb-1">
                                {/* Dashed Average Baseline */}
                                {maxDay > 0 && metricFocus !== 'rate' && (
                                    <div
                                        className="absolute inset-x-0 border-t border-dashed border-[var(--text-muted)]/40 pointer-events-none z-10 transition-all duration-300"
                                        style={{ bottom: `${38 + Math.round((avgDaily / maxDay) * 180)}px` }}
                                    >
                                        <span className="absolute right-2 -top-5 rounded-md bg-[var(--surface-primary)] px-2 py-0.5 font-mono text-[9px] font-bold text-[var(--text-muted)] border border-[var(--border-default)]/70 shadow-2xs">
                                            Avg: {avgDaily.toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                <div
                                    className={`relative z-0 flex items-end justify-between ${
                                        trend.length > 14
                                            ? 'gap-1 px-1 overflow-x-auto no-scrollbar'
                                            : 'gap-2 sm:gap-3 px-1'
                                    }`}
                                >
                                    {trend.map((day, i) => {
                                        const BAR_STAGE_H = 180
                                        const isHovered = hoveredIndex === i
                                        const isSelected = selectedIndex === i
                                        const isActive = isHovered || isSelected

                                        const rate = day.total > 0 ? Math.round((day.found / day.total) * 100) : 0
                                        const maxFound = Math.max(1, ...trend.map((d) => d.found))

                                        let barHeightPx = 6
                                        let foundHeightPx = 0
                                        let notFoundHeightPx = 0

                                        if (metricFocus === 'rate') {
                                            barHeightPx = day.total > 0 ? Math.max(10, Math.round((rate / 100) * BAR_STAGE_H)) : 6
                                        } else if (metricFocus === 'found') {
                                            barHeightPx = maxFound > 0 ? Math.max(day.found > 0 ? 10 : 6, Math.round((day.found / maxFound) * BAR_STAGE_H)) : 6
                                            foundHeightPx = barHeightPx
                                        } else {
                                            // 'all' lookups stacked
                                            barHeightPx = maxDay > 0 ? Math.max(day.total > 0 ? 14 : 6, Math.round((day.total / maxDay) * BAR_STAGE_H)) : 6
                                            foundHeightPx = day.total > 0 ? Math.round((day.found / day.total) * barHeightPx) : 0
                                            notFoundHeightPx = Math.max(0, barHeightPx - foundHeightPx)
                                        }

                                        const showTopCount =
                                            trend.length <= 14 || isActive || i === 0 || i === trend.length - 1
                                        const showBottomLabel =
                                            trend.length <= 14 ||
                                            isActive ||
                                            i % Math.ceil(trend.length / 7) === 0 ||
                                            i === trend.length - 1

                                        const topDisplayValue =
                                            metricFocus === 'rate'
                                                ? `${rate}%`
                                                : metricFocus === 'found'
                                                ? day.found.toLocaleString()
                                                : day.total.toLocaleString()

                                        return (
                                            <div
                                                key={i}
                                                onMouseEnter={() => setHoveredIndex(i)}
                                                onMouseLeave={() => setHoveredIndex(null)}
                                                onClick={() => setSelectedIndex(i)}
                                                className="group/pillar relative flex flex-1 flex-col items-center gap-2 min-w-[28px] sm:min-w-[36px] cursor-pointer"
                                            >
                                                {/* Top Value Label Badge */}
                                                <div
                                                    className={`h-5 flex items-center justify-center font-mono tabular-nums text-[11px] transition-all duration-200 ${
                                                        isActive
                                                            ? 'scale-105 font-bold text-[var(--text-primary)]'
                                                            : 'font-semibold text-[var(--text-muted)]'
                                                    } ${showTopCount ? 'opacity-100' : 'opacity-0'}`}
                                                >
                                                    <span
                                                        className={`rounded-md px-1.5 py-0.5 ${
                                                            isActive
                                                                ? 'bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-xs text-[var(--text-primary)]'
                                                                : ''
                                                        }`}
                                                    >
                                                        {topDisplayValue}
                                                    </span>
                                                </div>

                                                {/* Vertical Pillar Track */}
                                                <div
                                                    className={`relative flex flex-col justify-end w-full max-w-[42px] sm:max-w-[46px] h-[180px] rounded-2xl p-1 transition-all duration-200 ${
                                                        isActive
                                                            ? 'bg-[var(--bg-secondary)] border-2 border-[var(--nepal-blue)] shadow-md shadow-[var(--nepal-blue)]/20 scale-[1.02]'
                                                            : 'bg-[var(--bg-secondary)]/50 border border-[var(--border-default)]/70 hover:border-[var(--nepal-blue)]/40 hover:bg-[var(--bg-secondary)]/80'
                                                    }`}
                                                >
                                                    {/* Inner Bar Fill */}
                                                    <div
                                                        className={`w-full flex flex-col justify-end overflow-hidden rounded-xl transition-all duration-300 ${
                                                            hoveredIndex !== null && !isActive ? 'opacity-50' : 'opacity-100'
                                                        }`}
                                                        style={{ height: `${barHeightPx}px` }}
                                                    >
                                                        {day.total === 0 && metricFocus !== 'rate' ? (
                                                            <div className="w-full h-2 rounded-full bg-[var(--border-default)]" />
                                                        ) : metricFocus === 'rate' ? (
                                                            /* Match Rate Bar */
                                                            <div
                                                                className="w-full h-full rounded-xl bg-gradient-to-t from-purple-600 via-purple-500 to-violet-400 shadow-xs shadow-purple-500/25"
                                                                title={`Match Rate: ${rate}%`}
                                                            />
                                                        ) : metricFocus === 'found' ? (
                                                            /* Found Lookups Bar */
                                                            <div
                                                                className="w-full h-full rounded-xl bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 shadow-xs shadow-emerald-500/25"
                                                                title={`Printed Found: ${day.found}`}
                                                            />
                                                        ) : (
                                                            /* Stacked Volume Bar (All Lookups) */
                                                            <div className="w-full h-full flex flex-col justify-end rounded-xl overflow-hidden">
                                                                {notFoundHeightPx > 0 && (
                                                                    <div
                                                                        className="w-full bg-gradient-to-t from-blue-600 via-blue-500 to-sky-400 transition-colors"
                                                                        style={{
                                                                            height: `${notFoundHeightPx}px`,
                                                                            borderTopLeftRadius: '10px',
                                                                            borderTopRightRadius: '10px',
                                                                            borderBottomLeftRadius: foundHeightPx > 0 ? '0' : '10px',
                                                                            borderBottomRightRadius: foundHeightPx > 0 ? '0' : '10px',
                                                                        }}
                                                                        title={`Unmatched: ${day.notFound}`}
                                                                    />
                                                                )}
                                                                {foundHeightPx > 0 && (
                                                                    <div
                                                                        className="w-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 transition-colors"
                                                                        style={{
                                                                            height: `${foundHeightPx}px`,
                                                                            borderBottomLeftRadius: '10px',
                                                                            borderBottomRightRadius: '10px',
                                                                            borderTopLeftRadius: notFoundHeightPx > 0 ? '0' : '10px',
                                                                            borderTopRightRadius: notFoundHeightPx > 0 ? '0' : '10px',
                                                                        }}
                                                                        title={`Printed Found: ${day.found}`}
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Bottom Day Label */}
                                                <div className="flex flex-col items-center">
                                                    <span
                                                        className={`text-[11px] font-mono transition-colors ${
                                                            isActive
                                                                ? 'text-[var(--text-primary)] font-bold'
                                                                : 'text-[var(--text-muted)] font-medium'
                                                        } ${showBottomLabel ? 'opacity-100' : 'opacity-0'}`}
                                                    >
                                                        {day.label}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Card Footer Micro-Bar */}
                            <div className="mt-2 flex items-center justify-between border-t border-[var(--border-default)]/40 pt-2.5 text-[11px] text-[var(--text-muted)] font-mono">
                                <span>Verified: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{foundPeriod.toLocaleString()}</strong></span>
                                <span>Resolution: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{periodFoundRate}%</strong></span>
                                <span>Days Plotted: <strong className="text-[var(--text-primary)] font-bold">{trend.length}</strong></span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Active Inspection Capsule Bar (Dynamic Island) ── */}
                {activeInspection && (
                    <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-3 sm:px-4 sm:py-3 text-xs shadow-xs backdrop-blur-md transition-all">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/60 px-2.5 py-1 text-xs font-bold text-[var(--text-primary)]">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--nepal-blue)] opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--nepal-blue)]" />
                                </span>
                                {activeInspection.label}, {activeInspection.date}
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/40 px-2.5 py-1 font-mono text-xs text-[var(--text-secondary)]">
                                <span className="text-[var(--text-muted)]">Total:</span>
                                <strong className="font-bold text-[var(--text-primary)]">
                                    {activeInspection.total.toLocaleString()}
                                </strong>
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <span>{activeInspection.found.toLocaleString()} printed</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                                <span>{activeInspection.notFound.toLocaleString()} unmatched</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/40 px-2.5 py-1">
                                <span className="text-[11px] font-medium text-[var(--text-muted)]">Match Rate:</span>
                                <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {activeInspection.total > 0
                                        ? Math.round((activeInspection.found / activeInspection.total) * 100)
                                        : 0}
                                    %
                                </span>
                            </div>
                            {selectedIndex !== null ? (
                                <button
                                    type="button"
                                    onClick={() => setSelectedIndex(null)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                                    title="Unlock inspection to follow cursor"
                                >
                                    <span>Reset Pin</span>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            ) : (
                                <span className="text-[11px] text-[var(--text-muted)] hidden md:inline">
                                    Click any day to lock
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Collapsible Ledger Table View ── */}
                {showLedgerTable && (
                    <div className="dev-glass-card rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-4 shadow-sm backdrop-blur-md animate-in fade-in duration-200">
                        <div className="flex items-center justify-between border-b border-[var(--border-default)]/60 pb-3 mb-3">
                            <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] font-bold text-xs">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18" />
                                        <path d="M3 12h18" />
                                        <path d="M3 18h18" />
                                    </svg>
                                </div>
                                <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                    Historical Query Table
                                </h4>
                            </div>
                            <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                {trend.length} records in scope
                            </span>
                        </div>

                        <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/30 shadow-2xs">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="sticky top-0 z-10 bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border-default)]">
                                    <tr>
                                        <th className="py-2.5 px-3.5">Date & Weekday</th>
                                        <th className="py-2.5 px-3.5 text-right">Total Lookups</th>
                                        <th className="py-2.5 px-3.5 text-right">Printed (Found)</th>
                                        <th className="py-2.5 px-3.5 text-right">Not Found</th>
                                        <th className="py-2.5 px-3.5 text-right">Resolution Rate</th>
                                        <th className="py-2.5 px-3.5 text-right">Daily Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-default)]/50 font-mono text-[var(--text-secondary)]">
                                    {[...trend].reverse().map((day, i) => {
                                        const rate =
                                            day.total > 0
                                                ? Math.round((day.found / day.total) * 100)
                                                : 0
                                        const share =
                                            totalPeriod > 0
                                                ? Math.round((day.total / totalPeriod) * 100)
                                                : 0

                                        return (
                                            <tr
                                                key={i}
                                                onClick={() => {
                                                    const originalIndex = trend.findIndex(
                                                        (t) => t.date === day.date
                                                    )
                                                    if (originalIndex !== -1)
                                                        setSelectedIndex(originalIndex)
                                                }}
                                                className="hover:bg-[var(--bg-secondary)]/60 transition cursor-pointer"
                                            >
                                                <td className="py-2.5 px-3.5 font-sans font-medium text-[var(--text-primary)]">
                                                    <span className="font-semibold">{day.date}</span>{' '}
                                                    <span className="text-[var(--text-muted)] text-[11px]">
                                                        ({day.label})
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right font-bold text-[var(--text-primary)]">
                                                    {day.total.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    {day.found.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right text-[var(--nepal-blue)]">
                                                    {day.notFound.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right">
                                                    <span
                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                            rate >= 75
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                : rate >= 50
                                                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        {rate}%
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3.5 text-right text-[var(--text-muted)] text-[11px]">
                                                    {share}%
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

        </section>
    )
}
