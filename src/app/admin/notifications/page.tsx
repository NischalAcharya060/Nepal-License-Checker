'use client'

import { NotificationLog, NotificationStatsData } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo, maskLicenseNumber } from '../helpers'
import AdminPagination from '../AdminPagination'

export interface AdminNotificationsProps {
    notificationLogs?: NotificationLog[]
    notificationStats?: NotificationStatsData | null
    notifTotal?: number
    notifPage?: number
    notifLimit?: number
    notifTotalPages?: number
    notifSearchFilter?: string
    notifStatusFilter?: 'all' | 'pending' | 'sent' | 'cancelled'
    notifLoading?: boolean
    privacyMode?: boolean
    notifSelectMode?: boolean
    selectedNotifIds?: string[]
    copiedKey?: string | null
    setNotifPage?: (page: number) => void
    setNotifLimit?: (limit: number) => void
    setNotifSearchFilter?: (filter: string) => void
    setNotifStatusFilter?: (status: 'all' | 'pending' | 'sent' | 'cancelled') => void
    setNotifSelectMode?: (mode: boolean) => void
    setSelectedNotifIds?: React.Dispatch<React.SetStateAction<string[]>>
    copyToClipboard?: (text: string, key: string) => void
    handleDeleteNotification?: (id: string, license: string) => void
    handleDeleteSelectedNotifications?: () => void
    handleDeleteNotificationsByStatus?: (status: 'cancelled' | 'sent') => void
    handleDeleteAllNotifications?: () => void
    startTransition?: (callback: () => void) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminNotifications(props: any) {
    const {
        notificationLogs = [],
        notificationStats = null,
        notifTotal = 0,
        notifPage = 1,
        notifLimit = 10,
        notifTotalPages = 1,
        notifSearchFilter = '',
        notifStatusFilter = 'all',
        notifLoading = false,
        privacyMode = true,
        notifSelectMode = false,
        selectedNotifIds = [],
        copiedKey = null,
        setNotifPage = () => {},
        setNotifLimit = () => {},
        setNotifSearchFilter = () => {},
        setNotifStatusFilter = () => {},
        setNotifSelectMode = () => {},
        setSelectedNotifIds = () => {},
        copyToClipboard = () => {},
        handleDeleteNotification = () => {},
        handleDeleteSelectedNotifications = () => {},
        handleDeleteNotificationsByStatus = () => {},
        handleDeleteAllNotifications = () => {},
        startTransition = (cb) => cb(),
    }: AdminNotificationsProps = props || {}

    return (
        <section aria-label="Email Notifications Log">
            {/* Email Notification KPI Metrics */}
            <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
                {/* Total Subscribers */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--nepal-blue)] to-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Subscribers</span>
                        <span className="rounded-xl bg-[var(--nepal-blue-soft)] p-2 text-[var(--nepal-blue)] shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {notificationStats ? notificationStats.total.toLocaleString() : notifTotal.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Registered for print alerts</p>
                </div>

                {/* Successfully Delivered */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Delivered</span>
                        <span className="rounded-xl bg-[var(--success-bg)] p-2 text-[var(--success)] shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                        </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                        <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--success)]">
                            {notificationStats ? notificationStats.sent.toLocaleString() : '0'}
                        </p>
                        <span className="text-xs font-mono text-[var(--text-muted)]">
                            ({notificationStats ? `${notificationStats.deliveryRate}%` : '0%'} sent)
                        </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                        <div
                            className="h-full rounded-full bg-[var(--success)] transition-all duration-500"
                            style={{ width: `${notificationStats ? notificationStats.deliveryRate : 0}%` }}
                        />
                    </div>
                </div>

                {/* Pending in Queue */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">In Queue</span>
                        <span className="rounded-xl bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                        {notificationStats ? notificationStats.pending.toLocaleString() : '0'}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Awaiting DOTM publication</p>
                </div>

                {/* Cancelled / Unsubscribed */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gray-400 to-gray-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Cancelled</span>
                        <span className="rounded-xl bg-gray-500/10 p-2 text-gray-500 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {notificationStats ? notificationStats.cancelled.toLocaleString() : '0'}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Unsubscribed by user</p>
                </div>
            </div>

            {/* Notification Search & Filter Toolbar */}
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
                        value={notifSearchFilter}
                        onChange={(e) => {
                            setNotifSearchFilter(e.target.value)
                            startTransition(() => setNotifPage(1))
                        }}
                        placeholder="Filter by email, license number, or holder name..."
                        className="h-9 sm:h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9.5 pr-9 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                    />
                    {notifSearchFilter && (
                        <button
                            type="button"
                            onClick={() => {
                                setNotifSearchFilter('')
                                setNotifPage(1)
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
                    {/* Status Filter */}
                    <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1 text-xs font-semibold">
                        {(['all', 'pending', 'sent', 'cancelled'] as const).map((st) => (
                            <button
                                key={st}
                                type="button"
                                onClick={() => {
                                    setNotifStatusFilter(st)
                                    setNotifPage(1)
                                }}
                                className={`rounded-lg px-2.5 py-1 text-[11px] sm:text-xs capitalize transition cursor-pointer ${
                                    notifStatusFilter === st
                                        ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs font-bold'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                {st === 'sent' ? 'Delivered' : st === 'pending' ? 'In Queue' : st}
                            </button>
                        ))}
                    </div>

                    {/* Limit Selector */}
                    <select
                        value={notifLimit}
                        onChange={(e) => {
                            setNotifLimit(Number(e.target.value))
                            setNotifPage(1)
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
                        disabled={notificationLogs.length === 0 || notifLoading}
                        onClick={() => {
                            if (notifSelectMode) {
                                setNotifSelectMode(false)
                                setSelectedNotifIds([])
                            } else {
                                setNotifSelectMode(true)
                            }
                        }}
                        className={`inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold shadow-xs transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                            notifSelectMode
                                ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] font-bold'
                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)]'
                        }`}
                        title={notifSelectMode ? 'Exit row selection mode' : 'Select multiple rows to delete'}
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="9 11 12 14 22 4" />
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                        <span>{notifSelectMode ? 'Cancel' : 'Select'}</span>
                    </button>

                    {/* Delete Selected Button */}
                    {notifSelectMode && selectedNotifIds.length > 0 && (
                        <button
                            type="button"
                            onClick={handleDeleteSelectedNotifications}
                            disabled={notifLoading}
                            className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)] bg-[var(--error)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-50 cursor-pointer"
                            title="Delete selected notification logs"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Delete Selected ({selectedNotifIds.length})</span>
                        </button>
                    )}

                    {/* Delete Cancelled Button */}
                    <button
                        type="button"
                        onClick={() => handleDeleteNotificationsByStatus('cancelled')}
                        disabled={(notificationStats?.cancelled ?? 0) === 0 || notifLoading}
                        className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--error-border)] hover:text-[var(--error)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        title="Delete all cancelled notification subscriptions"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete Cancelled ({(notificationStats?.cancelled ?? 0).toLocaleString()})</span>
                    </button>

                    {/* Delete All Notifications Button */}
                    <button
                        type="button"
                        onClick={handleDeleteAllNotifications}
                        disabled={notifTotal === 0 || notifLoading}
                        className="inline-flex h-8.5 sm:h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)]/80 bg-[var(--error-bg)] px-2.5 sm:px-3 text-[11px] sm:text-xs font-semibold text-[var(--error)] shadow-xs transition hover:bg-[var(--error-border)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        title="Delete all notification records"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete All</span>
                    </button>
                </div>
            </div>

            {/* Notifications Logs Container (Mobile Cards + Desktop Table) */}
            <div className="mt-4 relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] shadow-sm backdrop-blur-md transition-all">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-70" />

                {/* Mobile Card List (Visible on < md) */}
                <div className="block md:hidden">
                    {notifLoading && !notificationLogs.length ? (
                        <div className="py-16 text-center text-xs text-[var(--text-muted)]">
                            <div className="flex flex-col items-center justify-center gap-2.5">
                                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                <span>Loading email notifications...</span>
                            </div>
                        </div>
                    ) : notificationLogs.length === 0 ? (
                        <div className="py-16 px-4 text-center text-xs text-[var(--text-muted)]">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
                                </div>
                                <span className="font-semibold text-sm text-[var(--text-secondary)]">No notification subscriptions found.</span>
                                <p className="text-[11px] max-w-sm">When users subscribe for license print alerts, their requests and delivery logs will appear here.</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Mobile Select-All Header if in select mode */}
                            {notifSelectMode && (
                                <div className="flex items-center justify-between border-b border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/70 px-4 py-3 text-xs">
                                    <label className="flex items-center gap-2 font-semibold text-[var(--text-secondary)] cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={notificationLogs.length > 0 && selectedNotifIds.length === notificationLogs.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedNotifIds(notificationLogs.map((l) => l.id))
                                                } else {
                                                    setSelectedNotifIds([])
                                                }
                                            }}
                                            className="h-4 w-4 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                        />
                                        <span>Select All on this page ({notificationLogs.length})</span>
                                    </label>
                                    <span className="text-[11px] text-[var(--text-muted)] font-mono font-semibold">
                                        {selectedNotifIds.length} selected
                                    </span>
                                </div>
                            )}

                            <div className="divide-y divide-[var(--border-default)]/50">
                                {notificationLogs.map((log, idx) => {
                                    const isSelected = selectedNotifIds.includes(log.id)
                                    const sn = (notifPage - 1) * notifLimit + idx + 1
                                    return (
                                        <div
                                            key={log.id}
                                            className={`p-4 transition-colors duration-150 space-y-3 ${isSelected ? 'bg-[var(--nepal-blue-soft)]/20' : 'hover:bg-[var(--bg-secondary)]/30'}`}
                                        >
                                            {/* Top Row: Select/SN + Status Badge + Time ago */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {notifSelectMode && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedNotifIds((prev) => [...prev, log.id])
                                                                } else {
                                                                    setSelectedNotifIds((prev) => prev.filter((id) => id !== log.id))
                                                                }
                                                            }}
                                                            className="h-4 w-4 cursor-pointer rounded border-[var(--border-default)] accent-[var(--nepal-blue)]"
                                                        />
                                                    )}
                                                    <span className="rounded-lg bg-[var(--bg-secondary)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--text-muted)]">
                                                        #{sn}
                                                    </span>
                                                    {log.status === 'sent' ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            <span>Delivered</span>
                                                        </span>
                                                    ) : log.status === 'pending' ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                            <span>In Queue</span>
                                                        </span>
                                                    ) : log.status === 'cancelled' ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/80 px-2.5 py-0.5 text-xs font-semibold text-[var(--text-muted)]">
                                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                            </svg>
                                                            <span>Cancelled</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                                                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                                            </svg>
                                                            <span>Processing</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className="font-mono text-xs text-[var(--text-muted)]"
                                                    title={`Subscribed: ${formatNepalDateTime(log.created_at, 'en', true)}`}
                                                >
                                                    {formatTimeAgo(log.created_at)}
                                                </span>
                                            </div>

                                            {/* Middle Row: License & Actions */}
                                            <div className="flex items-baseline justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 font-mono text-sm font-bold tracking-tight text-[var(--text-primary)]">
                                                        <span>{maskLicenseNumber(log.license_number, privacyMode)}</span>
                                                        {!privacyMode && (
                                                            <button
                                                                type="button"
                                                                onClick={() => copyToClipboard(log.license_number, `m-nlic-${log.id}`)}
                                                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                                title="Copy license number"
                                                            >
                                                                {copiedKey === `m-nlic-${log.id}` ? (
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

                                                    {/* Email Address */}
                                                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                                                        <a
                                                            href={`mailto:${log.email}`}
                                                            className="font-mono text-xs text-[var(--nepal-blue)] hover:underline truncate font-medium"
                                                        >
                                                            {log.email}
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(log.email, `m-nemail-${log.id}`)}
                                                            className="text-[var(--text-muted)] hover:text-[var(--nepal-blue)] shrink-0 transition cursor-pointer p-0.5"
                                                            title="Copy email address"
                                                        >
                                                            {copiedKey === `m-nemail-${log.id}` ? (
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
                                                    </div>

                                                    {/* DOTM Match */}
                                                    {log.holder_name && (
                                                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                                <circle cx="12" cy="7" r="4" />
                                                            </svg>
                                                            <span>{log.holder_name}</span>
                                                            {log.office && <span className="text-[11px] text-[var(--text-muted)] font-normal">({log.office})</span>}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Delete Single Action */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteNotification(log.id, log.license_number)}
                                                    className="inline-flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer shadow-2xs"
                                                    title="Delete notification record"
                                                >
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>

                                            {/* Status Details Sub-row */}
                                            <div className="flex items-center justify-between border-t border-[var(--border-default)]/40 pt-2.5 text-[11px] text-[var(--text-muted)] font-mono">
                                                <span>Subscribed: {formatNepalDateTime(log.created_at)}</span>
                                                {log.sent_at ? (
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                        Sent: {formatNepalDateTime(log.sent_at)}
                                                    </span>
                                                ) : log.cancelled_at ? (
                                                    <span className="font-semibold text-[var(--text-muted)]">
                                                        Unsubscribed: {formatNepalDateTime(log.cancelled_at)}
                                                    </span>
                                                ) : (
                                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                                        Waiting for print
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

                {/* Desktop Table View (Hidden on < md, visible on md+) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="admin-data-table w-full text-left text-xs">
                        <thead className="border-b border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                            <tr>
                                {notifSelectMode && (
                                    <th scope="col" className="w-10 py-3.5 pl-4 pr-1">
                                        <input
                                            type="checkbox"
                                            checked={notificationLogs.length > 0 && selectedNotifIds.length === notificationLogs.length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedNotifIds(notificationLogs.map((l) => l.id))
                                                } else {
                                                    setSelectedNotifIds([])
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
                                    Subscribed At (NPT)
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    License Number
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    Subscriber Email
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    Delivery Status
                                </th>
                                <th scope="col" className="px-4 py-3.5">
                                    DoTM Match / Holder
                                </th>
                                <th scope="col" className="py-3.5 pl-3 pr-4 text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]/50">
                            {notifLoading && !notificationLogs.length ? (
                                <tr>
                                    <td colSpan={notifSelectMode ? 8 : 7} className="py-16 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center justify-center gap-2.5">
                                            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                            <span>Loading email notifications...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : notificationLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={notifSelectMode ? 8 : 7} className="py-16 px-4 text-center text-xs text-[var(--text-muted)]">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                </svg>
                                            </div>
                                            <span className="font-semibold text-sm text-[var(--text-secondary)]">No notification subscriptions found.</span>
                                            <p className="text-[11px] max-w-sm">When users subscribe for license print alerts, their requests and delivery logs will appear here.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                notificationLogs.map((log, idx) => {
                                    const isSelected = selectedNotifIds.includes(log.id)
                                    const sn = (notifPage - 1) * notifLimit + idx + 1
                                    return (
                                        <tr
                                            key={log.id}
                                            className={`group transition-colors duration-150 hover:bg-[var(--bg-secondary)]/50 ${isSelected ? 'bg-[var(--nepal-blue-soft)]/20 hover:bg-[var(--nepal-blue-soft)]/30' : ''}`}
                                        >
                                            {/* Checkbox (Visible only in Select mode) */}
                                            {notifSelectMode && (
                                                <td className="w-10 py-3.5 pl-4 pr-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedNotifIds((prev) => [...prev, log.id])
                                                            } else {
                                                                setSelectedNotifIds((prev) => prev.filter((id) => id !== log.id))
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
                                                <div className="flex flex-col gap-0 leading-tight">
                                                    <span className="font-semibold text-[var(--text-primary)]" title={`Subscribed: ${formatNepalDateTime(log.created_at, 'en', true)} (NPT)`}>
                                                        {formatNepalDateTime(log.created_at)}
                                                    </span>
                                                    <span className="text-[10px] font-sans text-[var(--text-muted)]">
                                                        {formatTimeAgo(log.created_at)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* License Number */}
                                            <td className="whitespace-nowrap px-4 py-3.5">
                                                <div className="flex items-center gap-1 font-mono text-[12px] font-bold tracking-tight text-[var(--text-primary)]">
                                                    <span>{maskLicenseNumber(log.license_number, privacyMode)}</span>
                                                    {!privacyMode && (
                                                        <button
                                                            type="button"
                                                            onClick={() => copyToClipboard(log.license_number, `nlic-${log.id}`)}
                                                            className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-all duration-150 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-secondary)] hover:text-[var(--nepal-blue)] active:scale-90 cursor-pointer"
                                                            title="Copy license number"
                                                        >
                                                            {copiedKey === `nlic-${log.id}` ? (
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

                                            {/* User Email */}
                                            <td className="whitespace-nowrap px-4 py-3.5">
                                                <div className="flex items-center gap-1">
                                                    <a
                                                        href={`mailto:${log.email}`}
                                                        className="font-mono text-[10.5px] font-medium text-[var(--nepal-blue)] hover:underline"
                                                    >
                                                        {log.email}
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(log.email, `nemail-${log.id}`)}
                                                        className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[var(--text-muted)] opacity-0 transition-all duration-150 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[var(--bg-secondary)] hover:text-[var(--nepal-blue)] active:scale-90 cursor-pointer"
                                                        title="Copy email address"
                                                    >
                                                        {copiedKey === `nemail-${log.id}` ? (
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
                                                </div>
                                            </td>

                                            {/* Status / Delivery Badge */}
                                            <td className="whitespace-nowrap px-4 py-3.5">
                                                {log.status === 'sent' ? (
                                                    <div className="flex flex-col items-start gap-0 leading-tight">
                                                        <span className="inline-flex min-w-[92px] items-center justify-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold leading-4 text-emerald-600 dark:text-emerald-400">
                                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                            <span>Delivered</span>
                                                        </span>
                                                        {log.sent_at && (
                                                            <span className="font-mono text-[9.5px] text-[var(--text-muted)]" title={`Delivered: ${formatNepalDateTime(log.sent_at, 'en', true)}`}>
                                                                {formatNepalDateTime(log.sent_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : log.status === 'pending' ? (
                                                    <span className="inline-flex min-w-[92px] items-center justify-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold leading-4 text-amber-600 dark:text-amber-400">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        <span>In Queue</span>
                                                    </span>
                                                ) : log.status === 'cancelled' ? (
                                                    <div className="flex flex-col items-start gap-0 leading-tight">
                                                        <span className="inline-flex min-w-[92px] items-center justify-center gap-1 rounded-full border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/80 px-2 py-0.5 text-[10px] font-semibold leading-4 text-[var(--text-muted)]">
                                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                            </svg>
                                                            <span>Cancelled</span>
                                                        </span>
                                                        {log.cancelled_at && (
                                                            <span className="font-mono text-[9.5px] text-[var(--text-muted)]">
                                                                {formatNepalDateTime(log.cancelled_at)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex min-w-[92px] items-center justify-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold leading-4 text-purple-600">
                                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
                                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                                        </svg>
                                                        <span>Processing</span>
                                                    </span>
                                                )}
                                            </td>

                                            {/* License Match / Holder */}
                                            <td className="whitespace-nowrap px-4 py-3.5 text-xs">
                                                {log.holder_name ? (
                                                    <div className="leading-tight">
                                                        <span className="text-[11.5px] font-semibold text-[var(--text-primary)]">
                                                            {log.holder_name}
                                                        </span>
                                                        {log.office && (
                                                            <p className="text-[10px] text-[var(--text-muted)]">
                                                                {log.office}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10.5px] text-[var(--text-muted)] italic">
                                                        Not in records yet
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteNotification(log.id, log.license_number)}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)]/80 bg-[var(--surface-primary)] text-[var(--text-muted)] transition-all duration-150 hover:-translate-y-px hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer shadow-2xs"
                                                    title="Delete notification record"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                    currentPage={notifPage}
                    totalPages={notifTotalPages}
                    totalItems={notifTotal}
                    pageSize={notifLimit}
                    onPageChange={setNotifPage}
                    onPageSizeChange={setNotifLimit}
                    pageSizeOptions={[10, 25, 50, 100, 200]}
                    itemLabel="subscriptions"
                    loading={notifLoading}
                />
            </div>
        </section>
    )
}
