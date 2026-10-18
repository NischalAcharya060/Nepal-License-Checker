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
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 sm:p-4 sm:rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Inquiries</span>
                        <span className="rounded-lg bg-[var(--nepal-blue-soft)] p-1.5 text-[var(--nepal-blue)]">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                        {(feedbackStats?.total ?? feedbackTotal ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-muted)]">User messages submitted</p>
                </div>

                {/* New / Action Required */}
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 sm:p-4 sm:rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">New / Unread</span>
                        <span className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                        {(feedbackStats?.newCount ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Awaiting admin review</p>
                </div>

                {/* Resolved */}
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 sm:p-4 sm:rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Resolved</span>
                        <span className="rounded-lg bg-[var(--success-bg)] p-1.5 text-[var(--success)]">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black tracking-tight text-[var(--success)]">
                        {(feedbackStats?.resolvedCount ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Handled inquiries</p>
                </div>

                {/* Today's Inquiries */}
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 sm:p-4 sm:rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Today</span>
                        <span className="rounded-lg bg-[var(--info-bg)] p-1.5 text-[var(--info-text)]">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                        {(feedbackStats?.todayCount ?? 0).toLocaleString()}
                    </p>
                    <p className="mt-0.5 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Submitted today</p>
                </div>
            </div>

            {/* Feedback Search & Filter Toolbar */}
            <div className="mt-4 sm:mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 shadow-sm">
                <div className="relative flex-1">
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
                        className="h-9 sm:h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9 pr-9 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                    />
                    {feedbackSearchFilter && (
                        <button
                            type="button"
                            onClick={() => {
                                setFeedbackSearchFilter('')
                                setFeedbackPage(1)
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                        className="h-8.5 sm:h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:outline-none"
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
                                className={`rounded-lg px-2 py-1 text-[11px] sm:px-2.5 sm:text-xs capitalize transition ${
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
                        className="h-8.5 sm:h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 sm:px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] transition focus:border-[var(--nepal-blue)] focus:outline-none"
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
                        className={`inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                            feedbackSelectMode
                                ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] font-bold'
                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)]'
                        }`}
                        title={feedbackSelectMode ? 'Exit row selection mode' : 'Select multiple rows to resolve or delete'}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                            className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--success-border)] bg-[var(--success)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                            title="Mark selected feedback as resolved"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                            className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)] bg-[var(--error)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50"
                            title="Delete selected feedback entries"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                        className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--error-border)] hover:text-[var(--error)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Delete all resolved feedback inquiries"
                    >
                        <span>Delete Resolved ({feedbackStats?.resolvedCount ?? 0})</span>
                    </button>

                    {/* Delete All Feedback */}
                    <button
                        type="button"
                        onClick={handleDeleteAllFeedback}
                        disabled={feedbackTotal === 0 || feedbackLoading}
                        className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)]/80 bg-[var(--error-bg)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold text-[var(--error)] shadow-xs transition hover:bg-[var(--error-border)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Delete all feedback records"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete All</span>
                    </button>
                </div>
            </div>

            {/* Feedback Container (Mobile Cards + Desktop Table) */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm">
                {/* Mobile Card List (Visible on < md) */}
                <div className="block md:hidden">
                    {feedbackLoading ? (
                        <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                            <div className="flex items-center justify-center gap-2">
                                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                <span>Loading feedback records...</span>
                            </div>
                        </div>
                    ) : feedbackLogs.length === 0 ? (
                        <div className="py-12 px-4 text-center text-xs text-[var(--text-muted)]">
                            <div className="flex flex-col items-center justify-center gap-2.5">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-xl text-[var(--nepal-blue)]">
                                    💬
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
                                        className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--nepal-blue)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--surface-primary)]"
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
                                <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/70 px-3.5 py-2.5 text-xs">
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
                                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                                        {selectedFeedbackIds.length} selected
                                    </span>
                                </div>
                            )}

                            <div className="divide-y divide-[var(--border-default)]/60">
                                {feedbackLogs.map((item, idx) => {
                                    const catInfo = getCategoryInfo(item.category)
                                    const isSelected = selectedFeedbackIds.includes(item.id)
                                    const sn = (feedbackPage - 1) * feedbackLimit + idx + 1

                                    return (
                                        <div
                                            key={item.id}
                                            className={`p-3.5 transition-colors ${isSelected ? 'bg-[var(--nepal-blue-soft)]/25' : 'hover:bg-[var(--bg-secondary)]/30'}`}
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
                                                    <span className="rounded-md bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--text-muted)]">
                                                        #{sn}
                                                    </span>
                                                    {item.status === 'new' ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            <span>New</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success)]/30 bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            <span>Resolved</span>
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9px] font-bold ${catInfo.cls}`}>
                                                        {catInfo.label}
                                                    </span>
                                                </div>
                                                <span
                                                    className="text-[11px] font-medium text-[var(--text-muted)] shrink-0"
                                                    title={`${formatNepalDateTime(item.created_at, 'en', true)} (NPT, UTC+5:45)`}
                                                >
                                                    {formatTimeAgo(item.created_at)}
                                                </span>
                                            </div>

                                            {/* Subject */}
                                            <h4 className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                                                {item.subject}
                                            </h4>

                                            {/* Submitter & License Row */}
                                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                                <span className="font-semibold text-[var(--text-primary)]">{item.name}</span>
                                                <a
                                                    href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: [Support] ${item.subject}`)}`}
                                                    className="font-mono text-[11px] text-[var(--nepal-blue)] hover:underline"
                                                >
                                                    {item.email}
                                                </a>
                                                {item.license_number && (
                                                    <span className="font-mono text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                                                        Lic: {maskLicenseNumber(item.license_number, privacyMode)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Message preview snippet */}
                                            <p className="mt-1.5 line-clamp-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                                                {item.message}
                                            </p>

                                            {/* Card Footer: View Full Message + Action Buttons */}
                                            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--border-default)]/40 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFeedbackMessage(item)}
                                                    className="text-xs font-bold text-[var(--nepal-blue)] hover:underline"
                                                >
                                                    View Full Message →
                                                </button>

                                                <div className="flex items-center gap-1.5">
                                                    {/* Status toggle button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleFeedbackStatus(item.id, item.status)}
                                                        className={`inline-flex h-7.5 items-center gap-1 rounded-lg border px-2 text-[11px] font-bold transition ${
                                                            item.status === 'new'
                                                                ? 'border-[var(--success)]/40 bg-[var(--success-bg)] text-[var(--success)]'
                                                                : 'border-amber-500/30 bg-amber-500/10 text-amber-600'
                                                        }`}
                                                    >
                                                        {item.status === 'new' ? 'Mark Resolved' : 'Reopen'}
                                                    </button>

                                                    {/* Delete single button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFeedback(item.id, item.subject)}
                                                        className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)]"
                                                        title="Delete feedback entry"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            <tr>
                                {feedbackSelectMode && (
                                    <th scope="col" className="w-9 py-3 pl-4 pr-1">
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
                                            className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                            title="Select all on this page"
                                        />
                                    </th>
                                )}
                                <th scope="col" className="w-10 py-3 pl-3 pr-2 text-center">
                                    SN
                                </th>
                                <th scope="col" className="py-3 pl-2 pr-3">
                                    Status
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Submitter
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Category & Subject
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    License Number
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Message Preview
                                </th>
                                <th scope="col" className="px-3 py-3">
                                    Received (NPT)
                                </th>
                                <th scope="col" className="py-3 pl-3 pr-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]/60">
                            {feedbackLoading ? (
                                <tr>
                                    <td colSpan={feedbackSelectMode ? 9 : 8} className="py-12 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                            <span>Loading feedback records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : feedbackLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={feedbackSelectMode ? 9 : 8} className="py-12 px-4 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center justify-center gap-2.5">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-xl text-[var(--nepal-blue)]">
                                                💬
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
                                            className={`group transition-colors hover:bg-[var(--bg-secondary)]/40 ${isSelected ? 'bg-[var(--nepal-blue-soft)]/30' : ''}`}
                                        >
                                            {/* Checkbox (Visible only in Select mode) */}
                                            {feedbackSelectMode && (
                                                <td className="w-9 py-3 pl-4 pr-1">
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
                                                        className="h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                                    />
                                                </td>
                                            )}

                                            {/* SN */}
                                            <td className="w-10 whitespace-nowrap py-3 pl-3 pr-2 text-center font-mono text-[11px] font-bold text-[var(--text-muted)]">
                                                {sn}
                                            </td>

                                            {/* Status */}
                                            <td className="whitespace-nowrap py-3 pl-2 pr-3">
                                                {item.status === 'new' ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        <span>New</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/30 bg-[var(--success-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--success)]">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span>Resolved</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* Submitter */}
                                            <td className="whitespace-nowrap px-3 py-3 text-xs">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[var(--text-primary)]">
                                                        {item.name}
                                                    </span>
                                                    <a
                                                        href={`mailto:${item.email}?subject=${encodeURIComponent(`Re: [Support] ${item.subject}`)}`}
                                                        className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--nepal-blue)] hover:underline"
                                                        title="Send email reply"
                                                    >
                                                        {item.email}
                                                    </a>
                                                    {item.ip && (
                                                        <span className="text-[10px] text-[var(--text-muted)]/80">
                                                            IP: {maskIpAddress(item.ip, privacyMode)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Category & Subject */}
                                            <td className="px-3 py-3 text-xs max-w-xs">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${catInfo.cls}`}>
                                                        {catInfo.label}
                                                    </span>
                                                    <span className="font-bold text-[var(--text-primary)] truncate" title={item.subject}>
                                                        {item.subject}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* License Number */}
                                            <td className="whitespace-nowrap px-3 py-3 text-xs">
                                                {item.license_number ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 font-mono text-xs font-bold text-[var(--text-primary)]">
                                                            {maskLicenseNumber(item.license_number, privacyMode)}
                                                        </span>
                                                        {!privacyMode && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(item.license_number!, `fb-lic-${item.id}`)}
                                                                className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--nepal-blue)]"
                                                                title="Copy license number"
                                                            >
                                                                {copiedKey === `fb-lic-${item.id}` ? '✓' : (
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
                                            <td className="px-3 py-3 text-xs max-w-sm">
                                                <div className="flex flex-col gap-1">
                                                    <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">
                                                        {item.message}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedFeedbackMessage(item)}
                                                        className="w-fit text-[11px] font-semibold text-[var(--nepal-blue)] hover:underline"
                                                    >
                                                        View Full Message →
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Received */}
                                            <td className="whitespace-nowrap px-3 py-3 text-xs" title={`${formatNepalDateTime(item.created_at, 'en', true)} (NPT, UTC+5:45)`}>
                                                <div className="flex flex-col gap-0.5 font-mono">
                                                    <span className="font-semibold text-[var(--text-primary)]">
                                                        {formatNepalDateTime(item.created_at)}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)]">
                                                        {formatTimeAgo(item.created_at)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleFeedbackStatus(item.id, item.status)}
                                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition ${
                                                            item.status === 'new'
                                                                ? 'border-[var(--success)]/40 bg-[var(--success-bg)] text-[var(--success)] hover:bg-[var(--success)] hover:text-white'
                                                                : 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white'
                                                        }`}
                                                        title={item.status === 'new' ? 'Mark as Resolved' : 'Re-open as New'}
                                                    >
                                                        {item.status === 'new' ? (
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        ) : (
                                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M1 4v6h6" />
                                                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                                            </svg>
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedFeedbackMessage(item)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-muted)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)]"
                                                        title="Read full inquiry details"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                            <circle cx="12" cy="12" r="3" />
                                                        </svg>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteFeedback(item.id, item.subject)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)]"
                                                        title="Delete feedback entry"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
