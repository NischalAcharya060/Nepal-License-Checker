'use client'

import Image from 'next/image'
import Link from 'next/link'

export interface AdminNavbarProps {
    privacyMode?: boolean
    setPrivacyMode?: (val: boolean) => void
    autoRefresh?: boolean
    setAutoRefresh?: (val: boolean) => void
    dataLoading?: boolean
    handleManualRefresh?: () => void
    activeTab?: 'searches' | 'notifications' | 'feedback'
    exportCsv?: () => void
    exportNotificationCsv?: () => void
    exportFeedbackCsv?: () => void
    hasLogs?: boolean
    hasNotificationLogs?: boolean
    hasFeedbackLogs?: boolean
    setPasskeyModalOpen?: (val: boolean) => void
    fetchPasskeys?: () => void
    passkeyCount?: number
    handleLogout?: (reason?: 'inactivity') => void
    showToast?: (message: string, type?: 'success' | 'info') => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminNavbar(props: any) {
    const {
        privacyMode = true,
        setPrivacyMode = () => {},
        autoRefresh = true,
        setAutoRefresh = () => {},
        dataLoading = false,
        handleManualRefresh = () => {},
        activeTab = 'searches',
        exportCsv = () => {},
        exportNotificationCsv = () => {},
        exportFeedbackCsv = () => {},
        hasLogs = false,
        hasNotificationLogs = false,
        hasFeedbackLogs = false,
        setPasskeyModalOpen = () => {},
        fetchPasskeys = () => {},
        passkeyCount = 0,
        handleLogout = () => {},
        showToast = () => {},
    }: AdminNavbarProps = props || {}
    return (
        <header className="sticky top-0 z-30 border-b border-[var(--border-default)] bg-[var(--surface-primary)]/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1">
                            <Image
                                src="/License-Checker-Nepal-logo.png"
                                alt="Nepal License Checker"
                                width={28}
                                height={28}
                                className="object-contain"
                            />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xs sm:text-base font-black tracking-tight truncate text-[var(--text-primary)]">
                                Admin Console
                            </h1>
                            <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-[var(--text-muted)] truncate">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)] animate-pulse" />
                                <span className="hidden sm:inline">Turso Edge DB Connected</span>
                                <span className="sm:hidden">Connected</span>
                            </span>
                        </div>
                    </Link>
                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {/* Privacy Mode Toggle (ON by default) */}
                    <button
                        type="button"
                        onClick={() => {
                            const next = !privacyMode
                            setPrivacyMode(next)
                            showToast(
                                next
                                    ? 'Privacy Mode enabled (License & IP masked)'
                                    : 'Privacy Mode disabled (Showing full data)',
                                'info'
                            )
                        }}
                        className={`inline-flex h-8 sm:h-9 items-center gap-1 sm:gap-1.5 rounded-xl border px-2 sm:px-3 text-xs font-semibold shadow-xs transition active:scale-95 ${
                            privacyMode
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}
                        title={
                            privacyMode
                                ? 'Privacy Mode is ON (License & IP masked). Click to disable and view full information.'
                                : 'Privacy Mode is OFF (Showing full License & IP). Click to enable masking.'
                        }
                        aria-label="Toggle Privacy Mode"
                    >
                        {privacyMode ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        )}
                        <span className="hidden sm:inline">Privacy:</span>
                        <span className="text-[11px] sm:text-xs font-bold">{privacyMode ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Auto-refresh toggle */}
                    <button
                        type="button"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`hidden lg:inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition ${
                            autoRefresh
                                ? 'border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)]'
                                : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-muted)]'
                        }`}
                        title="Auto-refresh queries every 12 seconds"
                    >
                        <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-[var(--nepal-blue)] animate-ping' : 'bg-gray-400'}`} />
                        <span>Auto Refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Manual Refresh */}
                    <button
                        type="button"
                        onClick={handleManualRefresh}
                        disabled={dataLoading}
                        className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 sm:px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95"
                        title="Refresh logs now"
                        aria-label="Refresh logs"
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
                            className={dataLoading ? 'animate-spin text-[var(--nepal-blue)]' : ''}
                        >
                            <polyline points="23 4 23 10 17 10" />
                            <polyline points="1 20 1 14 7 14" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        <span className="hidden md:inline">Refresh</span>
                    </button>

                    {/* Export CSV */}
                    <button
                        type="button"
                        onClick={
                            activeTab === 'searches'
                                ? exportCsv
                                : activeTab === 'notifications'
                                ? exportNotificationCsv
                                : exportFeedbackCsv
                        }
                        disabled={
                            activeTab === 'searches'
                                ? !hasLogs
                                : activeTab === 'notifications'
                                ? !hasNotificationLogs
                                : !hasFeedbackLogs
                        }
                        className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 sm:px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:opacity-50"
                        title={
                            activeTab === 'searches'
                                ? 'Export search queries to CSV'
                                : activeTab === 'notifications'
                                ? 'Export notification logs to CSV'
                                : 'Export feedback inquiries to CSV'
                        }
                        aria-label="Export to CSV"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span className="hidden md:inline">Export</span>
                    </button>

                    {/* Passkeys & Security */}
                    <button
                        type="button"
                        onClick={() => {
                            setPasskeyModalOpen(true)
                            fetchPasskeys()
                        }}
                        className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 sm:px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95"
                        title="Manage Passkeys (Windows Hello, Touch ID, Face ID, YubiKey)"
                        aria-label="Passkeys"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0" />
                        </svg>
                        <span className="hidden lg:inline">Passkeys</span>
                        {passkeyCount > 0 && (
                            <span className="rounded-md bg-[var(--nepal-blue-soft)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--nepal-blue)]">
                                {passkeyCount}
                            </span>
                        )}
                    </button>

                    {/* Sign Out */}
                    <button
                        type="button"
                        onClick={() => handleLogout()}
                        className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--error-border)]/80 bg-[var(--error-bg)] px-2 sm:px-3 text-xs font-semibold text-[var(--error)] shadow-xs transition hover:bg-[var(--error-border)] active:scale-95"
                        title="Sign out from admin console"
                        aria-label="Sign out"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </div>
        </header>
    )
}
