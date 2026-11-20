'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getFlag, formatTimeAgo, maskLicenseNumber, maskIpAddress } from '../helpers'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { DuplicateLicenseGroup, DuplicateLogEntry } from '../types'

interface AutoDeleteDuplicatesModalProps {
    isOpen: boolean
    onClose: () => void
    initialKeep?: 'newest' | 'oldest'
    initialLicense?: string
    privacyMode?: boolean
    onSuccess?: (deletedCount: number, message: string) => void
    showToast?: (message: string, type?: 'success' | 'error' | 'info') => void
}

export default function AutoDeleteDuplicatesModal({
    isOpen,
    onClose,
    initialKeep = 'newest',
    initialLicense = '',
    privacyMode = true,
    onSuccess = () => {},
    showToast = () => {},
}: AutoDeleteDuplicatesModalProps) {
    const [keepStrategy, setKeepStrategy] = useState<'newest' | 'oldest'>(initialKeep)
    const [groups, setGroups] = useState<DuplicateLicenseGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [cleaningAll, setCleaningAll] = useState(false)
    const [cleaningLicense, setCleaningLicense] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState(initialLicense)
    const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'not_found'>('all')
    const [expandedLicenses, setExpandedLicenses] = useState<Set<string>>(new Set())
    const [unmaskAll, setUnmaskAll] = useState(false)
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    // Fetch duplicate groups from API asynchronously
    useEffect(() => {
        if (!isOpen) return

        let ignore = false
        const loadDuplicates = async () => {
            try {
                const res = await fetch('/api/admin/logs?duplicates=preview')
                const json = await res.json().catch(() => null)
                if (!ignore) {
                    if (res.ok && json?.data) {
                        const fetchedGroups: DuplicateLicenseGroup[] = json.data.groups || []
                        setGroups(fetchedGroups)

                        // Auto-expand initial license if matched, or the first 2 groups
                        const toExpand = new Set<string>()
                        if (initialLicense) {
                            const matched = fetchedGroups.find(
                                (g) => g.license_number.toLowerCase() === initialLicense.toLowerCase()
                            )
                            if (matched) toExpand.add(matched.license_number)
                        }
                        if (toExpand.size === 0) {
                            fetchedGroups.slice(0, 2).forEach((g) => toExpand.add(g.license_number))
                        }
                        setExpandedLicenses(toExpand)
                    } else {
                        showToast('Failed to load duplicate search logs preview', 'error')
                    }
                    setLoading(false)
                }
            } catch {
                if (!ignore) {
                    setLoading(false)
                    showToast('Failed to load duplicate search logs preview', 'error')
                }
            }
        }

        loadDuplicates()
        return () => {
            ignore = true
        }
    }, [isOpen, initialLicense, showToast])

    // Escape key listener to close modal
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !cleaningAll && !cleaningLicense) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, cleaningAll, cleaningLicense, onClose])

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard?.writeText(text)
        setCopiedKey(key)
        showToast(`Copied ${text}`, 'info')
        setTimeout(() => setCopiedKey(null), 1800)
    }

    const toggleExpand = (license: string) => {
        setExpandedLicenses((prev) => {
            const next = new Set(prev)
            if (next.has(license)) next.delete(license)
            else next.add(license)
            return next
        })
    }

    const expandAll = () => {
        setExpandedLicenses(new Set(groups.map((g) => g.license_number)))
    }

    const collapseAll = () => {
        setExpandedLicenses(new Set())
    }

    // Filter duplicate groups based on search and status
    const filteredGroups = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        return groups.filter((group) => {
            // Status filter
            if (statusFilter !== 'all' && group.status !== statusFilter) {
                return false
            }
            // Search query filter
            if (!query) return true
            return (
                group.license_number.toLowerCase().includes(query) ||
                (group.holder_name && group.holder_name.toLowerCase().includes(query)) ||
                (group.office && group.office.toLowerCase().includes(query)) ||
                (group.category && group.category.toLowerCase().includes(query)) ||
                group.latest_ip.toLowerCase().includes(query) ||
                (group.latest_city && group.latest_city.toLowerCase().includes(query))
            )
        })
    }, [groups, searchQuery, statusFilter])

    // Current redundant count based on live groups in modal
    const totalRedundant = useMemo(() => {
        return groups.reduce((acc, g) => acc + Math.max(0, g.total_count - 1), 0)
    }, [groups])

    const totalDuplicateRecords = useMemo(() => {
        return groups.reduce((acc, g) => acc + g.total_count, 0)
    }, [groups])

    // Helper to format license based on privacy mode & unmask toggle
    const displayLicense = (license: string) => {
        const isPrivate = privacyMode && !unmaskAll
        return maskLicenseNumber(license, isPrivate)
    }

    const displayIp = (ip: string) => {
        const isPrivate = privacyMode && !unmaskAll
        return maskIpAddress(ip, isPrivate)
    }

    // Helper to determine if an entry is preserved under current strategy
    const isEntryPreserved = (entry: DuplicateLogEntry, allEntries: DuplicateLogEntry[]) => {
        if (allEntries.length <= 1) return true
        if (keepStrategy === 'newest') {
            // Newest has highest created_at (first entry since sorted DESC)
            return entry.id === allEntries[0].id
        } else {
            // Oldest has lowest created_at (last entry)
            return entry.id === allEntries[allEntries.length - 1].id
        }
    }

    // Clean duplicate records for a single license
    const handleCleanSingleLicense = async (license: string) => {
        if (cleaningLicense || cleaningAll) return
        setCleaningLicense(license)
        try {
            const res = await fetch(
                `/api/admin/logs?duplicates=auto&license=${encodeURIComponent(license)}&keep=${keepStrategy}`,
                { method: 'DELETE' }
            )
            const data = await res.json().catch(() => null)
            if (res.ok) {
                const count = data?.deletedCount ?? 1
                setGroups((prev) => prev.filter((g) => g.license_number !== license))
                showToast(
                    `Deleted ${count} older duplicate record(s) for license ${displayLicense(license)}. 1 latest search was preserved.`,
                    'success'
                )
                onSuccess(count, `Cleaned duplicates for ${license}`)
            } else {
                showToast(`Failed to clean duplicate searches for ${displayLicense(license)}`, 'error')
            }
        } catch {
            showToast(`Failed to clean duplicate searches for ${displayLicense(license)}`, 'error')
        } finally {
            setCleaningLicense(null)
        }
    }

    // Clean all duplicate records across all licenses
    const handleCleanAllDuplicates = async () => {
        if (cleaningAll || totalRedundant === 0) return
        setCleaningAll(true)
        try {
            const res = await fetch(`/api/admin/logs?duplicates=auto&keep=${keepStrategy}`, {
                method: 'DELETE',
            })
            const data = await res.json().catch(() => null)
            if (res.ok) {
                const count = data?.deletedCount ?? totalRedundant
                showToast(
                    `Successfully deleted ${count.toLocaleString()} older duplicate search records. 1 record for each license was preserved!`,
                    'success'
                )
                onSuccess(count, `Cleaned ${count} duplicate search records`)
                onClose()
            } else {
                showToast('Failed to auto-clean duplicate searches', 'error')
            }
        } catch {
            showToast('Failed to auto-clean duplicate searches', 'error')
        } finally {
            setCleaningAll(false)
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 dark:bg-black/85 p-0 sm:p-4 backdrop-blur-xl animate-fade-in"
            onClick={() => {
                if (!cleaningAll && !cleaningLicense) onClose()
            }}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="relative w-full max-w-4xl rounded-t-[28px] sm:rounded-3xl border border-white/15 dark:border-white/10 bg-[var(--surface-primary)] shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile grabber bar */}
                <div className="mx-auto mt-2 mb-1 h-1 w-12 rounded-full bg-[var(--border-strong)] sm:hidden shrink-0" />

                {/* MODAL HEADER (Sticky Top) */}
                <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] p-4 sm:p-6 shrink-0 bg-[var(--surface-primary)]/90 backdrop-blur-md z-10">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                        <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                                    Auto-Clean Duplicate License Searches
                                </h2>
                                {!loading && (
                                    <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300">
                                        {totalRedundant.toLocaleString()} redundant to clean
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                Review duplicate searches grouped by license number. Exactly 1 record per license will be safely preserved, and redundant older copies will be pruned to free up database storage.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={cleaningAll || Boolean(cleaningLicense)}
                        className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                        title="Close modal (Esc)"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* MODAL BODY (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                    {/* 1. METRICS OVERVIEW CARDS */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                        <div className="rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50 p-3 shadow-2xs">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                                Total Duplicates
                            </span>
                            <span className="mt-1 block font-mono text-base sm:text-lg font-black text-[var(--text-primary)] tabular-nums">
                                {loading ? '...' : totalDuplicateRecords.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                                Total logged search queries
                            </span>
                        </div>

                        <div className="rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50 p-3 shadow-2xs">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                                Unique Licenses
                            </span>
                            <span className="mt-1 block font-mono text-base sm:text-lg font-black text-[var(--nepal-blue)] tabular-nums">
                                {loading ? '...' : groups.length.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                                Licenses with 2+ searches
                            </span>
                        </div>

                        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/5 p-3 shadow-2xs">
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                                Redundant To Delete
                            </span>
                            <span className="mt-1 block font-mono text-base sm:text-lg font-black text-[var(--error)] tabular-nums">
                                {loading ? '...' : totalRedundant.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 block">
                                Older redundant copies
                            </span>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 p-3 shadow-2xs">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                                Will Be Preserved
                            </span>
                            <span className="mt-1 block font-mono text-base sm:text-lg font-black text-[var(--success)] tabular-nums">
                                {loading ? '...' : groups.length.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 block">
                                Exactly 1 record per license
                            </span>
                        </div>
                    </div>

                    {/* 2. PRESERVATION STRATEGY SELECTOR */}
                    <div className="rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/40 p-3.5 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="16" x2="12" y2="12" />
                                        <line x1="12" y1="8" x2="12.01" y2="8" />
                                    </svg>
                                    <span>Preservation Strategy</span>
                                </h3>
                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                    Choose which entry to preserve for every duplicated license:
                                </p>
                            </div>

                            <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 shadow-2xs shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setKeepStrategy('newest')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                        keepStrategy === 'newest'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Keep Latest (Recommended)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setKeepStrategy('oldest')}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                        keepStrategy === 'oldest'
                                            ? 'bg-amber-500 text-white shadow-xs'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    <span>Keep Earliest</span>
                                </button>
                            </div>
                        </div>

                        <div className="mt-2.5 pt-2.5 border-t border-[var(--border-default)]/50 text-[11px] text-[var(--text-muted)] flex items-center justify-between flex-wrap gap-2">
                            <span>
                                💡 {keepStrategy === 'newest'
                                    ? 'The most recent search timestamp, IP address, and DOTM verification status will be kept. Older queries will be deleted.'
                                    : 'The earliest original discovery query timestamp and IP will be kept. Newer queries will be deleted.'}
                            </span>
                            <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                                Est. Storage Reclaimed: ~{Math.round((totalRedundant * 280) / 1024)} KB
                            </span>
                        </div>
                    </div>

                    {/* 3. SEARCH & FILTER TOOLBAR */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Search Input */}
                            <div className="relative flex-1 min-w-[180px]">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Filter duplicate licenses, names, office..."
                                    className="h-9 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] pl-8 pr-7 text-xs font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:ring-1 focus:ring-[var(--nepal-blue)]/20"
                                />
                                <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                                    aria-hidden="true"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                        title="Clear search"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                )}
                            </div>

                            {/* Status Filter Pills */}
                            <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5 shadow-2xs shrink-0 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className={`rounded-lg px-2.5 py-1 font-bold transition cursor-pointer ${
                                        statusFilter === 'all'
                                            ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-2xs'
                                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    All ({groups.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('found')}
                                    className={`rounded-lg px-2 py-1 font-bold transition cursor-pointer ${
                                        statusFilter === 'found'
                                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                                            : 'text-[var(--text-muted)] hover:text-emerald-600'
                                    }`}
                                >
                                    Found ({groups.filter((g) => g.status === 'found').length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('not_found')}
                                    className={`rounded-lg px-2 py-1 font-bold transition cursor-pointer ${
                                        statusFilter === 'not_found'
                                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-2xs'
                                            : 'text-[var(--text-muted)] hover:text-amber-600'
                                    }`}
                                >
                                    Not Found ({groups.filter((g) => g.status !== 'found').length})
                                </button>
                            </div>
                        </div>

                        {/* Expand / Collapse & Privacy Controls */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                            {privacyMode && (
                                <button
                                    type="button"
                                    onClick={() => setUnmaskAll((prev) => !prev)}
                                    className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition cursor-pointer shadow-2xs ${
                                        unmaskAll
                                            ? 'border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                            : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                    title={unmaskAll ? 'Mask license numbers' : 'Temporarily unmask license numbers for verification'}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        {unmaskAll ? (
                                            <>
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </>
                                        ) : (
                                            <>
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </>
                                        )}
                                    </svg>
                                    <span>{unmaskAll ? 'Masked' : 'Reveal'}</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={expandedLicenses.size >= filteredGroups.length ? collapseAll : expandAll}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer shadow-2xs"
                                title="Expand or collapse all license query details"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polyline points="7 13 12 18 17 13" />
                                    <polyline points="7 6 12 11 17 6" />
                                </svg>
                                <span>{expandedLicenses.size >= filteredGroups.length ? 'Collapse All' : 'Expand All'}</span>
                            </button>
                        </div>
                    </div>

                    {/* 4. DUPLICATED LICENSES LIST */}
                    {loading ? (
                        <div className="space-y-3 py-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="animate-pulse rounded-2xl border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/30 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="h-5 w-44 rounded-md bg-[var(--border-default)]/60" />
                                        <div className="h-5 w-24 rounded-full bg-[var(--border-default)]/60" />
                                    </div>
                                    <div className="h-4 w-72 rounded bg-[var(--border-default)]/40" />
                                    <div className="h-4 w-52 rounded bg-[var(--border-default)]/30" />
                                </div>
                            ))}
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 p-8 text-center my-6">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3 className="mt-3 text-base font-black text-[var(--text-primary)]">
                                No Duplicate License Searches!
                            </h3>
                            <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                                Great news! Every search record in the database is currently unique. There are no redundant duplicate queries to clean.
                            </p>
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/30 p-8 text-center my-6">
                            <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                No duplicate licenses matched your search &ldquo;{searchQuery}&rdquo;.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('')
                                    setStatusFilter('all')
                                }}
                                className="mt-2.5 inline-flex h-8 items-center rounded-xl bg-[var(--surface-primary)] border border-[var(--border-default)] px-3 text-xs font-bold text-[var(--text-primary)] shadow-2xs hover:bg-[var(--bg-secondary)] cursor-pointer"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] px-1 uppercase tracking-wider">
                                <span>
                                    Duplicated Licenses ({filteredGroups.length} of {groups.length})
                                </span>
                                <span>Click card to inspect search queries</span>
                            </div>

                            {filteredGroups.map((group, idx) => {
                                const isExpanded = expandedLicenses.has(group.license_number)
                                const isBeingCleaned = cleaningLicense === group.license_number
                                const redundantCount = Math.max(0, group.total_count - 1)

                                return (
                                    <div
                                        key={group.license_number}
                                        className={`rounded-2xl border transition shadow-xs overflow-hidden ${
                                            isExpanded
                                                ? 'border-amber-500/50 bg-[var(--surface-primary)] shadow-md ring-1 ring-amber-500/20'
                                                : 'border-[var(--border-default)]/80 bg-[var(--surface-primary)] hover:border-amber-500/30 hover:bg-[var(--bg-secondary)]/30'
                                        }`}
                                    >
                                        {/* CARD MAIN HEADER ROW */}
                                        <div
                                            className="p-3.5 sm:p-4 cursor-pointer select-none"
                                            onClick={() => toggleExpand(group.license_number)}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                {/* Left: License Badge, Name, Status */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                                                            #{idx + 1}
                                                        </span>

                                                        {/* License Number with Copy */}
                                                        <span
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                copyToClipboard(group.license_number, `lic-${group.license_number}`)
                                                            }}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                                                            title="Click to copy exact license number"
                                                        >
                                                            <span>{displayLicense(group.license_number)}</span>
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                                                {copiedKey === `lic-${group.license_number}` ? (
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                ) : (
                                                                    <>
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                    </>
                                                                )}
                                                            </svg>
                                                        </span>

                                                        {/* DOTM Status Pill */}
                                                        {group.status === 'found' ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                                <span>Found in DOTM</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                                                                <span>Not Found</span>
                                                            </span>
                                                        )}

                                                        {/* Query Count Pill */}
                                                        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                                            {group.total_count} queries ({redundantCount} redundant)
                                                        </span>
                                                    </div>

                                                    {/* Holder Name & Office Info */}
                                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                        <div className="flex items-center gap-1 font-bold text-[var(--text-primary)]">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                                <circle cx="12" cy="7" r="4" />
                                                            </svg>
                                                            <span>{group.holder_name || 'Citizen Name Unrecorded'}</span>
                                                        </div>

                                                        {group.office && (
                                                            <div className="flex items-center gap-1 text-[var(--text-secondary)] text-[11px]">
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                                                </svg>
                                                                <span>{group.office}</span>
                                                                {group.category && (
                                                                    <span className="rounded bg-[var(--border-default)]/60 px-1 py-0.2 font-mono text-[10px]">
                                                                        Cat: {group.category}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Meta: Latest Search & Geo */}
                                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
                                                        <span title={formatNepalDateTime(group.latest_created_at, 'en', true) + ' (NPT)'}>
                                                            🕒 Last searched {formatTimeAgo(group.latest_created_at)}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <span>{getFlag(group.latest_country)}</span>
                                                            <span className="font-mono">{displayIp(group.latest_ip)}</span>
                                                            {group.latest_city && <span>({group.latest_city})</span>}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Right: Actions */}
                                                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
                                                    {/* Clean This License Button */}
                                                    <button
                                                        type="button"
                                                        disabled={isBeingCleaned || cleaningAll}
                                                        onClick={() => handleCleanSingleLicense(group.license_number)}
                                                        className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 transition hover:bg-rose-500/20 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
                                                        title={`Delete ${redundantCount} older duplicate search records for license ${group.license_number}, leaving 1 latest record`}
                                                    >
                                                        {isBeingCleaned ? (
                                                            <>
                                                                <span className="h-3 w-3 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                                                                <span>Cleaning...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                </svg>
                                                                <span>Clean License ({redundantCount})</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Expand Chevron Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpand(group.license_number)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer shadow-2xs"
                                                        title={isExpanded ? 'Collapse query details' : 'View all query details'}
                                                    >
                                                        <svg
                                                            width="14"
                                                            height="14"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2.2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                            aria-hidden="true"
                                                        >
                                                            <polyline points="6 9 12 15 18 9" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* EXPANDED SUB-ENTRIES TIMELINE / TABLE */}
                                        {isExpanded && (
                                            <div className="border-t border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/40 p-3 sm:p-4 space-y-2 animate-in fade-in-50 duration-150">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-[var(--text-muted)] mb-2 px-1">
                                                    <span>All Recorded Search Queries ({group.entries.length})</span>
                                                    <span className="font-mono text-[10px]">
                                                        Strategy: Keep {keepStrategy === 'newest' ? 'Latest' : 'Earliest'}
                                                    </span>
                                                </div>

                                                <div className="space-y-2">
                                                    {group.entries.map((entry, entryIdx) => {
                                                        const isPreserved = isEntryPreserved(entry, group.entries)
                                                        const isNewest = entryIdx === 0
                                                        const isOldest = entryIdx === group.entries.length - 1

                                                        return (
                                                            <div
                                                                key={entry.id}
                                                                className={`rounded-xl border p-2.5 sm:p-3 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                                                    isPreserved
                                                                        ? 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/5 shadow-2xs'
                                                                        : 'border-rose-500/20 bg-rose-500/5 opacity-80'
                                                                }`}
                                                            >
                                                                {/* Left: Timing & Location */}
                                                                <div className="flex items-start gap-2.5 min-w-0">
                                                                    <div
                                                                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[10px] font-bold border ${
                                                                            isPreserved
                                                                                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                                                : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-muted)]'
                                                                        }`}
                                                                    >
                                                                        #{entryIdx + 1}
                                                                    </div>

                                                                    <div className="min-w-0 text-xs">
                                                                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] font-bold text-[var(--text-primary)]">
                                                                            <span>{formatNepalDateTime(entry.created_at, 'en', true)}</span>
                                                                            <span className="text-[10px] text-[var(--text-muted)] font-normal">
                                                                                ({formatTimeAgo(entry.created_at)})
                                                                            </span>
                                                                            {isNewest && (
                                                                                <span className="rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1 py-0.2 text-[9px]">
                                                                                    Latest Query
                                                                                </span>
                                                                            )}
                                                                            {isOldest && group.entries.length > 1 && (
                                                                                <span className="rounded bg-slate-500/20 text-slate-700 dark:text-slate-300 px-1 py-0.2 text-[9px]">
                                                                                    Earliest Query
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                                                                            <span className="flex items-center gap-1">
                                                                                <span>{getFlag(entry.country)}</span>
                                                                                <span className="font-mono">{displayIp(entry.ip)}</span>
                                                                                {entry.city && <span>({entry.city})</span>}
                                                                            </span>
                                                                            {entry.status === 'found' ? (
                                                                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                                                    • Verified Found
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-amber-600 dark:text-amber-400">
                                                                                    • Not Found
                                                                                </span>
                                                                            )}
                                                                            <span className="font-mono text-[10px] text-[var(--text-muted)]/70">
                                                                                ID: #{entry.id}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Right: Preservation Badge */}
                                                                <div className="shrink-0 self-start sm:self-center">
                                                                    {isPreserved ? (
                                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 shadow-2xs">
                                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                                <polyline points="20 6 9 17 4 12" />
                                                                            </svg>
                                                                            <span>PRESERVED (Kept in DB)</span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                                            </svg>
                                                                            <span>WILL BE DELETED</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* MODAL FOOTER (Sticky Bottom) */}
                <div className="border-t border-[var(--border-default)] p-4 sm:p-5 bg-[var(--surface-primary)] shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>Irreversible Deletion Safeguard</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            Will delete <strong className="text-[var(--error)]">{totalRedundant.toLocaleString()} older redundant search entries</strong> across {groups.length.toLocaleString()} licenses, retaining exactly 1 record per license.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 shrink-0">
                        <button
                            type="button"
                            disabled={cleaningAll || Boolean(cleaningLicense)}
                            onClick={onClose}
                            className="min-h-[40px] px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={cleaningAll || totalRedundant === 0 || loading || Boolean(cleaningLicense)}
                            onClick={handleCleanAllDuplicates}
                            className="min-h-[40px] px-4.5 rounded-xl bg-[var(--error)] text-white text-xs font-bold shadow-xs hover:opacity-90 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5"
                        >
                            {cleaningAll ? (
                                <>
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    <span>Cleaning Redundant Records...</span>
                                </>
                            ) : (
                                <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    <span>
                                        {totalRedundant > 0
                                            ? `Clean All Older Duplicates (${totalRedundant.toLocaleString()})`
                                            : 'No Duplicates to Clean'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
