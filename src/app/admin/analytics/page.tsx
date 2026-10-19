'use client'

import { SearchStats } from '../types'
import { getFlag, maskLicenseNumber, maskIpAddress } from '../helpers'

export interface AdminAnalyticsProps {
    stats?: SearchStats | null
    privacyMode?: boolean
    setActiveTab?: (tab: 'searches' | 'notifications' | 'feedback') => void
    setSearchFilter?: (filter: string) => void
    setPage?: (page: number) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminAnalytics(props: any) {
    const {
        stats = null,
        privacyMode = true,
        setActiveTab = () => {},
        setSearchFilter = () => {},
        setPage = () => {},
    }: AdminAnalyticsProps = props || {}
    return (
        <section aria-label="Analytics & Insights">
            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {/* Total Searches */}
                <div className="dev-glass-card hover-lift relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-80" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Total Searches</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-2xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {stats ? stats.total.toLocaleString() : '—'}
                    </p>
                    <p className="mt-1 text-[10.5px] sm:text-[11px] text-[var(--text-muted)]">All-time recorded queries</p>
                </div>

                {/* Today's Searches */}
                <div className="dev-glass-card hover-lift relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-80" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Today</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--info-bg)] text-[var(--info-text)] shadow-2xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {stats ? stats.today.toLocaleString() : '—'}
                    </p>
                    <p className="mt-1 text-[10.5px] sm:text-[11px] text-[var(--text-muted)]">Since midnight local</p>
                </div>

