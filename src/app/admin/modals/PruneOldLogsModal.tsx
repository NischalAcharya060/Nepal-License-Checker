'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getFlag, formatTimeAgo, maskLicenseNumber, maskIpAddress } from '../helpers'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { PruneLogsPreviewResult } from '../types'

interface PruneOldLogsModalProps {
    isOpen: boolean
    onClose: () => void
    initialDays?: number
    privacyMode?: boolean
    onSuccess?: (deletedCount: number, message: string) => void
    showToast?: (message: string, type?: 'success' | 'error' | 'info') => void
}

const PRESET_DAYS = [7, 30, 90] as const

export default function PruneOldLogsModal({
    isOpen,
    onClose,
    initialDays = 7,
    privacyMode = true,
    onSuccess = () => {},
    showToast = () => {},
}: PruneOldLogsModalProps) {
    const [selectedDays, setSelectedDays] = useState<number>(initialDays || 7)
    const [customDaysInput, setCustomDaysInput] = useState<string>('')
    const [isCustomMode, setIsCustomMode] = useState<boolean>(!PRESET_DAYS.includes((initialDays as 7 | 30 | 90)))
    const [previewData, setPreviewData] = useState<PruneLogsPreviewResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [pruning, setPruning] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'not_found'>('all')
    const [unmaskAll, setUnmaskAll] = useState(false)
    const [copiedKey, setCopiedKey] = useState<string | null>(null)
    const [mountTime] = useState(() => Date.now())

    // Fetch prune preview asynchronously whenever selectedDays changes
    useEffect(() => {
        if (!isOpen) return

        let ignore = false
        const loadPreview = async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/admin/logs?prune_days=${selectedDays}`)
                const json = await res.json().catch(() => null)
                if (!ignore) {
                    if (res.ok && json?.data) {
                        setPreviewData(json.data)
                    } else {
                        showToast('Failed to load historical search logs preview', 'error')
                    }
                    setLoading(false)
                }
            } catch {
                if (!ignore) {
                    setLoading(false)
                    showToast('Failed to load historical search logs preview', 'error')
                }
            }
        }

        loadPreview()
        return () => {
            ignore = true
        }
    }, [isOpen, selectedDays, showToast])

    // Escape key listener to close modal
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !pruning) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, pruning, onClose])

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard?.writeText(text)
        setCopiedKey(key)
        showToast(`Copied ${text}`, 'info')
        setTimeout(() => setCopiedKey(null), 1800)
    }

    const handleSelectPreset = (days: number) => {
        setIsCustomMode(false)
        setSelectedDays(days)
    }

    const handleApplyCustomDays = () => {
        const val = parseInt(customDaysInput, 10)
        if (Number.isFinite(val) && val >= 1 && val <= 3650) {
            setSelectedDays(val)
        } else {
            showToast('Please enter a valid number of days between 1 and 3650', 'error')
        }
    }

    // Helper to format license & IP based on privacy mode & unmask toggle
    const displayLicense = (license: string) => {
        const isPrivate = privacyMode && !unmaskAll
        return maskLicenseNumber(license, isPrivate)
    }

    const displayIp = (ip: string) => {
        const isPrivate = privacyMode && !unmaskAll
        return maskIpAddress(ip, isPrivate)
    }

    // Filter preview logs based on search and status
    const filteredLogs = useMemo(() => {
        const previewLogs = previewData?.logs ?? []
        if (!previewLogs.length) return []
        const query = searchQuery.trim().toLowerCase()
        return previewLogs.filter((log) => {
            if (statusFilter !== 'all' && log.status !== statusFilter) {
                return false
            }
            if (!query) return true
            return (
                log.license_number.toLowerCase().includes(query) ||
                (log.holder_name && log.holder_name.toLowerCase().includes(query)) ||
                (log.office && log.office.toLowerCase().includes(query)) ||
                (log.category && log.category.toLowerCase().includes(query)) ||
                log.ip.toLowerCase().includes(query) ||
                (log.city && log.city.toLowerCase().includes(query))
            )
        })
    }, [previewData, searchQuery, statusFilter])

    // Execute pruning
    const handleExecutePrune = async () => {
        const matchingCount = previewData?.matchingCount || 0
        if (pruning || matchingCount === 0) return
        setPruning(true)
        try {
            const res = await fetch(`/api/admin/logs?days=${selectedDays}`, { method: 'DELETE' })
            const data = await res.json().catch(() => null)
            if (res.ok) {
                const count = data?.deletedCount ?? matchingCount
                showToast(
                    `Successfully deleted ${count.toLocaleString()} search logs older than ${selectedDays} days! Recent logs were preserved.`,
                    'success'
                )
                onSuccess(count, `Pruned ${count} logs older than ${selectedDays} days`)
                onClose()
            } else {
                showToast(`Failed to prune search logs older than ${selectedDays} days`, 'error')
            }
        } catch {
            showToast(`Failed to prune search logs older than ${selectedDays} days`, 'error')
        } finally {
            setPruning(false)
        }
    }

    if (!isOpen) return null

    const matchingCount = previewData?.matchingCount || 0
    const keptCount = previewData?.keptCount || 0
    const cutoffTimestamp = previewData?.cutoff ?? (mountTime - selectedDays * 24 * 60 * 60 * 1000)

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 dark:bg-black/85 p-0 sm:p-4 backdrop-blur-xl animate-fade-in"
            onClick={() => {
                if (!pruning) onClose()
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
                        <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-xs">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                                    Prune Historical Search Logs
                                </h2>
                                {!loading && (
                                    <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-mono font-bold text-rose-700 dark:text-rose-300">
                                        {matchingCount.toLocaleString()} logs older than {selectedDays}d
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                Safely purge historical search queries recorded before a specific retention window. Recent searches from the last {selectedDays} days will remain completely untouched.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={pruning}
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
                    {/* 1. RETENTION AGE PRESETS SELECTOR */}
                    <div className="rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/40 p-3.5 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                    </svg>
                                    <span>Retention Window Threshold</span>
                                </h3>
                                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                                    Select how old search records must be to be pruned:
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectPreset(7)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                            selectedDays === 7 && !isCustomMode
                                                ? 'bg-rose-500 text-white shadow-xs'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        &gt; 7 Days Old
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSelectPreset(30)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                            selectedDays === 30 && !isCustomMode
                                                ? 'bg-rose-500 text-white shadow-xs'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        &gt; 30 Days Old
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSelectPreset(90)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                            selectedDays === 90 && !isCustomMode
                                                ? 'bg-rose-500 text-white shadow-xs'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        &gt; 90 Days Old
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setIsCustomMode(true)}
                                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                            isCustomMode
                                                ? 'bg-rose-500 text-white shadow-xs'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        Custom...
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Custom Days Input Row */}
                        {isCustomMode && (
                            <div className="mt-3 pt-3 border-t border-[var(--border-default)]/60 flex items-center gap-2">
                                <span className="text-xs font-medium text-[var(--text-secondary)]">
                                    Delete logs older than:
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    max="3650"
                                    value={customDaysInput}
                                    onChange={(e) => setCustomDaysInput(e.target.value)}
                                    placeholder="Enter days (e.g. 14, 60, 180)"
                                    className="h-8.5 w-44 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-mono font-bold text-[var(--text-primary)] outline-none focus:border-rose-500"
                                />
                                <span className="text-xs text-[var(--text-muted)]">days</span>
                                <button
                                    type="button"
                                    onClick={handleApplyCustomDays}
                                    className="h-8.5 rounded-xl bg-rose-500 px-3 text-xs font-bold text-white shadow-xs hover:bg-rose-600 transition cursor-pointer"
                                >
                                    Apply
                                </button>
                            </div>
                        )}

                        <div className="mt-2.5 pt-2.5 border-t border-[var(--border-default)]/50 text-[11px] text-[var(--text-muted)] flex items-center justify-between flex-wrap gap-2">
                            <span>
                                📅 <strong>Cutoff Date:</strong> Logs created before{' '}
                                <span className="font-mono font-bold text-[var(--text-primary)]">
                                    {formatNepalDateTime(cutoffTimestamp, 'en', false)} (NPT)
                                </span>{' '}
                                will be deleted.
                            </span>
                            <span className="font-mono text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                                Est. Storage Reclaimed: ~{Math.round((matchingCount * 280) / 1024)} KB
                            </span>
                        </div>
                    </div>

                    {/* 2. METRICS OVERVIEW CARDS */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-500/5 p-3 shadow-2xs">
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                                Logs To Delete
                            </span>
                            <span className="mt-1 block font-mono text-base sm:text-lg font-black text-[var(--error)] tabular-nums">
                                {loading ? '...' : matchingCount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 block">
                                Older than {selectedDays} days
                            </span>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 p-3 shadow-2xs">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                                Recent Logs Kept
                            </span>
                            <span className="mt-1 block font-mono text-base sm:text-lg font-black text-[var(--success)] tabular-nums">
                                {loading ? '...' : keptCount.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 block">
                                Preserved in database
                            </span>
                        </div>

                        <div className="rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50 p-3 shadow-2xs">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                                Current Total Logs
                            </span>
                            <span className="mt-1 block font-mono text-base sm:text-lg font-black text-[var(--text-primary)] tabular-nums">
                                {loading ? '...' : (previewData?.totalCount || 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                                Across all timestamps
                            </span>
                        </div>

                        <div className="rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50 p-3 shadow-2xs">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                                Retention Window
                            </span>
                            <span className="mt-1 block font-mono text-base sm:text-lg font-black text-[var(--nepal-blue)] tabular-nums">
                                Last {selectedDays} Days
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                                Kept safe and searchable
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
                                    placeholder="Filter logs by license, citizen name, office..."
                                    className="h-9 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] pl-8 pr-7 text-xs font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
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
                                    All ({previewData?.logs?.length || 0})
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
                                    Found ({(previewData?.logs || []).filter((l) => l.status === 'found').length})
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
                                    Not Found ({(previewData?.logs || []).filter((l) => l.status !== 'found').length})
                                </button>
                            </div>
                        </div>

                        {/* Privacy Toggle */}
                        {privacyMode && (
                            <button
                                type="button"
                                onClick={() => setUnmaskAll((prev) => !prev)}
                                className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition cursor-pointer shadow-2xs self-end sm:self-auto shrink-0 ${
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
                    </div>

                    {/* 4. HISTORICAL SEARCH LOGS LIST */}
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
                    ) : matchingCount === 0 ? (
                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 p-8 text-center my-6">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <h3 className="mt-3 text-base font-black text-[var(--text-primary)]">
                                No Search Logs Older Than {selectedDays} Days!
                            </h3>
                            <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                                All {previewData?.totalCount || 0} search records in your database were recorded within the last {selectedDays} days. There are no older historical logs to delete.
                            </p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/30 p-8 text-center my-6">
                            <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                No historical logs matched your search &ldquo;{searchQuery}&rdquo;.
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
                                    Historical Logs Preview ({filteredLogs.length} of {matchingCount})
                                </span>
                                <span>Records to be permanently purged</span>
                            </div>

                            {filteredLogs.map((log, idx) => (
                                <div
                                    key={log.id}
                                    className="rounded-2xl border border-rose-500/30 bg-[var(--surface-primary)] p-3.5 sm:p-4 shadow-xs transition hover:border-rose-500/50 hover:bg-rose-500/5"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        {/* Left: Info */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                                                    #{idx + 1}
                                                </span>

                                                {/* License Number with Copy */}
                                                <span
                                                    onClick={() => copyToClipboard(log.license_number, `prune-${log.id}`)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-secondary)] px-2.5 py-1 font-mono text-xs font-bold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                                                    title="Click to copy license number"
                                                >
                                                    <span>{displayLicense(log.license_number)}</span>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                                        {copiedKey === `prune-${log.id}` ? (
                                                            <polyline points="20 6 9 17 4 12" />
                                                        ) : (
                                                            <>
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                            </>
                                                        )}
                                                    </svg>
                                                </span>

                                                {/* Verification Pill */}
                                                {log.status === 'found' ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span>Verified Found</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                                                        <span>Not Found</span>
                                                    </span>
                                                )}

                                                {/* To Be Purged Tag */}
                                                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                                    Will Be Deleted (&gt; {selectedDays}d)
                                                </span>
                                            </div>

                                            {/* Holder Name & Office Info */}
                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                <div className="flex items-center gap-1 font-bold text-[var(--text-primary)]">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                        <circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                    <span>{log.holder_name || 'Citizen Name Unrecorded'}</span>
                                                </div>

                                                {log.office && (
                                                    <div className="flex items-center gap-1 text-[var(--text-secondary)] text-[11px]">
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                                        </svg>
                                                        <span>{log.office}</span>
                                                        {log.category && (
                                                            <span className="rounded bg-[var(--border-default)]/60 px-1 py-0.2 font-mono text-[10px]">
                                                                Cat: {log.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Meta: Logged Time & Geo */}
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
                                                <span title={formatNepalDateTime(log.created_at, 'en', true) + ' (NPT)'}>
                                                    🕒 Logged {formatTimeAgo(log.created_at)} ({formatNepalDateTime(log.created_at, 'en', false)})
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <span>{getFlag(log.country)}</span>
                                                    <span className="font-mono">{displayIp(log.ip)}</span>
                                                    {log.city && <span>({log.city})</span>}
                                                </span>
                                                <span>•</span>
                                                <span className="font-mono text-[10px] text-[var(--text-muted)]/70">
                                                    ID: #{log.id}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {matchingCount > (previewData?.logs?.length || 0) && (
                                <p className="text-center text-[11px] font-medium text-[var(--text-muted)] pt-2">
                                    Showing top {previewData?.logs?.length} of {matchingCount.toLocaleString()} historical records. All {matchingCount.toLocaleString()} records will be safely purged upon confirmation.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* MODAL FOOTER (Sticky Bottom) */}
                <div className="border-t border-[var(--border-default)] p-4 sm:p-5 bg-[var(--surface-primary)] shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                            <span>Irreversible Deletion Safeguard</span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            Will delete <strong className="text-[var(--error)]">{matchingCount.toLocaleString()} historical search records</strong> older than {selectedDays} days, safely preserving {keptCount.toLocaleString()} recent records.
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 shrink-0">
                        <button
                            type="button"
                            disabled={pruning}
                            onClick={onClose}
                            className="min-h-[40px] px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={pruning || matchingCount === 0 || loading}
                            onClick={handleExecutePrune}
                            className="min-h-[40px] px-4.5 rounded-xl bg-[var(--error)] text-white text-xs font-bold shadow-xs hover:opacity-90 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5"
                        >
                            {pruning ? (
                                <>
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    <span>Pruning Historical Logs...</span>
                                </>
                            ) : (
                                <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    <span>
                                        {matchingCount > 0
                                            ? `Prune Older Than ${selectedDays}d (${matchingCount.toLocaleString()})`
                                            : `No Logs Older Than ${selectedDays}d`}
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
