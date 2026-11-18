'use client'

import { FeedbackLog, FeedbackStatus, FeedbackStatsData } from '../types'
import { FEEDBACK_CATEGORIES } from '@/lib/feedback'
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
    feedbackStatusFilter?: 'all' | 'new' | 'in_progress' | 'resolved'
    feedbackCategoryFilter?: string
    feedbackLoading?: boolean
    privacyMode?: boolean
    feedbackSelectMode?: boolean
    selectedFeedbackIds?: string[]
    copiedKey?: string | null
    setFeedbackPage?: (page: number) => void
    setFeedbackLimit?: (limit: number) => void
    setFeedbackSearchFilter?: (filter: string) => void
    setFeedbackStatusFilter?: (status: 'all' | 'new' | 'in_progress' | 'resolved') => void
    setFeedbackCategoryFilter?: (cat: string) => void
    setFeedbackSelectMode?: (mode: boolean) => void
    setSelectedFeedbackIds?: React.Dispatch<React.SetStateAction<string[]>>
    setSelectedFeedbackMessage?: (msg: FeedbackLog | null) => void
    copyToClipboard?: (text: string, key: string) => void
    handleToggleFeedbackStatus?: (id: string, currentStatus: FeedbackStatus) => Promise<void>
    handleSetFeedbackStatus?: (id: string, status: FeedbackStatus) => Promise<void>
    handleSendTrackingEmail?: (id: string) => Promise<boolean>
    handleBulkFeedbackStatus?: (status: FeedbackStatus) => Promise<void>
    handleDeleteFeedback?: (id: string, subject: string) => void
    handleDeleteSelectedFeedback?: () => void
    handleDeleteResolvedFeedback?: () => void
    handleDeleteAllFeedback?: () => void
    startTransition?: (callback: () => void) => void
}

