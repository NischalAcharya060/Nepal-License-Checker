'use client'

import React, { useState, useRef, useEffect } from 'react'
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
    statusFilter?: 'all' | 'found' | 'not_found' | 'duplicates'
    sourceFilter?: 'all' | 'scanner' | 'manual'
    dataLoading?: boolean
    lastUpdated?: Date | null
    privacyMode?: boolean
    searchSelectMode?: boolean
    selectedSearchIds?: number[]
    copiedKey?: string | null
    duplicateStats?: { duplicateCount: number; duplicateLicenses: number; redundantCount: number } | null
    setPage?: (page: number) => void
    setLimit?: (limit: number) => void
    setSearchFilter?: (filter: string) => void
    setStatusFilter?: (status: 'all' | 'found' | 'not_found' | 'duplicates') => void
    setSourceFilter?: (source: 'all' | 'scanner' | 'manual') => void
    setSearchSelectMode?: (mode: boolean) => void
    setSelectedSearchIds?: React.Dispatch<React.SetStateAction<number[]>>
    copyToClipboard?: (text: string, key: string) => void
    handleDeleteSearchLog?: (id: number, license: string) => void
    handleDeleteSelectedSearchLogs?: () => void
    handleDeleteSearchLogsOlderThan?: (days: number) => void
    handleDeleteAllSearchLogs?: () => void
    handleAutoDeleteDuplicates?: (keep?: 'newest' | 'oldest', targetLicense?: string) => void
    handleDeleteLicenseDuplicates?: (license: string) => void
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
        sourceFilter = 'all',
        dataLoading = false,
        lastUpdated = null,
        privacyMode = true,
        searchSelectMode = false,
        selectedSearchIds = [],
        copiedKey = null,
        duplicateStats = null,
        setPage = () => {},
        setLimit = () => {},
        setSearchFilter = () => {},
        setStatusFilter = () => {},
        setSourceFilter = () => {},
        setSearchSelectMode = () => {},
        setSelectedSearchIds = () => {},
        copyToClipboard = () => {},
        handleDeleteSearchLog = () => {},
        handleDeleteSelectedSearchLogs = () => {},
        handleDeleteSearchLogsOlderThan = () => {},
        handleDeleteAllSearchLogs = () => {},
        handleAutoDeleteDuplicates = () => {},
        handleDeleteLicenseDuplicates = () => {},
        startTransition = (cb) => cb(),
    }: AdminSearchesProps = props || {}

    // Row-level reveal state & search peek
    const [unmaskedRows, setUnmaskedRows] = useState<Set<number>>(new Set())
    const [revealAllInSearch, setRevealAllInSearch] = useState(false)
    const [liveDbLoading, setLiveDbLoading] = useState(false)
    const [dbCheckResult, setDbCheckResult] = useState<{
        searched: boolean
        found: boolean
        data?: {
            holder_name?: string
            name?: string
            father_name?: string
            license_number?: string
            office?: string
            category?: string
            createdAt?: string
            updatedAt?: string
        }
        error?: string
    } | null>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    // Keyboard shortcut '/' to focus search, and Esc to clear
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
            if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                if (searchFilter) {
                    setSearchFilter('')
                    setPage(1)
                    setDbCheckResult(null)
                } else {
                    searchInputRef.current?.blur()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [searchFilter, setPage, setSearchFilter])

    // Toggle row-level unmasking
    const toggleRowMask = (id: number) => {
        setUnmaskedRows((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Live DOTM Database query
    const handleCheckLiveDb = async (targetNum?: string) => {
        const cleaned = (typeof targetNum === 'string' ? targetNum : searchFilter).trim()
        if (!cleaned || liveDbLoading) return
        setLiveDbLoading(true)
        try {
            const res = await fetch(`/api/license?number=${encodeURIComponent(cleaned)}`)
            const data = await res.json()
            if (res.ok && data.status === 'success' && data.data) {
                setDbCheckResult({
                    searched: true,
                    found: true,
                    data: data.data,
                })
            } else {
                setDbCheckResult({
                    searched: true,
                    found: false,
                    error: data.error || data.message || 'License not found in printed DOTM records',
                })
            }
        } catch {
            setDbCheckResult({
                searched: true,
                found: false,
                error: 'Could not connect to database',
            })
        } finally {
            setLiveDbLoading(false)
        }
    }

    // Match Highlighting Utility
    const highlightMatch = (text: string | null | undefined, query: string): React.ReactNode => {
        if (!text) return '—'
        if (!query || !query.trim()) return text
        const q = query.trim()
        const idx = text.toLowerCase().indexOf(q.toLowerCase())
        if (idx === -1) return text
        const before = text.slice(0, idx)
        const match = text.slice(idx, idx + q.length)
        const after = text.slice(idx + q.length)
        return (
            <>
                {before}
                <mark className="bg-[var(--nepal-blue)]/25 text-[var(--nepal-blue)] dark:text-sky-300 font-bold px-0.5 rounded shadow-2xs">
                    {match}
                </mark>
                {after}
            </>
        )
    }

    // Search query investigation metrics
    const hasFoundInLogs = logs.some((l: SearchLog) => l.status === 'found')
    const primaryFoundLog = logs.find((l: SearchLog) => l.status === 'found' && l.holder_name)
    const primaryHolder = primaryFoundLog?.holder_name || logs.find((l: SearchLog) => l.holder_name)?.holder_name
    const primaryOffice = primaryFoundLog?.office || logs.find((l: SearchLog) => l.office)?.office
    const uniqueIps = Array.from(new Set(logs.map((l: SearchLog) => l.ip).filter(Boolean)))
    const uniqueIpsCount = uniqueIps.length
    const uniqueCities = Array.from(new Set(logs.map((l: SearchLog) => l.city).filter(Boolean)))
    const uniqueCitiesList = uniqueCities.slice(0, 3).join(', ')

    return (
        <section aria-label="Search Queries Log">
            {/* Search & Filter Toolbar (2-Tier High-Craft Deck) */}
            <div className="mt-4 sm:mt-5 flex flex-col gap-3 dev-glass-card rounded-2xl p-3 sm:p-4 shadow-xs backdrop-blur-md border border-[var(--border-default)]/80">
                {/* Tier 1: Dedicated Full-Width Search Deck */}
                <div className="relative w-full">
                    <svg
                        width="16"
                        height="16"
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
                        ref={searchInputRef}
                        type="text"
                        value={searchFilter}
                        onChange={(e) => {
                            setSearchFilter(e.target.value)
                            setDbCheckResult(null)
                            startTransition(() => setPage(1))
                        }}
                        placeholder="Search license (e.g. 02-04-01382123 or 01-06), citizen name, IP address, city..."
                        className="h-10 sm:h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-10 pr-28 text-xs sm:text-sm font-medium text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 shadow-inner"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {searchFilter ? (
                            <>
                                <span className="hidden sm:inline-flex items-center rounded-lg bg-[var(--surface-primary)] border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-mono font-bold text-[var(--text-secondary)] shadow-2xs">
                                    {total} {total === 1 ? 'match' : 'matches'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchFilter('')
                                        setPage(1)
                                        setDbCheckResult(null)
                                        searchInputRef.current?.focus()
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                    title="Clear search (Esc)"
                                    aria-label="Clear filter"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </>
                        ) : (
                            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--text-muted)] shadow-2xs">
                                <span className="text-[11px]">/</span> key
                            </kbd>
                        )}
                    </div>
                </div>

                {/* Tier 2: Filters & Actions Toolbar (Unified Upper Row) */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-[var(--border-default)]/40 overflow-x-auto no-scrollbar py-0.5">
                    {/* Status & Duplicates Filter */}
                    <div className="inline-flex shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5 sm:p-1 text-xs font-semibold">
                        {(["all", "found", "not_found", "duplicates"] as const).map((st) => {
                            const isDup = st === "duplicates"
                            const count = isDup ? duplicateStats?.duplicateCount || 0 : undefined
                            const isActive = statusFilter === st
                            return (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => {
                                        setStatusFilter(st)
                                        setPage(1)
                                    }}
                                    className={`rounded-lg px-2 py-1 text-[11px] sm:text-xs capitalize transition cursor-pointer inline-flex items-center gap-1 whitespace-nowrap ${
                                        isActive
                                            ? isDup
                                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs font-bold"
                                                : "bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs font-bold"
                                            : isDup && (count ?? 0) > 0
                                            ? "text-amber-600 dark:text-amber-400 hover:text-amber-700"
                                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    <span>{st === "not_found" ? "Not Found" : st === "duplicates" ? "Duplicates" : st}</span>
                                    {isDup && (count ?? 0) > 0 && (
                                        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                                            {count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Search Source Filter (All / AI Scanned / Manual) */}
                    <div className="inline-flex shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5 sm:p-1 text-xs font-semibold">
                        {(["all", "scanner", "manual"] as const).map((src) => {
                            const isActive = (sourceFilter || "all") === src
                            const isScanner = src === "scanner"
                            return (
                                <button
                                    key={src}
                                    type="button"
                                    onClick={() => {
                                        setSourceFilter(src)
                                        setPage(1)
                                    }}
                                    className={`rounded-lg px-2 py-1 text-[11px] sm:text-xs transition cursor-pointer inline-flex items-center gap-1 whitespace-nowrap ${
                                        isActive
                                            ? isScanner
                                                ? "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-xs font-bold"
                                                : "bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs font-bold"
                                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    }`}
                                >
                                    {isScanner ? (
                                        <>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                <circle cx="12" cy="13" r="3.5" />
                                            </svg>
                                            <span>AI Scanned</span>
                                        </>
                                    ) : src === "manual" ? (
                                        <>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                                <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
                                            </svg>
                                            <span>Manual</span>
                                        </>
                                    ) : (
                                        <span>All Sources</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Limit Selector */}
                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value))
                            setPage(1)
                        }}
                        className="h-8 sm:h-8.5 shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-1.5 sm:px-2 text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] focus:outline-none cursor-pointer"
                    >
                        <option value={10}>10 rows</option>
                        <option value={25}>25 rows</option>
                        <option value={50}>50 rows</option>
                        <option value={100}>100 rows</option>
                    </select>

                    {/* Auto-Clean Duplicates Button */}
                    <button
                        type="button"
                        disabled={total === 0 || dataLoading || !(duplicateStats?.duplicateCount || statusFilter === "duplicates")}
                        onClick={() => handleAutoDeleteDuplicates("newest")}
                        className={`inline-flex shrink-0 h-8 sm:h-8.5 items-center gap-1.5 rounded-xl border px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer whitespace-nowrap ${
                            statusFilter === "duplicates" || (duplicateStats?.redundantCount ?? 0) > 0
                                ? "border-amber-500/60 bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-500/30"
                                : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                        }`}
                        title="Automatically remove redundant duplicate search queries, preserving the latest search for each license"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        <span>Auto-Clean Duplicates{duplicateStats?.redundantCount ? ` (${duplicateStats.redundantCount})` : "" }</span>
                    </button>

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
                        className={`inline-flex shrink-0 h-8 sm:h-8.5 items-center gap-1.5 rounded-xl border px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer whitespace-nowrap ${
                            searchSelectMode
                                ? "border-[var(--nepal-blue)] bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] font-bold"
                                : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)]"
                        }`}
                        title={searchSelectMode ? "Exit row selection mode" : "Select multiple rows to delete"}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span>{searchSelectMode ? "Cancel" : "Select"}</span>
                    </button>

                    {/* Delete Selected Button */}
                    {searchSelectMode && selectedSearchIds.length > 0 && (
                        <button
                            type="button"
                            onClick={handleDeleteSelectedSearchLogs}
                            disabled={dataLoading}
                            className="inline-flex shrink-0 h-8 sm:h-8.5 items-center gap-1.5 rounded-xl border border-[var(--error-border)] bg-[var(--error)] px-2 sm:px-2.5 text-[11px] sm:text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
                        className="h-8 sm:h-8.5 w-[82px] sm:w-[88px] shrink-0 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--error-border)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        title="Prune search logs older than 7, 30, or 90 days"
                    >
                        <option value="" disabled>
                            Prune Data
                        </option>
                        <option value={7}>Prune &gt; 7 days</option>
                        <option value={30}>Prune &gt; 30 days</option>
                        <option value={90}>Prune &gt; 90 days</option>
                    </select>

                    {/* Delete All Logs Button */}
                    <button
                        type="button"
                        onClick={handleDeleteAllSearchLogs}
                        disabled={total === 0 || dataLoading}
                        className="inline-flex shrink-0 h-8 sm:h-8.5 items-center gap-1.5 rounded-xl border border-[var(--error-border)]/80 bg-[var(--error-bg)] px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--error)] shadow-xs transition hover:bg-[var(--error-border)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer whitespace-nowrap"
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

            {/* Active License Query Spotlight Card (Visible when searching) */}
            {searchFilter.trim() !== '' && (
                <div className="mt-4 dev-glass-card rounded-2xl border border-[var(--nepal-blue)]/40 bg-gradient-to-r from-[var(--nepal-blue-soft)]/30 via-[var(--nepal-blue-soft)]/10 to-transparent p-3.5 sm:p-4 backdrop-blur-md shadow-xs transition-all">
                    <div className="flex flex-col gap-3">
                        {/* Spotlight Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white shadow-xs">
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                </span>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--nepal-blue)] dark:text-sky-400">
                                            Search Query Spotlight
                                        </span>
                                        <span className="rounded-full bg-[var(--nepal-blue)]/15 border border-[var(--nepal-blue)]/30 px-2 py-0.5 text-[10px] font-mono font-bold text-[var(--nepal-blue)] dark:text-sky-300">
                                            {total} {total === 1 ? 'record' : 'records'} found
                                        </span>
                                        {hasFoundInLogs ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                <span>Printed in DOTM</span>
                                            </span>
                                        ) : total > 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                                <span>Unprinted / Not Found</span>
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate mt-0.5">
                                        Query: &quot;<span className="font-mono text-[var(--nepal-blue)] dark:text-sky-300">{searchFilter}</span>&quot;
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => handleCheckLiveDb()}
                                    disabled={liveDbLoading}
                                    className="inline-flex h-8 sm:h-8.5 items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-3 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-hover)] active:scale-95 disabled:opacity-50 cursor-pointer"
                                    title="Check live DOTM database immediately for this search term"
                                >
                                    {liveDbLoading ? (
                                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    ) : (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                        </svg>
                                    )}
                                    <span>Verify in Live DOTM</span>
                                </button>

                                {privacyMode && (
                                    <button
                                        type="button"
                                        onClick={() => setRevealAllInSearch((prev) => !prev)}
                                        className="inline-flex h-8 sm:h-8.5 items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 sm:px-3 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition active:scale-95 cursor-pointer shadow-2xs"
                                        title={revealAllInSearch ? 'Mask license numbers in search' : 'Reveal real license numbers for current search results'}
                                    >
                                        {revealAllInSearch ? (
                                            <>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                                <span>Mask Numbers</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                                <span>Reveal Numbers</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchFilter('')
                                        setDbCheckResult(null)
                                        setPage(1)
                                    }}
                                    className="inline-flex h-8 sm:h-8.5 items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer shadow-2xs"
                                    title="Clear search filter"
                                >
                                    <span>Reset</span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Quick Insights Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[var(--border-default)]/40 text-xs">
                            <div className="rounded-xl border border-[var(--border-default)]/60 bg-[var(--surface-primary)]/80 p-2.5">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Total Attempts</span>
                                <span className="text-sm font-mono font-bold text-[var(--text-primary)] mt-0.5 block">
                                    {total} search{total === 1 ? '' : 'es'}
                                </span>
                            </div>

                            <div className="rounded-xl border border-[var(--border-default)]/60 bg-[var(--surface-primary)]/80 p-2.5">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Citizen Holder</span>
                                <span className="text-xs font-semibold text-[var(--text-primary)] mt-0.5 block truncate" title={primaryHolder || 'None recorded'}>
                                    {primaryHolder || <span className="text-[var(--text-muted)] italic font-normal">Unverified</span>}
                                </span>
                            </div>

                            <div className="rounded-xl border border-[var(--border-default)]/60 bg-[var(--surface-primary)]/80 p-2.5">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Transport Office</span>
                                <span className="text-xs font-semibold text-[var(--text-primary)] mt-0.5 block truncate" title={primaryOffice || 'None recorded'}>
                                    {primaryOffice || <span className="text-[var(--text-muted)] italic font-normal">N/A</span>}
                                </span>
                            </div>

                            <div className="rounded-xl border border-[var(--border-default)]/60 bg-[var(--surface-primary)]/80 p-2.5">
                                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">IP & Location</span>
                                <span className="text-xs font-mono font-semibold text-[var(--text-primary)] mt-0.5 block truncate" title={`${uniqueIpsCount} IPs (${uniqueCitiesList || 'Unknown'})`}>
                                    {uniqueIpsCount} IP{uniqueIpsCount === 1 ? '' : 's'} {uniqueCitiesList ? `• ${uniqueCitiesList}` : ''}
                                </span>
                            </div>
                        </div>

                        {/* Live DOTM Check Result Banner */}
                        {dbCheckResult && (
                            <div className={`rounded-xl border p-3 text-xs transition-all ${
                                dbCheckResult.found
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                                    : dbCheckResult.error
                                    ? 'border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200'
                                    : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                            }`}>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white ${
                                            dbCheckResult.found ? 'bg-emerald-500' : dbCheckResult.error ? 'bg-red-500' : 'bg-amber-500'
                                        }`}>
                                            {dbCheckResult.found ? '✓' : dbCheckResult.error ? '!' : 'ℹ'}
                                        </span>
                                        <span className="font-bold text-xs sm:text-sm">
                                            {dbCheckResult.found
                                                ? 'Live DOTM Record: Smart Card is PRINTED'
                                                : dbCheckResult.error
                                                ? `DOTM Check Failed: ${dbCheckResult.error}`
                                                : 'Live DOTM Record: NOT Printed Yet (Pending or Not Found)'}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDbCheckResult(null)}
                                        className="text-xs opacity-60 hover:opacity-100 transition cursor-pointer"
                                    >
                                        Dismiss
                                    </button>
                                </div>

                                {dbCheckResult.data && (
                                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-current/20 text-[11px]">
                                        <div>
                                            <span className="opacity-70 block">Citizen Name:</span>
                                            <span className="font-bold">{dbCheckResult.data.name || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="opacity-70 block">Father/Guardian:</span>
                                            <span className="font-bold">{dbCheckResult.data.father_name || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="opacity-70 block">DOTM Office:</span>
                                            <span className="font-bold">{dbCheckResult.data.office || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="opacity-70 block">Category:</span>
                                            <span className="font-bold">{dbCheckResult.data.category || 'N/A'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Duplicates Filter Active Banner */}
            {statusFilter === 'duplicates' && (
                <div className="mt-4 dev-glass-card rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 sm:p-4 backdrop-blur-md shadow-xs">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                                        Duplicate License Searches Filter
                                    </h3>
                                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] sm:text-xs font-mono font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                        {total} duplicate {total === 1 ? 'entry' : 'entries'} ({duplicateStats?.duplicateLicenses || 'multiple'} unique licenses)
                                    </span>
                                </div>
                                <p className="mt-0.5 text-[11px] sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Showing search queries for licenses searched multiple times. Auto-clean or manually delete older duplicate records while preserving the 1 latest search record by date for each license.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                                type="button"
                                disabled={dataLoading || total === 0}
                                onClick={() => handleAutoDeleteDuplicates('newest')}
                                className="inline-flex h-8 sm:h-8.5 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600 active:scale-95 disabled:opacity-50 cursor-pointer"
                                title="Auto-clean all older duplicate search records, keeping the 1 latest search for each license"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                                <span>Auto-Clean (Leave 1 Latest){duplicateStats?.redundantCount ? ` (${duplicateStats.redundantCount})` : ''}</span>
                            </button>

                            {logs.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const olderIds = logs
                                            .filter((l) => (l.duplicate_count ?? 1) > 1 && !l.is_latest)
                                            .map((l) => l.id)
                                        setSelectedSearchIds(olderIds)
                                        setSearchSelectMode(true)
                                    }}
                                    className="inline-flex h-8 sm:h-8.5 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 sm:px-3 text-xs font-semibold text-amber-700 dark:text-amber-300 transition hover:bg-amber-500/20 active:scale-95 cursor-pointer shadow-2xs"
                                    title="Select only older duplicate search records, keeping the 1 latest search record for each license unselected"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="9 11 12 14 22 4" />
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                    </svg>
                                    <span>Select Older (Leave Latest)</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    setStatusFilter('all')
                                    setPage(1)
                                }}
                                className="inline-flex h-8 sm:h-8.5 items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer shadow-2xs"
                                title="Exit duplicates filter and show all searches"
                            >
                                <span>View All</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search Logs Container (Mobile Cards + Desktop Table) */}
            <div className="mt-4 relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] shadow-sm backdrop-blur-md transition-all">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-70" />

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
                            {searchFilter.trim() !== '' ? (
                                <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="font-bold text-sm text-[var(--text-primary)]">
                                            No search records matching &quot;{searchFilter}&quot;
                                        </span>
                                        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                                            No citizen has queried this license or query term yet on the site.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => handleCheckLiveDb()}
                                            disabled={liveDbLoading}
                                            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-hover)] active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                            {liveDbLoading ? (
                                                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            ) : (
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                                </svg>
                                            )}
                                            <span>Verify in Live DOTM</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSearchFilter('')}
                                            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                        >
                                            Clear Filter
                                        </button>
                                    </div>
                                </div>
                            ) : (
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
                            )}
                        </div>
                    ) : (
                        <div>
                            {/* Mobile Select-All Header if in select mode */}
                            {searchSelectMode && (
                                <div className="flex items-center justify-between border-b border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/70 px-4 py-3 text-xs">
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
                                    <span className="text-[11px] text-[var(--text-muted)] font-mono font-semibold">
                                        {selectedSearchIds.length} selected
                                    </span>
                                </div>
                            )}

                            <div className="divide-y divide-[var(--border-default)]/50">
                                {logs.map((log, idx) => {
                                    const isFound = log.status === 'found'
                                    const isSelected = selectedSearchIds.includes(log.id)
                                    const sn = (page - 1) * limit + idx + 1
                                    const isUnmasked = !privacyMode || revealAllInSearch || unmaskedRows.has(log.id)
                                    const displayLicense = isUnmasked ? log.license_number : maskLicenseNumber(log.license_number, true)
                                    const displayIp = isUnmasked ? log.ip : maskIpAddress(log.ip, privacyMode)
                                    return (
                                        <div
                                            key={log.id}
                                            className={`p-4 transition-colors duration-150 space-y-3 ${isSelected ? 'bg-[var(--nepal-blue-soft)]/20' : 'hover:bg-[var(--bg-secondary)]/30'}`}
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
                                                    <span className="rounded-lg bg-[var(--bg-secondary)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--text-muted)]">
                                                        #{sn}
                                                    </span>
                                                    {isFound ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            <span>Found</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/80 px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
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
                                            <div className="flex items-baseline justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-sm font-bold tracking-tight text-[var(--text-primary)]">
                                                        <span>{highlightMatch(displayLicense, searchFilter)}</span>
                                                        {privacyMode && !revealAllInSearch && (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleRowMask(log.id)}
                                                                className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                                                title={unmaskedRows.has(log.id) ? "Mask number" : "Peek unmasked number"}
                                                                aria-label="Toggle number visibility"
                                                            >
                                                                {unmaskedRows.has(log.id) ? (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                                        <line x1="1" y1="1" x2="23" y2="23" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                        <circle cx="12" cy="12" r="3" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}
                                                        {isUnmasked && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(log.license_number, `m-lic-${log.id}`)}
                                                                className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
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
                                                        {log.source === 'scanner' ? (
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sky-700 dark:text-sky-300 shadow-2xs"
                                                                title="Citizen searched this license using the AI OCR Camera / Receipt Scanner"
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                                    <circle cx="12" cy="13" r="3.5" />
                                                                </svg>
                                                                <span>AI Scanner</span>
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/60 px-1.5 py-0.5 text-[9.5px] font-mono font-semibold text-[var(--text-muted)]"
                                                                title="Citizen manually typed this license number"
                                                            >
                                                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                                                    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8" />
                                                                </svg>
                                                                <span>Manual</span>
                                                            </span>
                                                        )}
                                                        {log.duplicate_count && log.duplicate_count > 1 && (
                                                            log.is_latest ? (
                                                                <span
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs"
                                                                    title={`Latest search record by date for this license (kept during cleanup, searched ${log.duplicate_count} times)`}
                                                                >
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                    <span>★ Latest Date ({log.duplicate_count}×)</span>
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/12 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 shadow-2xs"
                                                                    title="Older duplicate record - safe to delete"
                                                                >
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                    </svg>
                                                                    <span>Older Duplicate</span>
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                    {log.holder_name && (
                                                        <p className="mt-1 text-xs font-semibold text-[var(--text-primary)] truncate">
                                                            {highlightMatch(log.holder_name, searchFilter)}
                                                        </p>
                                                    )}
                                                    {log.office && (
                                                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                                                            {highlightMatch(log.office, searchFilter)}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Actions (Delete single & Delete older duplicates for license) */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {log.duplicate_count && log.duplicate_count > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteLicenseDuplicates(log.license_number)}
                                                            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer shadow-2xs"
                                                            title={`Delete older duplicate searches for license ${log.license_number} (leaves 1 latest record)`}
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSearchLog(log.id, log.license_number)}
                                                        className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer shadow-2xs"
                                                        title="Delete search log"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Bottom Meta Row: Location & IP */}
                                            <div className="flex items-center justify-between gap-2 border-t border-[var(--border-default)]/40 pt-2.5 text-[11px] text-[var(--text-muted)]">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="text-base leading-none">{getFlag(log.country)}</span>
                                                    <span className="truncate font-medium text-[var(--text-secondary)]">
                                                        {highlightMatch(log.city || 'Unknown City', searchFilter)}{log.region ? `, ${log.region}` : ''}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-secondary)] shrink-0">
                                                    <span className="rounded-md bg-[var(--bg-secondary)] px-1.5 py-0.5 border border-[var(--border-default)]/50">
                                                        {highlightMatch(displayIp, searchFilter)}
                                                    </span>
                                                    {isUnmasked && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(log.ip, `m-ip-${log.id}`)}
                                                            className="hover:text-[var(--nepal-blue)] transition cursor-pointer p-0.5"
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
                    <table className="admin-data-table w-full text-left text-xs">
                        <thead className="border-b border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                            <tr>
                                {searchSelectMode && (
                                    <th scope="col" className="w-10 py-3.5 pl-4 pr-1">
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
                                            title="Select all on this page"
                                        />
                                    </th>
                                )}
                                <th scope="col" className="w-12 py-3.5 pl-3 pr-2 text-center">
                                    SN
                                </th>
                                <th scope="col" className="py-3.5 pl-2 pr-4">
                                    Time (NPT)
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    License Number
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    Status
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    Holder / Office
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    IP Address
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    Location
                                </th>
                                <th scope="col" className="py-3.5 pl-3 pr-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]/50">
                            {dataLoading && !logs.length ? (
                                <tr>
                                    <td colSpan={searchSelectMode ? 9 : 8} className="py-16 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center justify-center gap-2.5">
                                            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                            <span>Loading search queries...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={searchSelectMode ? 9 : 8} className="py-16 px-4 text-center text-xs text-[var(--text-muted)]">
                                        {searchFilter.trim() !== '' ? (
                                            <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
                                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <circle cx="11" cy="11" r="8" />
                                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sm text-[var(--text-primary)]">
                                                        No search queries matching &quot;{searchFilter}&quot;
                                                    </span>
                                                    <p className="mt-1 text-[11.5px] text-[var(--text-secondary)]">
                                                        No citizen has queried this license number or search term yet on the site.
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCheckLiveDb()}
                                                        disabled={liveDbLoading}
                                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-hover)] active:scale-95 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {liveDbLoading ? (
                                                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                        ) : (
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                                            </svg>
                                                        )}
                                                        <span>Check Live DOTM Database Directly</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSearchFilter('')}
                                                        className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                                    >
                                                        Clear Filter
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
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
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log, idx) => {
                                    const isFound = log.status === 'found'
                                    const isSelected = selectedSearchIds.includes(log.id)
                                    const sn = (page - 1) * limit + idx + 1
                                    const isUnmasked = !privacyMode || revealAllInSearch || unmaskedRows.has(log.id)
                                    const displayLicense = isUnmasked ? log.license_number : maskLicenseNumber(log.license_number, true)
                                    const displayIp = isUnmasked ? log.ip : maskIpAddress(log.ip, privacyMode)
                                    return (
                                        <tr
                                            key={log.id}
                                            className={`group transition-colors duration-150 hover:bg-[var(--bg-secondary)]/50 ${isSelected ? 'bg-[var(--nepal-blue-soft)]/20 hover:bg-[var(--nepal-blue-soft)]/30' : ''}`}
                                        >
                                            {/* Checkbox (Visible only in Select mode) */}
                                            {searchSelectMode && (
                                                <td className="w-10 py-3.5 pl-4 pr-1">
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
                                                </td>
                                            )}

                                            {/* SN */}
                                            <td className="w-12 whitespace-nowrap py-3.5 pl-3 pr-2 text-center font-mono text-[10px] font-semibold tabular-nums text-[var(--text-muted)]">
                                                #{sn}
                                            </td>

                                            {/* Timestamp */}
                                            <td className="whitespace-nowrap py-3.5 pl-2 pr-4 font-mono text-[10.5px]">
                                                <div className="flex flex-col gap-0">
                                                    <span className="font-semibold leading-tight text-[var(--text-primary)]" title={`${formatNepalDateTime(log.created_at, 'en', true)} (NPT, UTC+5:45)`}>
                                                        {formatNepalDateTime(log.created_at)}
                                                    </span>
                                                    <span className="text-[10px] font-sans leading-tight text-[var(--text-muted)]">
                                                        {formatTimeAgo(log.created_at)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* License Number & Duplicate Badge */}
                                            <td className="whitespace-nowrap px-4 py-3.5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 font-mono text-[12px] font-bold tracking-tight text-[var(--text-primary)]">
                                                        <span>{highlightMatch(displayLicense, searchFilter)}</span>
                                                        {privacyMode && !revealAllInSearch && (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleRowMask(log.id)}
                                                                className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                                                title={unmaskedRows.has(log.id) ? "Mask number" : "Peek unmasked number"}
                                                                aria-label="Toggle number visibility"
                                                            >
                                                                {unmaskedRows.has(log.id) ? (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                                        <line x1="1" y1="1" x2="23" y2="23" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                        <circle cx="12" cy="12" r="3" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        )}
                                                        {isUnmasked && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(log.license_number, `lic-${log.id}`)}
                                                                className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-all duration-150 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-secondary)] hover:text-[var(--nepal-blue)] active:scale-90 cursor-pointer"
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
                                                        {log.source === 'scanner' ? (
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sky-700 dark:text-sky-300 shadow-2xs"
                                                                title="Citizen searched this license using the AI OCR Camera / Receipt Scanner"
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                                    <circle cx="12" cy="13" r="3.5" />
                                                                </svg>
                                                                <span>AI Scanner</span>
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/60 px-1.5 py-0.5 text-[9.5px] font-mono font-semibold text-[var(--text-muted)]"
                                                                title="Citizen manually typed this license number"
                                                            >
                                                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                                                    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8" />
                                                                </svg>
                                                                <span>Manual</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {log.duplicate_count && log.duplicate_count > 1 && (
                                                        log.is_latest ? (
                                                            <span
                                                                className="inline-flex w-fit items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs"
                                                                title={`Latest search record by date for this license (kept during cleanup, searched ${log.duplicate_count} times)`}
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                                <span>★ Latest Date ({log.duplicate_count}×)</span>
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className="inline-flex w-fit items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/12 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 shadow-2xs"
                                                                title="Older duplicate search record - safe to delete"
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                                <span>Older Duplicate</span>
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </td>

                                            {/* Result Status Badge */}
                                            <td className="whitespace-nowrap px-4 py-3.5">
                                                {isFound ? (
                                                    <span className="inline-flex min-w-[86px] items-center justify-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold leading-4 text-emerald-600 dark:text-emerald-400">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span>Found</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex min-w-[86px] items-center justify-center gap-1 rounded-full border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/80 px-2 py-0.5 text-[10px] font-semibold leading-4 text-[var(--text-muted)]">
                                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <line x1="18" y1="6" x2="6" y2="18" />
                                                            <line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                        <span>Not Found</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Holder Name / Office */}
                                            <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                                                {log.holder_name ? (
                                                    <div>
                                                        <span className="text-[11.5px] font-semibold leading-tight text-[var(--text-primary)]">
                                                            {highlightMatch(log.holder_name, searchFilter)}
                                                        </span>
                                                        {log.office && (
                                                            <p className="text-[10px] leading-tight text-[var(--text-muted)]">
                                                                {highlightMatch(log.office, searchFilter)}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[var(--text-muted)] italic">—</span>
                                                )}
                                            </td>

                                            {/* IP Address */}
                                            <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs">
                                                <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                                                    <span className="rounded-md border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/70 px-1.5 py-0.5 text-[10px] leading-4">
                                                        {highlightMatch(displayIp, searchFilter)}
                                                    </span>
                                                    {isUnmasked && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(log.ip, `ip-${log.id}`)}
                                                            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-all duration-150 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-secondary)] hover:text-[var(--nepal-blue)] active:scale-90 cursor-pointer"
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
                                            <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm leading-none drop-shadow-2xs" title={log.country || 'Unknown'}>
                                                        {getFlag(log.country)}
                                                    </span>
                                                    <div className="leading-tight">
                                                        <span className="text-[11.5px] font-semibold text-[var(--text-primary)]">
                                                            {highlightMatch(log.city || 'Unknown City', searchFilter)}
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
                                            <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {log.duplicate_count && log.duplicate_count > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteLicenseDuplicates(log.license_number)}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-700 transition-all duration-150 hover:-translate-y-px hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer shadow-2xs dark:text-amber-400"
                                                            title={`Delete older duplicate searches for license ${log.license_number} (leaves 1 latest record)`}
                                                        >
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSearchLog(log.id, log.license_number)}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)]/80 bg-[var(--surface-primary)] text-[var(--text-muted)] transition-all duration-150 hover:-translate-y-px hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer shadow-2xs"
                                                        title="Delete search log"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
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
