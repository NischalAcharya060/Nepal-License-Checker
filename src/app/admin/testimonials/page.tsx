'use client'

import React, { useState } from 'react'
import { TestimonialLog, TestimonialStatsData } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo, maskIpAddress } from '../helpers'
import AdminPagination from '../AdminPagination'

export interface AdminTestimonialsProps {
    testimonialLogs?: TestimonialLog[]
    testimonialStats?: TestimonialStatsData | null
    testimonialTotal?: number
    testimonialPage?: number
    testimonialLimit?: number
    testimonialTotalPages?: number
    testimonialSearchFilter?: string
    testimonialStatusFilter?: 'all' | 'pending' | 'approved' | 'rejected'
    testimonialLoading?: boolean
    privacyMode?: boolean
    testimonialSelectMode?: boolean
    selectedTestimonialIds?: string[]
    copiedKey?: string | null
    setTestimonialPage?: (page: number) => void
    setTestimonialLimit?: (limit: number) => void
    setTestimonialSearchFilter?: (filter: string) => void
    setTestimonialStatusFilter?: (status: 'all' | 'pending' | 'approved' | 'rejected') => void
    setTestimonialSelectMode?: (mode: boolean) => void
    setSelectedTestimonialIds?: React.Dispatch<React.SetStateAction<string[]>>
    copyToClipboard?: (text: string, key: string) => void
    handleUpdateTestimonialStatus?: (
        id: string,
        status: 'pending' | 'approved' | 'rejected',
        options?: { is_featured?: boolean; adminNotes?: string }
    ) => Promise<void>
    handleBulkTestimonialStatus?: (status: 'pending' | 'approved' | 'rejected') => Promise<void>
    handleToggleFeatured?: (id: string, currentFeatured: boolean) => Promise<void>
    handleDeleteTestimonial?: (id: string, name: string) => void
    handleDeleteSelectedTestimonials?: () => void
    handleDeleteRejectedTestimonials?: () => void
    handleDeleteAllTestimonials?: () => void
    exportTestimonialsCsv?: () => void
    startTransition?: (callback: () => void) => void
}

