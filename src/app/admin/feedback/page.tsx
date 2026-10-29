'use client'

import { FeedbackLog, FeedbackStatsData } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo, maskLicenseNumber, maskIpAddress } from '../helpers'
import AdminPagination from '../AdminPagination'

export interface AdminFeedbackProps {
    feedbackLogs?: FeedbackLog[]
    feedbackStats?: FeedbackStatsData | null
    feedbackTotal?: number
    feedbackPage?: number
    feedbackLimit?: number
    feedbackTotalPages?: number
    feedbackSearchFilter?: string
    feedbackStatusFilter?: 'all' | 'new' | 'resolved'
    feedbackCategoryFilter?: string
    feedbackLoading?: boolean
    privacyMode?: boolean
    feedbackSelectMode?: boolean
    selectedFeedbackIds?: string[]
    copiedKey?: string | null
    setFeedbackPage?: (page: number) => void
    setFeedbackLimit?: (limit: number) => void
    setFeedbackSearchFilter?: (filter: string) => void
    setFeedbackStatusFilter?: (status: 'all' | 'new' | 'resolved') => void
    setFeedbackCategoryFilter?: (cat: string) => void
    setFeedbackSelectMode?: (mode: boolean) => void
    setSelectedFeedbackIds?: React.Dispatch<React.SetStateAction<string[]>>
    setSelectedFeedbackMessage?: (msg: FeedbackLog | null) => void
    copyToClipboard?: (text: string, key: string) => void
    handleToggleFeedbackStatus?: (id: string, currentStatus: 'new' | 'resolved') => Promise<void>
    handleBulkFeedbackStatus?: (status: 'new' | 'resolved') => Promise<void>
    handleDeleteFeedback?: (id: string, subject: string) => void
    handleDeleteSelectedFeedback?: () => void
    handleDeleteResolvedFeedback?: () => void
    handleDeleteAllFeedback?: () => void
    startTransition?: (callback: () => void) => void
}