                {/* Found Success Rate */}
                <div className="dev-glass-card hover-lift relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--success)] to-transparent opacity-80" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Found Rate</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--success-bg)] text-[var(--success)] shadow-2xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--success)]">
                            {stats ? `${stats.foundRate}%` : '—'}
                        </p>
                        <span className="text-[10px] sm:text-xs font-mono text-[var(--text-muted)]">
                            ({stats ? stats.found.toLocaleString() : 0} printed)
                        </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[var(--success)] transition-all duration-500"
                            style={{ width: `${stats ? stats.foundRate : 0}%` }}
                        />
                    </div>
                </div>

                {/* Unique Visitors / IPs */}
                <div className="dev-glass-card hover-lift relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-80" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Unique IPs</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shadow-2xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {stats ? stats.uniqueIps.toLocaleString() : '—'}
                    </p>
                    <p className="mt-1 text-[10.5px] sm:text-[11px] text-[var(--text-muted)]">Unique searcher addresses</p>
                </div>
            </div>

            {/* Top Locations Bar */}
            {stats && stats.topLocations.length > 0 && (
                <div className="dev-glass-card mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-3 sm:p-4 shadow-sm backdrop-blur-md">
                    <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]" aria-hidden="true">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>Top Search Origins:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {stats.topLocations.map((loc, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    setSearchFilter(loc.city === 'Unknown' ? '' : loc.city)
                                    setPage(1)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/70 px-2.5 py-1 text-xs font-medium transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer shadow-2xs"
                            >
                                <span>{getFlag(loc.country)}</span>
                                <span className="font-semibold">{loc.city}</span>
                                <span className="rounded-full bg-[var(--surface-primary)] px-1.5 py-0.2 text-[10px] text-[var(--text-muted)] font-mono tabular-nums font-bold">
                                    {loc.count.toLocaleString()}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Analytics & Search Insights Grid (7-Day Volume, Top Licenses & IPs, Top Offices) */}
            {stats && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
                    {/* 1. 7-Day Search Volume Sparkline */}
                    <div className="dev-glass-card flex flex-col justify-between rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md">
                        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-default)]/50 pb-3">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    7-Day Search Volume
                                </h3>
                                <p className="text-[11px] text-[var(--text-muted)]">
                                    Daily queries (Found vs Not Found)
                                </p>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-semibold shrink-0">
                                <span className="inline-flex items-center gap-1 text-[var(--success)]">
                                    <span className="h-2 w-2 rounded-xs bg-[var(--success)]" />
                                    Found
                                </span>
                                <span className="inline-flex items-center gap-1 text-[var(--nepal-blue)]">
                                    <span className="h-2 w-2 rounded-xs bg-[var(--nepal-blue)]/60" />
                                    Not Found
                                </span>
                            </div>
                        </div>

                        {stats.dailyTrend && stats.dailyTrend.length > 0 ? (
                            (() => {
                                const maxDay = Math.max(
                                    1,
                                    ...stats.dailyTrend.map((d) => d.total)
                                )
                                return (
                                    <div className="mt-4 flex h-32 items-end justify-between gap-1.5 sm:gap-2 pt-4">
                                        {stats.dailyTrend.map((day, i) => {
                                            const totalPct = Math.max(
                                                day.total > 0 ? 12 : 4,
                                                Math.round((day.total / maxDay) * 100)
                                            )
                                            const foundPct =
                                                day.total > 0
                                                    ? Math.round((day.found / day.total) * 100)
                                                    : 0
                                            return (
                                                <div
                                                    key={i}
                                                    className="group flex flex-1 flex-col items-center gap-1.5 h-full justify-end min-w-0"
                                                    title={`${day.date}: ${day.total} total (${day.found} found, ${day.notFound} not found)`}
                                                >
                                                    <span className="font-mono tabular-nums text-[9.5px] sm:text-[10px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition">
                                                        {day.total}
                                                    </span>
                                                    <div className="relative flex w-full max-w-[28px] flex-1 items-end overflow-hidden rounded-xl bg-[var(--bg-secondary)]/70 shadow-2xs">
                                                        <div
                                                            className="flex w-full flex-col justify-end overflow-hidden rounded-xl transition-all duration-500"
                                                            style={{ height: `${totalPct}%` }}
                                                        >
                                                            <div
                                                                className="w-full bg-gradient-to-t from-[var(--nepal-blue)]/50 to-[var(--nepal-blue)]/70 transition-all"
                                                                style={{ height: `${100 - foundPct}%` }}
                                                            />
                                                            <div
                                                                className="w-full bg-gradient-to-t from-emerald-600 to-[var(--success)] transition-all"
                                                                style={{ height: `${foundPct}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <span className={`text-[9.5px] sm:text-[10px] font-semibold truncate ${day.label === 'Today' ? 'font-bold text-[var(--nepal-blue)]' : 'text-[var(--text-muted)]'}`}>
                                                        {day.label}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })()
                        ) : (
                            <div className="mt-4 flex h-32 items-center justify-center text-xs text-[var(--text-muted)]">
                                No daily trend data recorded yet
                            </div>
                        )}
                    </div>

                    {/* 2. Top Repeated Licenses & Active IPs */}
                    <div className="dev-glass-card rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md">
                        <div className="flex items-center justify-between border-b border-[var(--border-default)]/50 pb-3">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Repeated Licenses & Top IPs
                                </h3>
                                <p className="text-[11px] text-[var(--text-muted)]">
                                    Most frequent lookups & traffic sources
                                </p>
                            </div>
                        </div>

                        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                            {/* Top Licenses */}
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    Top Licenses
                                </span>
                                <div className="mt-2 space-y-1.5">
                                    {stats.topLicenses && stats.topLicenses.length > 0 ? (
                                        stats.topLicenses.slice(0, 4).map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    if (!privacyMode) {
                                                        setActiveTab('searches')
                                                        setSearchFilter(item.license_number)
                                                        setPage(1)
                                                    }
                                                }}
                                                className="flex w-full items-center justify-between rounded-xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/50 px-2.5 py-1.5 text-left text-[11px] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--surface-primary)] active:scale-98 cursor-pointer shadow-2xs"
                                                title={privacyMode ? 'Disable Privacy Mode to filter by this license' : `Filter by ${item.license_number}`}
                                            >
                                                <span className="flex items-center gap-1.5 truncate font-mono font-semibold text-[var(--text-primary)]">
                                                    <span
                                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                                            item.status === 'found' ? 'bg-[var(--success)]' : 'bg-gray-400'
                                                        }`}
                                                    />
                                                    <span className="truncate">
                                                        {maskLicenseNumber(item.license_number, privacyMode)}
                                                    </span>
                                                </span>
                                                <span className="ml-1 shrink-0 rounded-md bg-[var(--surface-primary)] px-1.5 py-0.2 font-mono tabular-nums text-[10px] font-bold text-[var(--text-secondary)] border border-[var(--border-default)]/50">
                                                    {item.count}×
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-[11px] text-[var(--text-muted)] italic">No data</p>
                                    )}
                                </div>
                            </div>

                            {/* Top IPs */}
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    Most Active IPs
                                </span>
                                <div className="mt-2 space-y-1.5">
                                    {stats.topIps && stats.topIps.length > 0 ? (
                                        stats.topIps.slice(0, 4).map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    if (!privacyMode) {
                                                        setActiveTab('searches')
                                                        setSearchFilter(item.ip)
                                                        setPage(1)
                                                    }
                                                }}
                                                className="flex w-full items-center justify-between rounded-xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/50 px-2.5 py-1.5 text-left text-[11px] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--surface-primary)] active:scale-98 cursor-pointer shadow-2xs"
                                                title={privacyMode ? 'Disable Privacy Mode to filter by this IP' : `Filter by ${item.ip} (${item.city})`}
                                            >
                                                <span className="flex items-center gap-1 truncate font-mono text-[var(--text-secondary)]">
                                                    <span className="truncate">
                                                        {maskIpAddress(item.ip, privacyMode)}
                                                    </span>
                                                </span>
                                                <span className="ml-1 shrink-0 rounded-md bg-[var(--surface-primary)] px-1.5 py-0.2 font-mono tabular-nums text-[10px] font-bold text-[var(--text-secondary)] border border-[var(--border-default)]/50">
                                                    {item.count}×
                                                </span>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-[11px] text-[var(--text-muted)] italic">No data</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Top Issuing Offices Breakdown */}
                    <div className="dev-glass-card rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md">
                        <div className="flex items-center justify-between border-b border-[var(--border-default)]/50 pb-3">
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Top Issuing Offices
                                </h3>
                                <p className="text-[11px] text-[var(--text-muted)]">
                                    Most matched DOTM transport offices
                                </p>
                            </div>
                        </div>

                        <div className="mt-3.5 space-y-2.5">
                            {stats.topOffices && stats.topOffices.length > 0 ? (
                                (() => {
                                    const maxOfficeCount = Math.max(
                                        1,
                                        ...stats.topOffices.map((o) => o.count)
                                    )
                                    return stats.topOffices.slice(0, 4).map((item, idx) => {
                                        const pct = Math.max(
                                            8,
                                            Math.round((item.count / maxOfficeCount) * 100)
                                        )
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setActiveTab('searches')
                                                    setSearchFilter(item.office)
                                                    setPage(1)
                                                }}
                                                className="block w-full text-left group cursor-pointer"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="truncate font-semibold text-[var(--text-primary)] group-hover:text-[var(--nepal-blue)] transition">
                                                        {item.office}
                                                    </span>
                                                    <span className="ml-2 shrink-0 font-mono tabular-nums text-[11px] font-bold text-[var(--text-secondary)]">
                                                        {item.count.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-[var(--nepal-blue)] to-sky-500 transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </button>
                                        )
                                    })
                                })()
                            ) : (
                                <div className="flex h-28 items-center justify-center text-xs text-[var(--text-muted)]">
                                    No printed office matches recorded yet
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