function getCategoryInfo(category: string) {
    const found = FEEDBACK_CATEGORIES.find((c) => c.id === category)
    let cls = 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
    const label = found?.label ? found.label.replace(/^(Problem|Inquiry|Suggestion|Other):\s*/, '') : category || 'Other'
    const labelNe = found?.labelNe || 'अन्य'
    const isProblem = found?.isProblem ?? (category.includes('problem') || category.includes('issue'))

    switch (category) {
        case 'license_not_found':
            cls = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
            break
        case 'notification_issue':
            cls = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
            break
        case 'incorrect_data':
            cls = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            break
        case 'dotm_collection':
            cls = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
            break
        case 'suggestion':
            cls = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
            break
        default:
            cls = 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
    }

    return { label, labelNe, isProblem, cls }
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
        handleSetFeedbackStatus = async () => {},
        handleSendTrackingEmail = async () => false,
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
            <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
                {/* Total Inquiries */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--nepal-blue)] to-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total</span>
                        <span className="rounded-xl bg-[var(--nepal-blue-soft)] p-2 text-[var(--nepal-blue)] shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {(feedbackStats?.total ?? feedbackTotal ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">All user messages</p>
                </div>

                {/* New / Action Required */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">New</span>
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

                {/* In Progress */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">In Progress</span>
                        <span className="rounded-xl bg-blue-500/15 p-2 text-blue-600 dark:text-blue-400 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                        <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-blue-600 dark:text-blue-400">
                            {(feedbackStats?.inProgressCount ?? 0).toLocaleString()}
                        </p>
                        {(feedbackStats?.inProgressCount ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                Active
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Being investigated</p>
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
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group col-span-2 sm:col-span-1">
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
                        {([
                            { id: 'all', label: 'All' },
                            { id: 'new', label: 'New' },
                            { id: 'in_progress', label: 'In Progress' },
                            { id: 'resolved', label: 'Resolved' },
                        ] as const).map(({ id, label }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => {
                                    setFeedbackStatusFilter(id)
                                    setFeedbackPage(1)
                                }}
                                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs transition cursor-pointer ${
                                    feedbackStatusFilter === id
                                        ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs font-bold'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {label}
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

                    {/* Bulk In Progress Selected */}
                    {feedbackSelectMode && selectedFeedbackIds.length > 0 && (
                        <button
                            type="button"
                            onClick={() => handleBulkFeedbackStatus('in_progress')}
                            disabled={feedbackLoading}
                            className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-600 px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold text-white shadow-xs transition hover:bg-blue-700 active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="Mark selected feedback as in progress"
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            <span>In Progress ({selectedFeedbackIds.length})</span>
                        </button>
                    )}

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

                    {/* Bulk Reopen as New */}
                    {feedbackSelectMode && selectedFeedbackIds.length > 0 && (
                        <button
                            type="button"
                            onClick={() => handleBulkFeedbackStatus('new')}
                            disabled={feedbackLoading}
                            className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500 px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold text-white shadow-xs transition hover:bg-amber-600 active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="Reopen selected feedback as new"
                        >
                            <span>Reopen ({selectedFeedbackIds.length})</span>
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
                                            {/* Top Row: Select/SN + Tracking Ref + Status + Category + Time */}
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
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

                                                    {/* Tracking Ref Badge */}
                                                    <div className="inline-flex items-center gap-1 rounded-md border border-[var(--border-default)]/80 bg-[var(--surface-primary)] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[var(--nepal-blue)] shadow-2xs">
                                                        <span>#{item.id}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(item.id, `fb-ref-m-${item.id}`)}
                                                            className="p-0.5 text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                            title="Copy Reference ID"
                                                        >
                                                            {copiedKey === `fb-ref-m-${item.id}` ? (
                                                                <span className="text-emerald-500 font-bold text-[10px]">✓</span>
                                                            ) : (
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>

                                                    {/* Status Pill */}
                                                    {item.status === 'new' ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-600 dark:text-amber-400">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            <span>New</span>
                                                        </span>
                                                    ) : item.status === 'in_progress' ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-bold text-blue-600 dark:text-blue-400">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                            <span>In Progress</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            <span>Resolved</span>
                                                        </span>
                                                    )}

                                                    {item.admin_notes && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                                            <span>💬 Replied</span>
                                                        </span>
                                                    )}

                                                    <span
                                                        className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold ${catInfo.cls}`}
                                                        title={catInfo.labelNe ? `${catInfo.label} (${catInfo.labelNe})` : catInfo.label}
                                                    >
                                                        {catInfo.isProblem ? '⚠️ ' : '💬 '}
                                                        {catInfo.label}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <a
                                                        href={`/feedback?email=${encodeURIComponent(item.email)}&id=${encodeURIComponent(item.id)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--nepal-blue)] hover:underline"
                                                        title="Track inquiry status online"
                                                    >
                                                        <span>Track</span>
                                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                            <polyline points="15 3 21 3 21 9" />
                                                            <line x1="10" y1="14" x2="21" y2="3" />
                                                        </svg>
                                                    </a>
                                                    <span
                                                        className="text-xs font-mono text-[var(--text-muted)]"
                                                        title={`${formatNepalDateTime(item.created_at, 'en', true)} (NPT, UTC+5:45)`}
                                                    >
                                                        {formatTimeAgo(item.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Subject */}
                                            <h4 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                                                {item.subject}
                                            </h4>

                                            {/* Submitter, License & IP Row */}
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                <span className="font-semibold text-[var(--text-primary)]">{item.name}</span>
                                                <div className="flex items-center gap-1">
                                                    <a
                                                        href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: [Support #${item.id}] ${item.subject}`)}`}
                                                        className="font-mono text-xs text-[var(--nepal-blue)] hover:underline font-medium"
                                                    >
                                                        {item.email}
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(item.email, `fb-em-m-${item.id}`)}
                                                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                        title="Copy email"
                                                    >
                                                        {copiedKey === `fb-em-m-${item.id}` ? '✓' : (
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                                {item.license_number && (
                                                    <div className="flex items-center gap-1 font-mono text-xs font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-lg border border-[var(--border-default)]/70">
                                                        <span>Lic: {maskLicenseNumber(item.license_number, privacyMode)}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(item.license_number!, `fb-lic-m-${item.id}`)}
                                                            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--nepal-blue)]"
                                                            title="Copy license number"
                                                        >
                                                            {copiedKey === `fb-lic-m-${item.id}` ? '✓' : (
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                                {item.ip && (
                                                    <span className="font-mono text-[10.5px] text-[var(--text-muted)]">
                                                        IP: {maskIpAddress(item.ip, privacyMode)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Message preview snippet */}
                                            <p className="line-clamp-2 text-xs text-[var(--text-secondary)] leading-relaxed rounded-xl bg-[var(--bg-secondary)]/30 border border-[var(--border-default)]/40 p-2.5">
                                                {item.message}
                                            </p>

                                            {/* Admin Resolution Note (if present) */}
                                            {item.admin_notes && (
                                                <div className="rounded-xl bg-[var(--nepal-blue)]/5 border border-[var(--nepal-blue)]/20 p-2.5 text-xs">
                                                    <span className="font-bold text-[var(--nepal-blue)] block text-[10.5px] uppercase tracking-wider mb-0.5">
                                                        Official Admin Resolution:
                                                    </span>
                                                    <p className="italic text-[var(--text-secondary)] text-[11px] leading-relaxed">
                                                        &quot;{item.admin_notes}&quot;
                                                    </p>
                                                </div>
                                            )}

                                            {/* Timeline Info */}
                                            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono pt-1">
                                                <span>Received: {formatNepalDateTime(item.created_at)}</span>
                                                {item.updated_at && item.updated_at > item.created_at + 1000 && (
                                                    <span className="text-[var(--nepal-blue)] font-semibold">
                                                        Updated {formatTimeAgo(item.updated_at)}
                                                    </span>
                                                )}
                                            </div>

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

                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {/* Quick status transitions */}
                                                    {item.status === 'new' ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'in_progress')}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Set status to In Progress"
                                                            >
                                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                                <span>In Progress</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'resolved')}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Mark as Resolved"
                                                            >
                                                                <span>Resolve</span>
                                                            </button>
                                                        </>
                                                    ) : item.status === 'in_progress' ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'resolved')}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white transition active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Mark as Resolved"
                                                            >
                                                                <span>Resolve</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'new')}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Reopen as New"
                                                            >
                                                                <span>Reopen</span>
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'in_progress')}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Move back to In Progress"
                                                            >
                                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                                <span>In Progress</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'new')}
                                                                className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Reopen as New"
                                                            >
                                                                <span>Reopen</span>
                                                            </button>
                                                        </>
                                                    )}

                                                    {/* Send tracking reference email */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSendTrackingEmail(item.id)}
                                                        className="inline-flex h-8 items-center gap-1 rounded-xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition active:scale-95 cursor-pointer shadow-2xs"
                                                        title="Manually email tracking reference number & portal link to user"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                        </svg>
                                                        <span>Send Ref</span>
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
                                <th scope="col" className="w-10 py-3.5 pl-3 pr-2 text-center">
                                    SN
                                </th>
                                <th scope="col" className="px-3.5 py-3.5 whitespace-nowrap">
                                    Tracking Ref
                                </th>
                                <th scope="col" className="py-3.5 pl-2 pr-3 whitespace-nowrap">
                                    Status &amp; Reply
                                </th>
                                <th scope="col" className="px-3.5 py-3.5">
                                    Submitter
                                </th>
                                <th scope="col" className="px-3.5 py-3.5">
                                    Category &amp; Subject
                                </th>
                                <th scope="col" className="px-3.5 py-3.5 whitespace-nowrap">
                                    License Number
                                </th>
                                <th scope="col" className="px-3.5 py-3.5 min-w-[220px]">
                                    Message &amp; Resolution Note
                                </th>
                                <th scope="col" className="px-3.5 py-3.5 whitespace-nowrap">
                                    Timeline (NPT)
                                </th>
                                <th scope="col" className="py-3.5 pl-3 pr-4 text-right whitespace-nowrap">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]/50">
                            {feedbackLoading ? (
                                <tr>
                                    <td colSpan={feedbackSelectMode ? 10 : 9} className="py-16 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex items-center justify-center gap-2.5">
                                            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                            <span>Loading feedback records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : feedbackLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={feedbackSelectMode ? 10 : 9} className="py-16 px-4 text-center text-xs text-[var(--text-muted)]">
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
                                            <td className="w-10 whitespace-nowrap py-3.5 pl-3 pr-2 text-center font-mono text-[11px] font-semibold text-[var(--text-muted)]">
                                                #{sn}
                                            </td>

                                            {/* Tracking Reference ID */}
                                            <td className="whitespace-nowrap px-3.5 py-3.5 text-xs">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <div className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)]/80 bg-[var(--surface-primary)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--nepal-blue)] shadow-2xs group-hover:border-[var(--nepal-blue)]/50 transition">
                                                        <span>#{item.id}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(item.id, `fb-ref-${item.id}`)}
                                                            className="inline-flex h-4 w-4 items-center justify-center text-[var(--text-muted)] hover:text-[var(--nepal-blue)] active:scale-90 transition cursor-pointer"
                                                            title="Copy Tracking Reference ID"
                                                        >
                                                            {copiedKey === `fb-ref-${item.id}` ? (
                                                                <span className="text-emerald-500 text-[10px] font-sans font-black">✓</span>
                                                            ) : (
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <a
                                                        href={`/feedback?email=${encodeURIComponent(item.email)}&id=${encodeURIComponent(item.id)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--nepal-blue)] hover:underline"
                                                        title="Open live public tracking portal in new tab"
                                                    >
                                                        <span>Track Online</span>
                                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                            <polyline points="15 3 21 3 21 9" />
                                                            <line x1="10" y1="14" x2="21" y2="3" />
                                                        </svg>
                                                    </a>
                                                </div>
                                            </td>

                                            {/* Status & Reply Indicator */}
                                            <td className="whitespace-nowrap py-3.5 pl-2 pr-3">
                                                <div className="flex flex-col items-start gap-1">
                                                    <select
                                                        value={item.status}
                                                        onChange={(e) => handleSetFeedbackStatus(item.id, e.target.value as FeedbackStatus)}
                                                        aria-label="Update inquiry status"
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-bold cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/30 ${
                                                            item.status === 'new'
                                                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                                : item.status === 'in_progress'
                                                                ? 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                                : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                        }`}
                                                    >
                                                        <option value="new" className="bg-[var(--surface-primary)] text-amber-600 font-bold">🟡 Pending</option>
                                                        <option value="in_progress" className="bg-[var(--surface-primary)] text-blue-600 font-bold">🔵 In Progress</option>
                                                        <option value="resolved" className="bg-[var(--surface-primary)] text-emerald-600 font-bold">🟢 Resolved</option>
                                                    </select>
                                                    {item.admin_notes ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.2 text-[9.5px] font-bold text-blue-600 dark:text-blue-400" title="Official admin reply sent">
                                                            <span>💬 Replied</span>
                                                        </span>
                                                    ) : item.status === 'new' ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 text-[9.5px] font-semibold text-amber-600 dark:text-amber-400" title="No reply sent yet">
                                                            <span>⏳ Unanswered</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.2 text-[9.5px] font-semibold text-blue-600 dark:text-blue-400" title="Under active review">
                                                            <span>🔍 In Review</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Submitter */}
                                            <td className="whitespace-nowrap px-3.5 py-3.5 text-xs">
                                                <div className="flex flex-col gap-0.5 leading-tight">
                                                    <span className="text-[11.5px] font-bold text-[var(--text-primary)]">
                                                        {item.name}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <a
                                                            href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: [Support #${item.id}] ${item.subject}`)}`}
                                                            className="font-mono text-[10.5px] font-medium text-[var(--nepal-blue)] hover:underline truncate max-w-[150px]"
                                                            title={`Send email to ${item.email}`}
                                                        >
                                                            {item.email}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(item.email, `fb-em-${item.id}`)}
                                                            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                            title="Copy email"
                                                        >
                                                            {copiedKey === `fb-em-${item.id}` ? (
                                                                <span className="text-emerald-500 font-bold">✓</span>
                                                            ) : (
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                    {item.ip && (
                                                        <span className="font-mono text-[9.5px] text-[var(--text-muted)]">
                                                            IP: {maskIpAddress(item.ip, privacyMode)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Category & Subject */}
                                            <td className="px-3.5 py-3.5 text-xs max-w-xs">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        <span
                                                            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold uppercase leading-4 tracking-wide ${catInfo.cls}`}
                                                            title={catInfo.labelNe ? `${catInfo.label} (${catInfo.labelNe})` : catInfo.label}
                                                        >
                                                            {catInfo.isProblem ? '⚠️ ' : '💬 '}
                                                            {catInfo.label}
                                                        </span>
                                                    </div>
                                                    <span className="truncate text-[11.5px] font-semibold text-[var(--text-primary)]" title={item.subject}>
                                                        {item.subject}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* License Number */}
                                            <td className="whitespace-nowrap px-3.5 py-3.5 text-xs">
                                                {item.license_number ? (
                                                    <div className="flex items-center gap-1">
                                                        <span className="rounded-md border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/60 px-2 py-0.5 font-mono text-[11.5px] font-bold leading-4 text-[var(--text-primary)]">
                                                            {maskLicenseNumber(item.license_number, privacyMode)}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(item.license_number!, `fb-lic-${item.id}`)}
                                                            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-muted)] transition-all duration-150 hover:bg-[var(--bg-secondary)] hover:text-[var(--nepal-blue)] active:scale-90 cursor-pointer"
                                                            title="Copy license number"
                                                        >
                                                            {copiedKey === `fb-lic-${item.id}` ? (
                                                                <span className="text-emerald-500 text-[10px] font-bold">✓</span>
                                                            ) : (
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-[var(--text-muted)] italic">Not provided</span>
                                                )}
                                            </td>

                                            {/* Message & Resolution Note */}
                                            <td className="px-3.5 py-3.5 text-xs max-w-sm">
                                                <div className="flex flex-col gap-1">
                                                    <p className="line-clamp-2 text-[11px] leading-snug text-[var(--text-secondary)]">
                                                        {item.message}
                                                    </p>
                                                    {item.admin_notes && (
                                                        <div className="flex items-start gap-1 rounded-md bg-[var(--nepal-blue)]/5 border border-[var(--nepal-blue)]/15 px-2 py-1 text-[10px] leading-tight">
                                                            <span className="font-bold text-[var(--nepal-blue)] shrink-0">Admin:</span>
                                                            <span className="text-[var(--text-secondary)] line-clamp-1 italic font-sans" title={item.admin_notes}>
                                                                &quot;{item.admin_notes}&quot;
                                                            </span>
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedFeedbackMessage(item)}
                                                        className="w-fit inline-flex items-center gap-1 text-[10.5px] font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                                    >
                                                        <span>View Details / Reply</span>
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <line x1="5" y1="12" x2="19" y2="12" />
                                                            <polyline points="12 5 19 12 12 19" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Received / Updated Timeline */}
                                            <td className="whitespace-nowrap px-3.5 py-3.5 text-xs" title={`${formatNepalDateTime(item.created_at, 'en', true)} (NPT, UTC+5:45)`}>
                                                <div className="flex flex-col gap-0 font-mono leading-tight">
                                                    <span className="text-[10.5px] font-semibold text-[var(--text-primary)]">
                                                        {formatNepalDateTime(item.created_at)}
                                                    </span>
                                                    <span className="font-sans text-[10px] text-[var(--text-muted)]">
                                                        {formatTimeAgo(item.created_at)}
                                                    </span>
                                                    {item.updated_at && item.updated_at > item.created_at + 1000 && (
                                                        <span className="font-sans text-[9px] font-semibold text-[var(--nepal-blue)] mt-0.5">
                                                            Updated {formatTimeAgo(item.updated_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-right">
                                                <div className="inline-flex items-center gap-1.5 justify-end">
                                                    {item.status === 'new' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'in_progress')}
                                                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2 text-[10.5px] font-bold text-blue-600 dark:text-blue-400 transition-all duration-150 hover:-translate-y-px hover:bg-blue-600 hover:text-white active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Mark In Progress"
                                                            >
                                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                                <span>In Progress</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'resolved')}
                                                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-150 hover:-translate-y-px hover:bg-emerald-600 hover:text-white active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Mark Resolved"
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                                <span>Resolve</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.status === 'in_progress' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'resolved')}
                                                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 transition-all duration-150 hover:-translate-y-px hover:bg-emerald-600 hover:text-white active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Mark Resolved"
                                                            >
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                                <span>Resolve</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'new')}
                                                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 text-[10.5px] font-bold text-amber-600 dark:text-amber-400 transition-all duration-150 hover:-translate-y-px hover:bg-amber-500 hover:text-white active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Reopen as Pending"
                                                            >
                                                                <span>↺ Pending</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {item.status === 'resolved' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'in_progress')}
                                                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-blue-500/40 bg-blue-500/10 px-2 text-[10.5px] font-bold text-blue-600 dark:text-blue-400 transition-all duration-150 hover:-translate-y-px hover:bg-blue-600 hover:text-white active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Move back to In Progress"
                                                            >
                                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                                <span>In Progress</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeedbackStatus(item.id, 'new')}
                                                                className="inline-flex h-7 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 text-[10.5px] font-bold text-amber-600 dark:text-amber-400 transition-all duration-150 hover:-translate-y-px hover:bg-amber-500 hover:text-white active:scale-95 cursor-pointer shadow-2xs"
                                                                title="Reopen as Pending"
                                                            >
                                                                <span>↺ Reopen</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {/* Send tracking reference email */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSendTrackingEmail(item.id)}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)]/80 bg-[var(--surface-primary)] text-[var(--text-muted)] transition-all duration-150 hover:-translate-y-px hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer shadow-2xs"
                                                        title="Email tracking reference number & portal link to user"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                        </svg>
                                                    </button>
                                                    {/* View Details / Open modal */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedFeedbackMessage(item)}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)]/80 bg-[var(--surface-primary)] text-[var(--text-muted)] transition-all duration-150 hover:-translate-y-px hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer shadow-2xs"
                                                        title="View full inquiry details and reply"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </button>
                                                    {/* Delete single button */}
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