function getCategoryInfo(category: string) {
    switch (category) {
        case 'license_not_found':
            return { label: 'License Not Found', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' }
        case 'notification_issue':
            return { label: 'Email Alerts', cls: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' }
        case 'incorrect_data':
            return { label: 'Incorrect Data', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' }
        case 'dotm_collection':
            return { label: 'DoTM Collection', cls: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' }
        case 'suggestion':
            return { label: 'Suggestion', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' }
        default:
            return { label: 'Other', cls: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20' }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminFeedback(props: any) {
    const {
        feedbackLogs = [],
        feedbackStats = null,
        feedbackTotal = 0,
        feedbackPage = 1,
        feedbackLimit = 10,
        feedbackTotalPages = 1,
        feedbackSearchFilter = '',
        feedbackStatusFilter = 'all',
        feedbackCategoryFilter = 'all',
        feedbackLoading = false,
        privacyMode = true,
        feedbackSelectMode = false,
        selectedFeedbackIds = [],
        copiedKey = null,
        setFeedbackPage = () => {},
        setFeedbackLimit = () => {},
        setFeedbackSearchFilter = () => {},
        setFeedbackStatusFilter = () => {},
        setFeedbackCategoryFilter = () => {},
        setFeedbackSelectMode = () => {},
        setSelectedFeedbackIds = () => {},
        setSelectedFeedbackMessage = () => {},
        copyToClipboard = () => {},
        handleToggleFeedbackStatus = async () => {},
        handleBulkFeedbackStatus = async () => {},
        handleDeleteFeedback = () => {},
        handleDeleteSelectedFeedback = () => {},
        handleDeleteResolvedFeedback = () => {},
        handleDeleteAllFeedback = () => {},
        startTransition = (cb) => cb(),
    }: AdminFeedbackProps = props || {}

    return (
        <section aria-label="Feedback & Support">
            {/* User Feedback & Support KPI Metrics */}
            <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
                {/* Total Inquiries */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--nepal-blue)] to-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Inquiries</span>
                        <span className="rounded-xl bg-[var(--nepal-blue-soft)] p-2 text-[var(--nepal-blue)] shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {(feedbackStats?.total ?? feedbackTotal ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">User messages submitted</p>
                </div>

                {/* New / Action Required */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">New / Unread</span>
                        <span className="rounded-xl bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                            {(feedbackStats?.newCount ?? 0).toLocaleString()}
                        </p>
                        {(feedbackStats?.newCount ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Unresolved
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Awaiting admin review</p>
                </div>

                {/* Resolved */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Resolved</span>
                        <span className="rounded-xl bg-[var(--success-bg)] p-2 text-[var(--success)] shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--success)]">
                        {(feedbackStats?.resolvedCount ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Handled inquiries</p>
                </div>

                {/* Today's Inquiries */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Today</span>
                        <span className="rounded-xl bg-[var(--info-bg)] p-2 text-[var(--info-text)] shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {(feedbackStats?.todayCount ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Submitted today</p>
                </div>
            </div>

            {/* Feedback Search & Filter Toolbar */}
            <div className="mt-4 sm:mt-5 flex flex-col gap-3 dev-glass-card rounded-2xl p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs backdrop-blur-md">
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
                        value={feedbackSearchFilter}
                        onChange={(e) => {
                            setFeedbackSearchFilter(e.target.value)
                            startTransition(() => setFeedbackPage(1))
                        }}
                        placeholder="Filter by name, email, license number, subject, or message..."
                        className="h-9 sm:h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9.5 pr-9 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                    />
                    {feedbackSearchFilter && (
                        <button
                            type="button"
                            onClick={() => {
                                setFeedbackSearchFilter('')
                                setFeedbackPage(1)
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Category Dropdown */}
                    <select
                        value={feedbackCategoryFilter}
                        onChange={(e) => {
                            setFeedbackCategoryFilter(e.target.value)
                            setFeedbackPage(1)
                        }}
                        className="h-8.5 sm:h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:outline-none cursor-pointer"
                    >
                        <option value="all">All Categories</option>
                        <option value="license_not_found">License Not Found</option>
                        <option value="notification_issue">Email Alert Issue</option>
                        <option value="incorrect_data">Incorrect Data</option>
                        <option value="dotm_collection">DoTM Card Collection</option>
                        <option value="suggestion">Website Suggestion</option>
                        <option value="other">General / Other</option>
                    </select>

                    {/* Status Filter */}
                    <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1 text-xs font-semibold">
                        {(['all', 'new', 'resolved'] as const).map((st) => (
                            <button
                                key={st}
                                type="button"
                                onClick={() => {
                                    setFeedbackStatusFilter(st)
                                    setFeedbackPage(1)
                                }}
                                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs capitalize transition cursor-pointer ${
                                    feedbackStatusFilter === st
                                        ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs font-bold'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {st}
                            </button>
                        ))}
                    </div>

                    {/* Page Limit Selector */}
                    <select
                        value={feedbackLimit}
                        onChange={(e) => {
                            setFeedbackLimit(Number(e.target.value))
                            setFeedbackPage(1)
                        }}
                        className="h-8.5 sm:h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] transition focus:border-[var(--nepal-blue)] focus:outline-none cursor-pointer"
                    >
                        <option value="10">10 rows</option>
                        <option value="25">25 rows</option>
                        <option value="50">50 rows</option>
                        <option value="100">100 rows</option>
                    </select>

                    {/* Toggle Multi-Select Mode Button */}
                    <button
                        type="button"
                        disabled={feedbackLogs.length === 0 || feedbackLoading}
                        onClick={() => {
                            if (feedbackSelectMode) {
                                setFeedbackSelectMode(false)
                                setSelectedFeedbackIds([])
                            } else {
                                setFeedbackSelectMode(true)
                            }
                        }}
                        className={`inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                            feedbackSelectMode
                                ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] font-bold'
                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)]'
                        }`}
                        title={feedbackSelectMode ? 'Exit row selection mode' : 'Select multiple rows to resolve or delete'}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span>{feedbackSelectMode ? 'Cancel' : 'Select'}</span>
                    </button>

                    {/* Bulk Resolve Selected */}
                    {feedbackSelectMode && selectedFeedbackIds.length > 0 && (
                        <button
                            type="button"
                            onClick={() => handleBulkFeedbackStatus('resolved')}
                            disabled={feedbackLoading}
                            className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--success-border)] bg-[var(--success)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="Mark selected feedback as resolved"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Resolve ({selectedFeedbackIds.length})</span>
                        </button>
                    )}

                    {/* Bulk Delete Selected */}
                    {feedbackSelectMode && selectedFeedbackIds.length > 0 && (
                        <button
                            type="button"
                            onClick={handleDeleteSelectedFeedback}
                            disabled={feedbackLoading}
                            className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)] bg-[var(--error)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="Delete selected feedback entries"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Delete ({selectedFeedbackIds.length})</span>
                        </button>
                    )}

                    {/* Delete Resolved Feedback */}
                    <button
                        type="button"
                        onClick={handleDeleteResolvedFeedback}
                        disabled={(feedbackStats?.resolvedCount ?? 0) === 0 || feedbackLoading}
                        className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--error-border)] hover:text-[var(--error)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        title="Delete all resolved feedback inquiries"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Delete Resolved ({(feedbackStats?.resolvedCount ?? 0).toLocaleString()})</span>
                    </button>

                    {/* Delete All Feedback */}
                    <button
                        type="button"
                        onClick={handleDeleteAllFeedback}
                        disabled={feedbackTotal === 0 || feedbackLoading}
                        className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)]/80 bg-[var(--error-bg)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold text-[var(--error)] shadow-xs transition hover:bg-[var(--error-border)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        title="Delete all feedback records"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete All</span>
                    </button>
                </div>
            </div>

            {/* Feedback Container (Mobile Cards + Desktop Table) */}
            <div className="mt-4 relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] shadow-sm backdrop-blur-md transition-all">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-70" />

                {/* Mobile Card List (Visible on < md) */}
                <div className="block md:hidden">
                    {feedbackLoading ? (
                        <div className="py-16 text-center text-xs text-[var(--text-muted)]">
                            <div className="flex items-center justify-center gap-2.5">
                                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                <span>Loading feedback records...</span>
                            </div>
                        </div>
                    ) : feedbackLogs.length === 0 ? (
                        <div className="py-16 px-4 text-center text-xs text-[var(--text-muted)]">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-bold text-[var(--text-primary)]">
                                    There is no data in feedback form
                                </span>
                                <p className="max-w-md text-[11px] text-[var(--text-muted)]">
                                    {feedbackSearchFilter || feedbackStatusFilter !== 'all' || feedbackCategoryFilter !== 'all'
                                        ? 'No inquiries match your current search or filter criteria.'
                                        : 'User submitted inquiries and suggestions will appear here once visitors submit feedback through the website.'}
                                </p>
                                {(feedbackSearchFilter || feedbackStatusFilter !== 'all' || feedbackCategoryFilter !== 'all') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFeedbackSearchFilter('')
                                            setFeedbackStatusFilter('all')
                                            setFeedbackCategoryFilter('all')
                                            setFeedbackPage(1)
                                        }}
                                        className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--nepal-blue)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--surface-primary)] active:scale-95 cursor-pointer shadow-2xs"
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Mobile Select-All Header if in select mode */}
                            {feedbackSelectMode && (
                                <div className="flex items-center justify-between border-b border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/70 px-4 py-3 text-xs">
                                    <label className="flex items-center gap-2 font-semibold text-[var(--text-secondary)] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={feedbackLogs.length > 0 && selectedFeedbackIds.length === feedbackLogs.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedFeedbackIds(feedbackLogs.map((l) => l.id))
                                                } else {
                                                    setSelectedFeedbackIds([])
                                                }
                                            }}
                                            className="h-4 w-4 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                        />
                                        <span>Select All on this page ({feedbackLogs.length})</span>
                                    </label>
                                    <span className="text-[11px] text-[var(--text-muted)] font-mono font-semibold">
                                        {selectedFeedbackIds.length} selected
                                    </span>
                                </div>
                            )}

                            <div className="divide-y divide-[var(--border-default)]/50">
                                {feedbackLogs.map((item, idx) => {
                                    const catInfo = getCategoryInfo(item.category)
                                    const isSelected = selectedFeedbackIds.includes(item.id)
                                    const sn = (feedbackPage - 1) * feedbackLimit + idx + 1

                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-4 transition-colors duration-150 space-y-3 ${isSelected ? 'bg-[var(--nepal-blue-soft)]/20' : 'hover:bg-[var(--bg-secondary)]/30'}`}
                                        >
                                            {/* Top Row: Select/SN + Status + Category + Time */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                                    {feedbackSelectMode && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedFeedbackIds((prev) => [...prev, item.id])
                                                                } else {
                                                                    setSelectedFeedbackIds((prev) => prev.filter((id) => id !== item.id))
                                                                }
                                                            }}
                                                            className="h-4 w-4 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                                        />
                                                    )}
                                                    <span className="rounded-lg bg-[var(--bg-secondary)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--text-muted)]">
                                                        #{sn}
                                                    </span>
                                                    {item.status === 'new' ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            <span>New</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            <span>Resolved</span>
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold ${catInfo.cls}`}>
                                                        {catInfo.label}
                                                    </span>
                                                </div>
                                                <span
                                                    className="text-xs font-mono text-[var(--text-muted)] shrink-0"
                                                    title={`${formatNepalDateTime(item.created_at, 'en', true)} (NPT, UTC+5:45)`}
                                                >
                                                    {formatTimeAgo(item.created_at)}
                                                </span>
                                            </div>

                                            {/* Subject */}
                                            <h4 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                                                {item.subject}
                                            </h4>

                                            {/* Submitter & License Row */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                <span className="font-semibold text-[var(--text-primary)]">{item.name}</span>
                                                <a
                                                    href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: [Support] ${item.subject}`)}`}
                                                    className="font-mono text-xs text-[var(--nepal-blue)] hover:underline font-medium"
                                                >
                                                    {item.email}
                                                </a>
                                                {item.license_number && (
                                                    <span className="font-mono text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-lg border border-[var(--border-default)]/70">
                                                        Lic: {maskLicenseNumber(item.license_number, privacyMode)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Message preview snippet */}
                                            <p className="line-clamp-2 text-xs text-[var(--text-secondary)] leading-relaxed rounded-xl bg-[var(--bg-secondary)]/30 border border-[var(--border-default)]/40 p-2.5">
                                                {item.message}
                                            </p>

                                            {/* Card Footer: View Full Message + Action Buttons */}
                                            <div className="flex items-center justify-between gap-2 border-t border-[var(--border-default)]/40 pt-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFeedbackMessage(item)}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                                >
                                                    <span>View Full Message</span>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <line x1="5" y1="12" x2="19" y2="12" />
                                                        <polyline points="12 5 19 12 12 19" />
                                                    </svg>
                                                </button>

                                                <div className="flex items-center gap-1.5">
                                                    {/* Status toggle button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleFeedbackStatus(item.id, item.status)}
                                                        className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs ${
                                                            item.status === 'new'
                                                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                                                : 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                                                        }`}
                                                    >
                                                        {item.status === 'new' ? 'Mark Resolved' : 'Reopen'}
                                                    </button>

                                                    {/* Delete single button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFeedback(item.id, item.subject)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer shadow-2xs"
                                                        title="Delete feedback entry"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                        </div>
                    )}
                </div>

                {/* Desktop Spreadsheet Table (Hidden on < md, visible on md+) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="admin-data-table w-full text-left text-xs">
                        <thead className="border-b border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                            <tr>
                                {feedbackSelectMode && (
                                    <th scope="col" className="w-10 py-3.5 pl-4 pr-1">
                                        <input
                                            type="checkbox"
                                            checked={feedbackLogs.length > 0 && selectedFeedbackIds.length === feedbackLogs.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedFeedbackIds(feedbackLogs.map((l) => l.id))
                                                } else {
                                                    setSelectedFeedbackIds([])
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
                                    Status
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    Submitter
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    Category & Subject
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    License Number
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    Message Preview
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    Received (NPT)
                                </th>
                                <th scope="col" className="py-3.5 pl-3 pr-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]/50">
                            {feedbackLoading ? (
                                <tr>
                                    <td colSpan={feedbackSelectMode ? 9 : 8} className="py-16 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex items-center justify-center gap-2.5">
                                            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                            <span>Loading feedback records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : feedbackLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={feedbackSelectMode ? 9 : 8} className="py-16 px-4 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                                </svg>
                                            </div>
                                            <span className="text-sm font-bold text-[var(--text-primary)]">
                                                There is no data in feedback form
                                            </span>
                                            <p className="max-w-md text-[11px] text-[var(--text-muted)]">
                                                {feedbackSearchFilter || feedbackStatusFilter !== 'all' || feedbackCategoryFilter !== 'all'
                                                    ? 'No inquiries match your current search or filter criteria.'
                                                    : 'User submitted inquiries and suggestions will appear here once visitors submit feedback through the website.'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                feedbackLogs.map((item, idx) => {
                                    const catInfo = getCategoryInfo(item.category)
                                    const isSelected = selectedFeedbackIds.includes(item.id)
                                    const sn = (feedbackPage - 1) * feedbackLimit + idx + 1

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`group transition-colors duration-150 hover:bg-[var(--bg-secondary)]/50 ${isSelected ? 'bg-[var(--nepal-blue-soft)]/20 hover:bg-[var(--nepal-blue-soft)]/30' : ''}`}
                                        >
                                            {/* Checkbox (Visible only in Select mode) */}
                                            {feedbackSelectMode && (
                                                <td className="w-10 py-3.5 pl-4 pr-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedFeedbackIds((prev) => [...prev, item.id])
                                                            } else {
                                                                setSelectedFeedbackIds((prev) => prev.filter((id) => id !== item.id))
                                                            }
                                                        }}
                                                        className="h-4 w-4 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                                    />
                                                </td>
                                            )}

                                            {/* SN */}
                                            <td className="w-12 whitespace-nowrap py-3.5 pl-3 pr-2 text-center font-mono text-[11px] font-semibold text-[var(--text-muted)]">
                                                #{sn}
                                            </td>

                                            {/* Status */}
                                            <td className="whitespace-nowrap py-3.5 pl-2 pr-4">
                                                {item.status === 'new' ? (
                                                    <span className="inline-flex min-w-[88px] items-center justify-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold leading-4 text-amber-600 dark:text-amber-400">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        <span>New</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex min-w-[88px] items-center justify-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold leading-4 text-emerald-600 dark:text-emerald-400">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span>Resolved</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Submitter */}
                                            <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                                                <div className="flex flex-col gap-0 leading-tight">
                                                    <span className="text-[11.5px] font-semibold text-[var(--text-primary)]">
                                                        {item.name}
                                                    </span>
                                                    <a
                                                        href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: [Support] ${item.subject}`)}`}
                                                        className="font-mono text-[10.5px] font-medium text-[var(--text-muted)] hover:text-[var(--nepal-blue)] hover:underline"
                                                        title="Send email reply"
                                                    >
                                                        {item.email}
                                                    </a>
                                                    {item.ip && (
                                                        <span className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]/80">
                                                            IP: {maskIpAddress(item.ip, privacyMode)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Category & Subject */}
                                            <td className="px-4 py-3.5 text-xs max-w-xs">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex w-fit items-center rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase leading-4 tracking-wide ${catInfo.cls}`}>
                                                        {catInfo.label}
                                                    </span>
                                                    <span className="truncate text-[11.5px] font-semibold text-[var(--text-primary)]" title={item.subject}>
                                                        {item.subject}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* License Number */}
                                            <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                                                {item.license_number ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="rounded-md border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/60 px-2 py-0.5 font-mono text-[11.5px] font-bold leading-4 text-[var(--text-primary)]">
                                                            {maskLicenseNumber(item.license_number, privacyMode)}
                                                        </span>
                                                        {!privacyMode && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(item.license_number!, `fb-lic-${item.id}`)}
                                                                className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-muted)] transition-all duration-150 hover:bg-[var(--bg-secondary)] hover:text-[var(--nepal-blue)] active:scale-90 cursor-pointer"
                                                                title="Copy license number"
                                                            >
                                                                {copiedKey === `fb-lic-${item.id}` ? (
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
                                                ) : (
                                                    <span className="text-[11px] text-[var(--text-muted)] italic">—</span>
                                                )}
                                            </td>

                                            {/* Message Preview */}
                                            <td className="px-4 py-3.5 text-xs max-w-sm">
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="line-clamp-2 text-[11px] leading-snug text-[var(--text-secondary)]">
                                                        {item.message}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedFeedbackMessage(item)}
                                                        className="w-fit inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                                    >
                                                        <span>View Full Message</span>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <line x1="5" y1="12" x2="19" y2="12" />
                                                            <polyline points="12 5 19 12 12 19" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Received */}
                                            <td className="whitespace-nowrap px-4 py-3.5 text-xs" title={`${formatNepalDateTime(item.created_at, 'en', true)} (NPT, UTC+5:45)`}>
                                                <div className="flex flex-col gap-0 font-mono leading-tight">
                                                    <span className="text-[10.5px] font-semibold text-[var(--text-primary)]">
                                                        {formatNepalDateTime(item.created_at)}
                                                    </span>
                                                    <span className="font-sans text-[10px] text-[var(--text-muted)]">
                                                        {formatTimeAgo(item.created_at)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleFeedbackStatus(item.id, item.status)}
                                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-all duration-150 hover:-translate-y-px active:scale-95 cursor-pointer shadow-2xs ${
                                                            item.status === 'new'
                                                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white'
                                                                : 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white'
                                                        }`}
                                                        title={item.status === 'new' ? 'Mark as Resolved' : 'Re-open as New'}
                                                    >
                                                        {item.status === 'new' ? (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        ) : (
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <path d="M1 4v6h6" />
                                                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFeedback(item.id, item.subject)}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)]/80 bg-[var(--surface-primary)] text-[var(--text-muted)] transition-all duration-150 hover:-translate-y-px hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer shadow-2xs"
                                                        title="Delete feedback entry"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                    currentPage={feedbackPage}
                    totalPages={feedbackTotalPages}
                    totalItems={feedbackTotal}
                    pageSize={feedbackLimit}
                    onPageChange={setFeedbackPage}
                    onPageSizeChange={setFeedbackLimit}
                    pageSizeOptions={[10, 25, 50, 100, 200]}
                    itemLabel="inquiries"
                    loading={feedbackLoading}
                />
            </div>
        </section>
    )
}
