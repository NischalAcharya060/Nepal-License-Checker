'use client'

import { SearchLog } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { getFlag, formatTimeAgo, maskLicenseNumber, maskIpAddress } from '../helpers'
import AdminPagination from '../AdminPagination'

export interface AdminSearchesProps {
    logs?: SearchLog[]
    total?: number
    page?: number
    limit?: number
    totalPages?: number
    searchFilter?: string
    statusFilter?: 'all' | 'found' | 'not_found'
    dataLoading?: boolean
    lastUpdated?: Date | null
    privacyMode?: boolean
    searchSelectMode?: boolean
    selectedSearchIds?: number[]
    copiedKey?: string | null
    setPage?: (page: number) => void
    setLimit?: (limit: number) => void
    setSearchFilter?: (filter: string) => void
    setStatusFilter?: (status: 'all' | 'found' | 'not_found') => void
    setSearchSelectMode?: (mode: boolean) => void
    setSelectedSearchIds?: React.Dispatch<React.SetStateAction<number[]>>
    copyToClipboard?: (text: string, key: string) => void
    handleDeleteSearchLog?: (id: number, license: string) => void
    handleDeleteSelectedSearchLogs?: () => void
    handleDeleteSearchLogsOlderThan?: (days: number) => void
    handleDeleteAllSearchLogs?: () => void
    startTransition?: (callback: () => void) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminSearches(props: any) {
    const {
        logs = [],
        total = 0,
        page = 1,
        limit = 10,
        totalPages = 1,
        searchFilter = '',
        statusFilter = 'all',
        dataLoading = false,
        lastUpdated = null,
        privacyMode = true,
        searchSelectMode = false,
        selectedSearchIds = [],
        copiedKey = null,
        setPage = () => {},
        setLimit = () => {},
        setSearchFilter = () => {},
        setStatusFilter = () => {},
        setSearchSelectMode = () => {},
        setSelectedSearchIds = () => {},
        copyToClipboard = () => {},
        handleDeleteSearchLog = () => {},
        handleDeleteSelectedSearchLogs = () => {},
        handleDeleteSearchLogsOlderThan = () => {},
        handleDeleteAllSearchLogs = () => {},
        startTransition = (cb) => cb(),
    }: AdminSearchesProps = props || {}

    return (
        <section aria-label="Search Queries Log">
            {/* Search & Filter Toolbar */}
            <div className="mt-4 sm:mt-5 flex flex-col gap-3 dev-glass-card rounded-2xl p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs backdrop-blur-md">
                {/* Search Input */}
                <div className="relative flex-1">
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        aria-hidden="true"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => {
                            setSearchFilter(e.target.value)
                            startTransition(() => setPage(1))
                        }}
                        placeholder="Filter by license, IP, holder name, city..."
                        className="h-9 sm:h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9.5 pr-9 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                    />
                    {searchFilter && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchFilter('')
                                setPage(1)
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                            aria-label="Clear filter"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Status Filter */}
                    <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1 text-xs font-semibold">
                        {(['all', 'found', 'not_found'] as const).map((st) => (
                            <button
                                key={st}
                                type="button"
                                onClick={() => {
                                    setStatusFilter(st)
                                    setPage(1)
                                }}
                                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs capitalize transition cursor-pointer ${
                                    statusFilter === st
                                        ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs font-bold'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {st === 'not_found' ? 'Not Found' : st}
                            </button>
                        ))}
                    </div>

                    {/* Limit Selector */}
                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value))
                            setPage(1)
                        }}
                        className="h-8.5 sm:h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] focus:outline-none cursor-pointer"
                    >
                        <option value={10}>10 rows</option>
                        <option value={25}>25 rows</option>
                        <option value={50}>50 rows</option>
                        <option value={100}>100 rows</option>
                    </select>

                    {/* Toggle Multi-Select Mode Button */}
                    <button
                        type="button"
                        disabled={logs.length === 0 || dataLoading}
                        onClick={() => {
                            if (searchSelectMode) {
                                setSearchSelectMode(false)
                                setSelectedSearchIds([])
                            } else {
                                setSearchSelectMode(true)
                            }
                        }}
                        className={`inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                            searchSelectMode
                                ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] font-bold'
                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)]'
                        }`}
                        title={searchSelectMode ? 'Exit row selection mode' : 'Select multiple rows to delete'}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span>{searchSelectMode ? 'Cancel' : 'Select'}</span>
                    </button>

                    {/* Delete Selected Button */}
                    {searchSelectMode && selectedSearchIds.length > 0 && (
                        <button
                            type="button"
                            onClick={handleDeleteSelectedSearchLogs}
                            disabled={dataLoading}
                            className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)] bg-[var(--error)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="Delete selected search logs"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Delete Selected ({selectedSearchIds.length})</span>
                        </button>
                    )}

                    {/* Manual Delete Older Than Selector */}
                    <select
                        value=""
                        disabled={total === 0 || dataLoading}
                        onChange={(e) => {
                            const days = Number(e.target.value)
                            if (days > 0) handleDeleteSearchLogsOlderThan(days)
                        }}
                        className="h-8.5 sm:h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--error-border)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        title="Manually delete search logs older than selected days"
                    >
                        <option value="" disabled>
                            Prune Old...
                        </option>
                        <option value={7}>Delete &gt; 7 days old</option>
                        <option value={30}>Delete &gt; 30 days old</option>
                        <option value={90}>Delete &gt; 90 days old</option>
                    </select>

                    {/* Delete All Logs Button */}
                    <button
                        type="button"
                        onClick={handleDeleteAllSearchLogs}
                        disabled={total === 0 || dataLoading}
                        className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)]/80 bg-[var(--error-bg)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold text-[var(--error)] shadow-xs transition hover:bg-[var(--error-border)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        title="Delete all search logs"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete All</span>
                    </button>
                </div>
            </div>

            {/* Search Logs Container (Mobile Cards + Desktop Table) */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-xs">
                {/* Mobile Card List (Visible on < md) */}
                <div className="block md:hidden">
                    {dataLoading && !logs.length ? (
                        <div className="py-14 text-center text-xs text-[var(--text-muted)]">
                            <div className="flex flex-col items-center justify-center gap-2.5">
                                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                <span>Loading search queries...</span>
                            </div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="py-14 px-4 text-center text-xs text-[var(--text-muted)]">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </div>
                                <span className="font-semibold text-sm text-[var(--text-secondary)]">No search records found.</span>
                                <p className="text-[11px] max-w-sm">When users query licenses on the site, their searches will appear here in real-time.</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Mobile Select-All Header if in select mode */}
                            {searchSelectMode && (
                                <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/70 px-3.5 py-2.5 text-xs">
                                    <label className="flex items-center gap-2 font-semibold text-[var(--text-secondary)] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={logs.length > 0 && selectedSearchIds.length === logs.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedSearchIds(logs.map((l) => l.id))
                                                } else {
                                                    setSelectedSearchIds([])
                                                }
                                            }}
                                            className="h-4 w-4 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                        />
                                        <span>Select All on this page ({logs.length})</span>
                                    </label>
                                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                                        {selectedSearchIds.length} selected
                                    </span>
                                </div>
                            )}

                            <div className="divide-y divide-[var(--border-default)]/60">
                                {logs.map((log, idx) => {
                                    const isFound = log.status === 'found'
                                    const isSelected = selectedSearchIds.includes(log.id)
                                    const sn = (page - 1) * limit + idx + 1
                                    return (
                                        <div
                                            key={log.id}
                                            className={`p-3.5 transition-colors ${isSelected ? 'bg-[var(--nepal-blue-soft)]/25' : 'hover:bg-[var(--bg-secondary)]/30'}`}
                                        >
                                            {/* Top Row: Select/SN + Result badge + Time ago */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {searchSelectMode && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedSearchIds((prev) => [...prev, log.id])
                                                                } else {
                                                                    setSelectedSearchIds((prev) => prev.filter((id) => id !== log.id))
                                                                }
                                                            }}
                                                            className="h-4 w-4 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                                        />
                                                    )}
                                                    <span className="rounded-md bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--text-muted)]">
                                                        #{sn}
                                                    </span>
                                                    {isFound ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2 py-0.5 text-xs font-bold text-[var(--success)]">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            <span>Found</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                            </svg>
                                                            <span>Not Found</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className="font-mono text-xs text-[var(--text-muted)]"
                                                    title={`${formatNepalDateTime(log.created_at, 'en', true)} (NPT, UTC+5:45)`}
                                                >
                                                    {formatTimeAgo(log.created_at)}
                                                </span>
                                            </div>

                                            {/* Middle Row: License Number & Holder */}
                                            <div className="mt-2 flex items-baseline justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--text-primary)]">
                                                        <span>{maskLicenseNumber(log.license_number, privacyMode)}</span>
                                                        {!privacyMode && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(log.license_number, `m-lic-${log.id}`)}
                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                                title="Copy license number"
                                                            >
                                                                {copiedKey === `m-lic-${log.id}` ? (
                                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {log.holder_name && (
                                                        <p className="mt-0.5 text-xs font-semibold text-[var(--text-secondary)] truncate">
                                                            {log.holder_name}
                                                        </p>
                                                    )}
                                                    {log.office && (
                                                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                                                            {log.office}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Actions (Delete single) */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteSearchLog(log.id, log.license_number)}
                                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer"
                                                    title="Delete search log"
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Bottom Meta Row: Location & IP */}
                                            <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--border-default)]/40 pt-2 text-[10px] text-[var(--text-muted)]">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="text-sm">{getFlag(log.country)}</span>
                                                    <span className="truncate font-medium text-[var(--text-secondary)]">
                                                        {log.city || 'Unknown City'}{log.region ? `, ${log.region}` : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--text-secondary)] shrink-0">
                                                    <span>{maskIpAddress(log.ip, privacyMode)}</span>
                                                    {!privacyMode && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(log.ip, `m-ip-${log.id}`)}
                                                            className="hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                            title="Copy IP"
                                                        >
                                                            {copiedKey === `m-ip-${log.id}` ? (
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Desktop Spreadsheet Table (Hidden on < md, visible on md+) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/80 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            <tr>
                                {searchSelectMode && (
                                    <th scope="col" className="w-9 py-3 pl-4 pr-1">
                                        <input
                                            type="checkbox"
                                            checked={logs.length > 0 && selectedSearchIds.length === logs.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedSearchIds(logs.map((l) => l.id))
                                                } else {
                                                    setSelectedSearchIds([])
                                                }
                                            }}
                                            className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                            title="Select all on this page"
                                        />
                                    </th>
                                )}
                                <th scope="col" className="w-10 py-3 pl-3 pr-2 text-center">
                                    SN
                                </th>
                                <th scope="col" className="py-3 pl-2 pr-3">
                                    Time (NPT)
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    License Number
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Status
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Holder
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    IP Address
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Location
                                </th>
                                <th scope="col" className="py-3 pl-3 pr-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]/60">
                            {dataLoading && !logs.length ? (
                                <tr>
                                    <td colSpan={searchSelectMode ? 9 : 8} className="py-14 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center justify-center gap-2.5">
                                            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                            <span>Loading search queries...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={searchSelectMode ? 9 : 8} className="py-14 px-4 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <circle cx="11" cy="11" r="8" />
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                </svg>
                                            </div>
                                            <span className="font-semibold text-sm text-[var(--text-secondary)]">No search records found.</span>
                                            <p className="text-[11px] max-w-sm">When users query licenses on the site, their searches will appear here in real-time.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, idx) => {
                                    const isFound = log.status === 'found'
                                    const isSelected = selectedSearchIds.includes(log.id)
                                    const sn = (page - 1) * limit + idx + 1
                                    return (
                                        <tr
                                            key={log.id}
                                            className={`group transition-colors hover:bg-[var(--bg-secondary)]/40 ${isSelected ? 'bg-[var(--nepal-blue-soft)]/30' : ''}`}
                                        >
                                            {/* Checkbox (Visible only in Select mode) */}
                                            {searchSelectMode && (
                                                <td className="w-9 py-3 pl-4 pr-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedSearchIds((prev) => [...prev, log.id])
                                                            } else {
                                                                setSelectedSearchIds((prev) => prev.filter((id) => id !== log.id))
                                                            }
                                                        }}
                                                        className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                                    />
                                                </td>
                                            )}

                                            {/* SN */}
                                            <td className="w-10 whitespace-nowrap py-3 pl-3 pr-2 text-center font-mono text-[11px] font-bold text-[var(--text-muted)]">
                                                {sn}
                                            </td>

                                            {/* Timestamp */}
                                            <td className="whitespace-nowrap py-3 pl-2 pr-3 font-mono text-[11px]">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-semibold text-[var(--text-primary)]" title={`${formatNepalDateTime(log.created_at, 'en', true)} (NPT, UTC+5:45)`}>
                                                        {formatNepalDateTime(log.created_at)}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)]">
                                                        {formatTimeAgo(log.created_at)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* License Number */}
                                            <td className="whitespace-nowrap px-3 py-3">
                                                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--text-primary)]">
                                                    <span>{maskLicenseNumber(log.license_number, privacyMode)}</span>
                                                    {!privacyMode && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(log.license_number, `lic-${log.id}`)}
                                                            className="text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--nepal-blue)] cursor-pointer"
                                                            title="Copy license number"
                                                        >
                                                            {copiedKey === `lic-${log.id}` ? (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Result Status Badge */}
                                            <td className="whitespace-nowrap px-3 py-3">
                                                {isFound ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--success)]">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span>Found</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <line x1="18" y1="6" x2="6" y2="18" />
                                                            <line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                        <span>Not Found</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Holder Name */}
                                            <td className="whitespace-nowrap px-3 py-3 text-xs">
                                                {log.holder_name ? (
                                                    <div>
                                                        <span className="font-bold text-[var(--text-primary)]">
                                                            {log.holder_name}
                                                        </span>
                                                        {log.office && (
                                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                                {log.office}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[var(--text-muted)] italic">—</span>
                                                )}
                                            </td>

                                            {/* IP Address */}
                                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                                                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                    <span>{maskIpAddress(log.ip, privacyMode)}</span>
                                                    {!privacyMode && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(log.ip, `ip-${log.id}`)}
                                                            className="text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--nepal-blue)] cursor-pointer"
                                                            title="Copy IP"
                                                        >
                                                            {copiedKey === `ip-${log.id}` ? (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            ) : (
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Location / Origin */}
                                            <td className="whitespace-nowrap px-3 py-3 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-base" title={log.country || 'Unknown'}>
                                                        {getFlag(log.country)}
                                                    </span>
                                                    <div>
                                                        <span className="font-semibold text-[var(--text-primary)]">
                                                            {log.city || 'Unknown City'}
                                                        </span>
                                                        {log.region && (
                                                            <span className="text-[10px] text-[var(--text-muted)]">
                                                                , {log.region}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteSearchLog(log.id, log.license_number)}
                                                    className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer"
                                                    title="Delete search log"
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Universal Admin Pagination Bar */}
                <AdminPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={limit}
                    onPageChange={setPage}
                    onPageSizeChange={setLimit}
                    pageSizeOptions={[10, 25, 50, 100, 200]}
                    itemLabel="queries"
                    loading={dataLoading}
                    lastUpdated={lastUpdated}
                />
            </div>
        </section>
    )
}
