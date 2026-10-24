'use client'

import { AdminScraperData } from '../types'
import {
    DEFAULT_CRON_SCHEDULE,
    formatCronTimeNPT,
    formatNepalDateTime,
    formatTimeUntil,
} from '@/lib/cronHelper'
import { formatTimeAgo } from '../helpers'

export interface AdminAutomationProps {
    scraperData?: AdminScraperData | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminAutomation(props: any) {
    const {
        scraperData = null,
    }: AdminAutomationProps = props || {}
    return (
        <section
            aria-label="DOTM Automation & Scraper Status Monitor"
            className="mt-4 sm:mt-5 relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs"
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-80" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-default)]/60 pb-4">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-2xs">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                            <path d="M16 21h5v-5" />
                        </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-bold text-[var(--text-primary)] sm:text-base">
                                DOTM Scraper & Cron Monitor
                            </h2>
                            <span className="rounded-full bg-[var(--bg-secondary)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--text-muted)] border border-[var(--border-default)] shadow-2xs">
                                dotm-scraper-cron.yml
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)] leading-relaxed">
                            Automated PDF indexer mirroring Department of Transport Management print records
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href="https://github.com/NischalAcharya060/Nepal-License-Checker/actions/workflows/dotm-scraper-cron.yml"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] sm:min-h-0 w-full sm:w-auto justify-center items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/80 px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 shadow-2xs cursor-pointer"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span>GitHub Actions Workflow</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="7" y1="17" x2="17" y2="7" />
                            <polyline points="7 7 17 7 17 17" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* 3 Metric Summary Boxes */}
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {/* Next Scheduled Run */}
                <div className="rounded-xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50 p-3.5 sm:p-4 shadow-2xs hover:border-[var(--nepal-blue)]/30 transition">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Next Scheduled Run</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-xs font-bold text-[var(--nepal-blue)]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                            </svg>
                            {scraperData?.nextRun?.timestamp
                                ? formatTimeUntil(scraperData.nextRun.timestamp, 'en')
                                : 'Scheduled'}
                        </span>
                    </div>
                    <p className="mt-2 text-base font-bold text-[var(--text-primary)]">
                        {scraperData?.nextRun?.timestamp
                            ? formatNepalDateTime(scraperData.nextRun.timestamp, 'en')
                            : 'Awaiting sync'}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                        <span>Cron:</span>
                        <code className="rounded bg-[var(--surface-primary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] border border-[var(--border-default)]/60">
                            {scraperData?.schedule || DEFAULT_CRON_SCHEDULE}
                        </code>
                        <span className="text-[10px] text-[var(--text-muted)]">
                            ({formatCronTimeNPT(scraperData?.schedule || DEFAULT_CRON_SCHEDULE)})
                        </span>
                    </p>
                </div>

                {/* Last Run Status & Trigger */}
                <div className="rounded-xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50 p-3.5 sm:p-4 shadow-2xs hover:border-[var(--nepal-blue)]/30 transition">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Last Run Status</span>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            scraperData?.lastRun?.status === 'success'
                                ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                : scraperData?.lastRun?.status === 'circuit_breaker'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                    : scraperData?.lastRun
                                        ? 'bg-purple-500/10 text-purple-600'
                                        : 'bg-gray-500/10 text-gray-500'
                        }`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {scraperData?.lastRun?.status === 'success'
                                ? 'Completed'
                                : scraperData?.lastRun?.status === 'circuit_breaker'
                                    ? 'CDN Outage'
                                    : scraperData?.lastRun?.status || 'Ready'}
                        </span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-base font-bold text-[var(--text-primary)] capitalize">
                            {scraperData?.lastRun?.trigger
                                ? scraperData.lastRun.trigger.replace('_', ' ')
                                : 'Awaiting First Run'}
                        </p>
                        {scraperData?.lastRun?.timestamp && (
                            <span className="text-xs text-[var(--text-muted)]">
                                ({formatTimeAgo(scraperData.lastRun.timestamp)})
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {scraperData?.lastRun?.timestamp
                            ? `${formatNepalDateTime(scraperData.lastRun.timestamp, 'en')} (NPT) • ${scraperData.lastRun.durationSeconds ? `${scraperData.lastRun.durationSeconds}s` : 'Done'}`
                            : 'Runs incrementally on schedule'}
                    </p>
                </div>

                {/* Database Records & Sync */}
                <div className="rounded-xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50 p-3.5 sm:p-4 shadow-2xs hover:border-[var(--nepal-blue)]/30 transition">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Indexed Database</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                            Turso libSQL
                        </span>
                    </div>
                    <p className="mt-2 text-base font-bold font-mono tabular-nums text-[var(--text-primary)]">
                        {(scraperData?.totalRecords || 1185710).toLocaleString()} <span className="text-xs font-normal font-sans text-[var(--text-muted)]">licenses stored</span>
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        {scraperData?.lastRun?.scraped !== undefined
                            ? `Last sync: ${scraperData.lastRun.scraped} scraped, ${scraperData.lastRun.saved} saved`
                            : 'Syncs new PDF records without duplicates'}
                    </p>
                </div>
            </div>
        </section>
    )
}