function renderStars(rating: number) {
    return (
        <div className="flex items-center gap-0.5" title={`${rating} of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill={star <= rating ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-neutral-700'}
                    aria-hidden="true"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminTestimonials(props: any) {
    const {
        testimonialLogs = [],
        testimonialStats = null,
        testimonialTotal = 0,
        testimonialPage = 1,
        testimonialLimit = 10,
        testimonialTotalPages = 1,
        testimonialSearchFilter = '',
        testimonialStatusFilter = 'all',
        testimonialLoading = false,
        privacyMode = true,
        testimonialSelectMode = false,
        selectedTestimonialIds = [],
        setTestimonialPage = () => {},
        setTestimonialLimit = () => {},
        setTestimonialSearchFilter = () => {},
        setTestimonialStatusFilter = () => {},
        setTestimonialSelectMode = () => {},
        setSelectedTestimonialIds = () => {},
        handleUpdateTestimonialStatus = async () => {},
        handleBulkTestimonialStatus = async () => {},
        handleToggleFeatured = async () => {},
        handleDeleteTestimonial = () => {},
        handleDeleteSelectedTestimonials = () => {},
        exportTestimonialsCsv = () => {},
        startTransition = (cb) => cb(),
    }: AdminTestimonialsProps = props || {}

    const [activeDetailItem, setActiveDetailItem] = useState<TestimonialLog | null>(null)
    const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)

    const allCurrentPageSelected =
        testimonialLogs.length > 0 &&
        testimonialLogs.every((t) => selectedTestimonialIds.includes(t.id))

    const handleSelectAllCurrentPage = () => {
        if (allCurrentPageSelected) {
            setSelectedTestimonialIds((prev) =>
                prev.filter((id) => !testimonialLogs.some((t) => t.id === id))
            )
        } else {
            setSelectedTestimonialIds((prev) => {
                const combined = new Set([...prev, ...testimonialLogs.map((t) => t.id)])
                return Array.from(combined)
            })
        }
    }

    const toggleSelectId = (id: string) => {
        setSelectedTestimonialIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        )
    }

    const onApprove = async (t: TestimonialLog) => {
        setActionInProgressId(t.id)
        try {
            await handleUpdateTestimonialStatus(t.id, 'approved')
        } finally {
            setActionInProgressId(null)
        }
    }

    const onReject = async (t: TestimonialLog) => {
        setActionInProgressId(t.id)
        try {
            await handleUpdateTestimonialStatus(t.id, 'rejected')
        } finally {
            setActionInProgressId(null)
        }
    }

    const onPending = async (t: TestimonialLog) => {
        setActionInProgressId(t.id)
        try {
            await handleUpdateTestimonialStatus(t.id, 'pending')
        } finally {
            setActionInProgressId(null)
        }
    }

    return (
        <section aria-label="Testimonials Moderation">
            {/* KPI Metrics */}
            <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
                {/* Total */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--nepal-blue)] to-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Submissions</span>
                        <span className="rounded-xl bg-[var(--nepal-blue-soft)] p-2 text-[var(--nepal-blue)] shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {testimonialStats?.total.toLocaleString() ?? '—'}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[var(--text-muted)]">
                        <span className="font-mono font-semibold text-[var(--text-secondary)]">{testimonialStats?.todayCount ?? 0}</span> submitted today
                    </div>
                </div>

                {/* Pending Approval (Action Required) */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Pending Review</span>
                        <span className="rounded-xl bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                            {testimonialStats?.pendingCount.toLocaleString() ?? '0'}
                        </span>
                        {(testimonialStats?.pendingCount || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Action Required
                            </span>
                        )}
                    </div>
                    <div className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">
                        Awaiting moderation
                    </div>
                </div>

                {/* Approved & Live */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Approved / Live</span>
                        <span className="rounded-xl bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                        {testimonialStats?.approvedCount.toLocaleString() ?? '0'}
                    </div>
                    <div className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">
                        Visible on public homepage
                    </div>
                </div>

                {/* Avg Rating */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-amber-500">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Avg Rating</span>
                        <span className="rounded-xl bg-amber-500/15 p-2 text-amber-500 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                            {testimonialStats?.averageRating ?? '5.0'}
                        </span>
                        <span className="text-xs font-mono text-[var(--text-muted)]">/ 5.0</span>
                    </div>
                    <div className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">
                        From approved feedback
                    </div>
                </div>
            </div>

            {/* Filter & Action Controls Bar */}
            <div className="mt-4 sm:mt-6 dev-glass-card rounded-2xl p-3 sm:p-4 backdrop-blur-md relative overflow-hidden space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Status Tabs */}
                    <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1 text-xs font-semibold overflow-x-auto max-w-full">
                        <button
                            type="button"
                            onClick={() => {
                                startTransition(() => {
                                    setTestimonialStatusFilter('all')
                                    setTestimonialPage(1)
                                })
                            }}
                            className={`rounded-lg px-3 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                                testimonialStatusFilter === 'all'
                                    ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            All ({testimonialStats?.total ?? 0})
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                startTransition(() => {
                                    setTestimonialStatusFilter('pending')
                                    setTestimonialPage(1)
                                })
                            }}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                                testimonialStatusFilter === 'pending'
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'text-amber-700 dark:text-amber-300 hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <span>Pending</span>
                            <span className="rounded-full bg-black/15 dark:bg-white/20 px-1.5 py-0.2 font-mono text-[10px] tabular-nums">
                                {testimonialStats?.pendingCount ?? 0}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                startTransition(() => {
                                    setTestimonialStatusFilter('approved')
                                    setTestimonialPage(1)
                                })
                            }}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                                testimonialStatusFilter === 'approved'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-emerald-700 dark:text-emerald-300 hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <span>Approved</span>
                            <span className="rounded-full bg-black/15 dark:bg-white/20 px-1.5 py-0.2 font-mono text-[10px] tabular-nums">
                                {testimonialStats?.approvedCount ?? 0}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                startTransition(() => {
                                    setTestimonialStatusFilter('rejected')
                                    setTestimonialPage(1)
                                })
                            }}
                            className={`rounded-lg px-3 py-1.5 transition-all whitespace-nowrap cursor-pointer ${
                                testimonialStatusFilter === 'rejected'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'text-rose-700 dark:text-rose-300 hover:text-[var(--text-primary)]'
                            }`}
                        >
                            Rejected ({testimonialStats?.rejectedCount ?? 0})
                        </button>
                    </div>

                    {/* Search & Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Search Input */}
                        <div className="relative flex-1 sm:w-64 min-w-[200px]">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={testimonialSearchFilter}
                                onChange={(e) => {
                                    setTestimonialSearchFilter(e.target.value)
                                    setTestimonialPage(1)
                                }}
                                placeholder="Search by name, role, feedback..."
                                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 pl-8 pr-7 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-hidden transition"
                            />
                            {testimonialSearchFilter && (
                                <button
                                    type="button"
                                    onClick={() => setTestimonialSearchFilter('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
                                    title="Clear search"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Batch Select Mode Toggle */}
                        <button
                            type="button"
                            onClick={() => {
                                setTestimonialSelectMode(!testimonialSelectMode)
                                if (testimonialSelectMode) setSelectedTestimonialIds([])
                            }}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition active:scale-95 cursor-pointer ${
                                testimonialSelectMode
                                    ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)]'
                                    : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                            }`}
                        >
                            {testimonialSelectMode ? 'Cancel Selection' : 'Select'}
                        </button>

                        {/* Export CSV */}
                        <button
                            type="button"
                            onClick={exportTestimonialsCsv}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition active:scale-95 cursor-pointer"
                            title="Export testimonials to CSV"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Bulk Actions Bar (when selection mode active) */}
                {testimonialSelectMode && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-default)] pt-3 text-xs">
                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-[var(--text-secondary)]">
                                <input
                                    type="checkbox"
                                    checked={allCurrentPageSelected}
                                    onChange={handleSelectAllCurrentPage}
                                    className="h-4 w-4 rounded accent-[var(--nepal-blue)] cursor-pointer"
                                />
                                <span>Select All Page ({testimonialLogs.length})</span>
                            </label>
                            <span className="font-mono text-[var(--text-muted)]">
                                ({selectedTestimonialIds.length} selected)
                            </span>
                        </div>

                        {selectedTestimonialIds.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleBulkTestimonialStatus('approved')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Approve Selected ({selectedTestimonialIds.length})</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleBulkTestimonialStatus('rejected')}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 transition cursor-pointer"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                    <span>Reject Selected</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteSelectedTestimonials}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    <span>Delete Selected</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Testimonials List / Grid */}
            <div className="mt-4 sm:mt-5 space-y-3">
                {testimonialLoading ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl dev-glass-card py-16 text-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                        <span className="mt-3 text-xs font-semibold text-[var(--text-muted)]">
                            Loading testimonials...
                        </span>
                    </div>
                ) : testimonialLogs.length === 0 ? (
                    <div className="rounded-2xl dev-glass-card py-14 text-center px-4">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                            No testimonials found
                        </h3>
                        <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                            {testimonialSearchFilter
                                ? 'No results matched your search query. Try clearing the filter.'
                                : testimonialStatusFilter === 'pending'
                                ? 'No testimonials are currently waiting for moderation. Good job!'
                                : 'No submissions yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                        {testimonialLogs.map((item) => {
                            const isSelected = selectedTestimonialIds.includes(item.id)
                            const isPending = item.status === 'pending'
                            const isApproved = item.status === 'approved'
                            const isRejected = item.status === 'rejected'
                            const isBusy = actionInProgressId === item.id

                            return (
                                <div
                                    key={item.id}
                                    className={`relative flex flex-col justify-between rounded-2xl dev-glass-card hover-lift p-4 sm:p-5 transition shadow-xs overflow-hidden ${
                                        isSelected
                                            ? 'border-[var(--nepal-blue)] ring-2 ring-[var(--nepal-blue)]/20'
                                            : isPending
                                            ? 'border-amber-500/40 bg-amber-500/5'
                                            : isApproved
                                            ? 'hover:border-[var(--border-strong)]'
                                            : 'border-rose-500/30 bg-rose-500/5 opacity-80'
                                    }`}
                                >
                                    {/* Accent top stripe */}
                                    <div
                                        className={`absolute top-0 left-0 right-0 h-0.5 ${
                                            isApproved
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                                : isPending
                                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                                : 'bg-gradient-to-r from-rose-500 to-rose-400'
                                        }`}
                                    />
                                    <div>
                                        {/* Card Header: Selection + Rating + Status Pill */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                {testimonialSelectMode && (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectId(item.id)}
                                                        className="h-4 w-4 rounded accent-[var(--nepal-blue)] cursor-pointer"
                                                    />
                                                )}
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--nepal-blue)] to-indigo-600 text-xs font-black text-white shadow-xs">
                                                    {item.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-bold text-[var(--text-primary)]">
                                                            {item.name}
                                                        </h4>
                                                        {item.is_featured && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                                </svg>
                                                                <span>Featured</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                                                        {item.role && <span>{item.role}</span>}
                                                        <span>•</span>
                                                        <time dateTime={new Date(item.created_at).toISOString()}>
                                                            {formatTimeAgo(item.created_at)}
                                                        </time>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            <div>
                                                {isPending && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <circle cx="12" cy="12" r="10" />
                                                            <polyline points="12 6 12 12 16 14" />
                                                        </svg>
                                                        <span>Pending</span>
                                                    </span>
                                                )}
                                                {isApproved && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span>Approved (Live)</span>
                                                    </span>
                                                )}
                                                {isRejected && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <line x1="18" y1="6" x2="6" y2="18" />
                                                            <line x1="6" y1="6" x2="18" y2="18" />
                                                        </svg>
                                                        <span>Rejected</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stars */}
                                        <div className="mt-3 flex items-center gap-2">
                                            {renderStars(item.rating)}
                                            <span className="text-[11px] font-semibold font-mono tabular-nums text-[var(--text-muted)]">
                                                {item.rating}.0 / 5.0
                                            </span>
                                        </div>

                                        {/* Testimonial Message */}
                                        <div className="mt-2.5 rounded-xl border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/50 p-3 text-xs text-[var(--text-primary)] leading-relaxed relative">
                                            <span className="absolute -top-2 left-3 bg-[var(--surface-primary)] px-1 font-serif text-[13px] text-[var(--text-muted)]">
                                                &ldquo;
                                            </span>
                                            {item.message}
                                        </div>

                                        {/* Private metadata (email, IP) */}
                                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--text-muted)]">
                                            {item.email && (
                                                <span className="inline-flex items-center gap-1">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                                        <polyline points="22,6 12,13 2,6" />
                                                    </svg>
                                                    <span>{privacyMode ? `${item.email.slice(0, 3)}***@***` : item.email}</span>
                                                </span>
                                            )}
                                            {item.ip && (
                                                <span className="inline-flex items-center gap-1 font-mono">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <line x1="2" y1="12" x2="22" y2="12" />
                                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                                    </svg>
                                                    <span>{maskIpAddress(item.ip, privacyMode)}</span>
                                                </span>
                                            )}
                                            {item.admin_notes && (
                                                <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                        <polyline points="14 2 14 8 20 8" />
                                                    </svg>
                                                    <span>Note: {item.admin_notes}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons Footer */}
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-default)]/60 pt-3 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            {/* Approve Button */}
                                            {!isApproved && (
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => onApprove(item)}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition cursor-pointer disabled:opacity-50"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    <span>Approve</span>
                                                </button>
                                            )}

                                            {/* Reject Button */}
                                            {!isRejected && (
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => onReject(item)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <line x1="18" y1="6" x2="6" y2="18" />
                                                        <line x1="6" y1="6" x2="18" y2="18" />
                                                    </svg>
                                                    <span>Reject</span>
                                                </button>
                                            )}

                                            {/* Move back to Pending (if approved or rejected) */}
                                            {!isPending && (
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => onPending(item)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer disabled:opacity-50"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    <span>Move to Pending</span>
                                                </button>
                                            )}

                                            {/* Toggle Featured */}
                                            {isApproved && (
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleToggleFeatured(item.id, item.is_featured)}
                                                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                                                        item.is_featured
                                                            ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                                            : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-amber-500'
                                                    }`}
                                                    title={item.is_featured ? 'Unfeature this testimonial' : 'Feature this testimonial at the top'}
                                                >
                                                    <svg
                                                        width="11"
                                                        height="11"
                                                        viewBox="0 0 24 24"
                                                        fill={item.is_featured ? 'currentColor' : 'none'}
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        aria-hidden="true"
                                                    >
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                    </svg>
                                                    <span>{item.is_featured ? 'Unfeature' : 'Feature'}</span>
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            {/* View Detail Modal */}
                                            <button
                                                type="button"
                                                onClick={() => setActiveDetailItem(item)}
                                                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer"
                                                title="View full details"
                                            >
                                                Details
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTestimonial(item.id, item.name)}
                                                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-600 transition active:scale-95 cursor-pointer"
                                                title="Delete testimonial"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Universal Admin Pagination Bar */}
            <AdminPagination
                currentPage={testimonialPage}
                totalPages={testimonialTotalPages}
                totalItems={testimonialTotal}
                pageSize={testimonialLimit}
                onPageChange={setTestimonialPage}
                onPageSizeChange={setTestimonialLimit}
                pageSizeOptions={[10, 25, 50, 100]}
                itemLabel="testimonials"
                loading={testimonialLoading}
                className="mt-4 rounded-2xl dev-glass-card shadow-xs"
            />

            {/* Testimonial Inspection / Details Modal */}
            {activeDetailItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in"
                    onClick={() => setActiveDetailItem(null)}
                >
                    <div
                        className="relative w-full max-w-lg rounded-3xl dev-glass-card border border-[var(--border-strong)] p-5 sm:p-6 shadow-2xl backdrop-blur-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-sm font-black text-white shadow-xs">
                                    {activeDetailItem.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                                        {activeDetailItem.name}
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {activeDetailItem.role || 'License Applicant'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveDetailItem(null)}
                                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Stars */}
                        <div className="mt-4 flex items-center gap-2">
                            {renderStars(activeDetailItem.rating)}
                            <span className="text-xs font-bold font-mono tabular-nums text-[var(--text-primary)]">
                                {activeDetailItem.rating} out of 5 stars
                            </span>
                        </div>

                        {/* Full Message */}
                        <div className="mt-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-xs leading-relaxed text-[var(--text-primary)]">
                            {activeDetailItem.message}
                        </div>

                        {/* Metadata Details */}
                        <div className="mt-4 space-y-2 rounded-xl border border-[var(--border-default)]/60 bg-[var(--surface-primary)] p-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Status:</span>
                                <span className="font-semibold capitalize text-[var(--text-primary)]">
                                    {activeDetailItem.status}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-[var(--text-muted)]">Submitted At:</span>
                                <span className="font-mono text-[var(--text-primary)]">
                                    {formatNepalDateTime(activeDetailItem.created_at)}
                                </span>
                            </div>
                            {activeDetailItem.email && (
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)]">Email:</span>
                                    <span className="font-mono text-[var(--text-primary)]">
                                        {privacyMode ? `${activeDetailItem.email.slice(0, 3)}***@***` : activeDetailItem.email}
                                    </span>
                                </div>
                            )}
                            {activeDetailItem.ip && (
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)]">IP Address:</span>
                                    <span className="font-mono text-[var(--text-primary)]">
                                        {maskIpAddress(activeDetailItem.ip, privacyMode)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-default)] pt-4 text-xs">
                            {activeDetailItem.status !== 'approved' && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await handleUpdateTestimonialStatus(activeDetailItem.id, 'approved')
                                        setActiveDetailItem((prev) => prev ? { ...prev, status: 'approved' } : null)
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-700 active:scale-95 transition cursor-pointer"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Approve & Publish</span>
                                </button>
                            )}
                            {activeDetailItem.status !== 'rejected' && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        await handleUpdateTestimonialStatus(activeDetailItem.id, 'rejected')
                                        setActiveDetailItem((prev) => prev ? { ...prev, status: 'rejected' } : null)
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3.5 py-1.5 font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition cursor-pointer"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                    <span>Reject</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setActiveDetailItem(null)}
                                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-1.5 font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}
