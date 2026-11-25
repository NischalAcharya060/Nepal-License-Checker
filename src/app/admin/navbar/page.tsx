'use client'

import Image from 'next/image'
import Link from 'next/link'
import { SystemModeConfig } from '../types'

export interface AdminNavbarProps {
    privacyMode?: boolean
    setPrivacyMode?: (val: boolean) => void
    systemModeConfig?: SystemModeConfig | null
    onOpenSystemModeModal?: () => void
    autoRefresh?: boolean
    setAutoRefresh?: (val: boolean) => void
    dataLoading?: boolean
    handleManualRefresh?: () => void
    activeTab?: 'searches' | 'notifications' | 'push' | 'feedback' | 'testimonials' | 'developers' | 'ocr' | 'updates' | 'users'
    exportCsv?: () => void
    exportNotificationCsv?: () => void
    exportPushCsv?: () => void
    exportFeedbackCsv?: () => void
    exportTestimonialsCsv?: () => void
    exportDevelopersCsv?: () => void
    exportOcrCsv?: () => void
    exportUsersCsv?: () => void
    hasLogs?: boolean
    hasNotificationLogs?: boolean
    hasPushLogs?: boolean
    hasFeedbackLogs?: boolean
    hasTestimonialLogs?: boolean
    hasDeveloperLogs?: boolean
    hasOcrLogs?: boolean
    hasUserLogs?: boolean
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
        systemModeConfig = null,
        onOpenSystemModeModal = () => {},
        autoRefresh = true,
        setAutoRefresh = () => {},
        dataLoading = false,
        handleManualRefresh = () => {},
        activeTab = 'searches',
        exportCsv = () => {},
        exportNotificationCsv = () => {},
        exportPushCsv = () => {},
        exportFeedbackCsv = () => {},
        exportTestimonialsCsv = () => {},
        exportDevelopersCsv = () => {},
        exportOcrCsv = () => {},
        exportUsersCsv = () => {},
        hasLogs = false,
        hasNotificationLogs = false,
        hasPushLogs = false,
        hasFeedbackLogs = false,
        hasTestimonialLogs = false,
        hasDeveloperLogs = false,
        hasOcrLogs = false,
        hasUserLogs = false,
        setPasskeyModalOpen = () => {},
        fetchPasskeys = () => {},
        passkeyCount = 0,
        handleLogout = () => {},
        showToast = () => {},
    }: AdminNavbarProps = props || {}
    return (
        <header className="sticky top-0 z-30 border-b border-[var(--border-default)] bg-[var(--surface-primary)]/80 backdrop-blur-xl shadow-xs transition-colors">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 group">
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 shadow-2xs group-hover:border-[var(--nepal-blue)] transition">
                            <Image
                                src="/License-Checker-Nepal-logo.png"
                                alt="Nepal License Checker"
                                width={28}
                                height={28}
                                className="object-contain"
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xs sm:text-base font-black tracking-tight truncate text-[var(--text-primary)]">
                                    Admin Console
                                </h1>
                                <span className="hidden sm:inline-flex rounded-full bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-xs font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 font-mono">
                                    v2.0
                                </span>
                            </div>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] truncate">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="hidden sm:inline">Turso Edge DB Active</span>
                                <span className="sm:hidden">Connected</span>
                            </span>
                        </div>
                    </Link>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
                        className={`inline-flex min-h-[38px] sm:h-9 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer ${
                            privacyMode
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold'
                                : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                        }`}
                        title={
                            privacyMode
                                ? 'Privacy Mode is ON (License & IP masked). Click to disable and view full information.'
                                : 'Privacy Mode is OFF (Showing full License & IP). Click to enable masking.'
                        }
                        aria-label="Toggle Privacy Mode"
                    >
                        {privacyMode ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                <path d="m9 12 2 2 4-4" />
                            </svg>
                        ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        )}
                        <span className="hidden sm:inline">Privacy</span>
                        <span className="text-xs font-mono font-bold uppercase">{privacyMode ? 'ON' : 'OFF'}</span>
                    </button>

                    {/* Live System Mode Controller (Normal / Degraded / Maintenance) */}
                    <button
                        type="button"
                        onClick={onOpenSystemModeModal}
                        className={`inline-flex min-h-[38px] sm:h-9 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer ${
                            systemModeConfig?.mode === 'maintenance'
                                ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 animate-pulse'
                                : systemModeConfig?.mode === 'degraded'
                                ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        }`}
                        title={`System Mode: ${systemModeConfig?.mode || 'normal'}. Click to toggle between Normal, Degraded, and Maintenance mode in real-time.`}
                        aria-label="Toggle Live System Mode"
                    >
                        <span className="relative flex h-2 w-2">
                            {systemModeConfig?.mode === 'maintenance' ? (
                                <>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600" />
                                </>
                            ) : systemModeConfig?.mode === 'degraded' ? (
                                <>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                                </>
                            ) : (
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            )}
                        </span>
                        <span className="hidden sm:inline">Mode:</span>
                        <span className="capitalize font-mono">
                            {systemModeConfig?.mode === 'maintenance'
                                ? 'Maint'
                                : systemModeConfig?.mode === 'degraded'
                                ? 'Degraded'
                                : 'Normal'}
                        </span>
                    </button>

                    {/* Auto-refresh toggle */}
                    <button
                        type="button"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`hidden lg:inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition shadow-2xs cursor-pointer ${
                            autoRefresh
                                ? 'border-[var(--nepal-blue)]/40 bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] font-bold'
                                : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                        }`}
                        title="Auto-refresh queries every 12 seconds"
                    >
                        <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'bg-[var(--nepal-blue)] animate-pulse' : 'bg-gray-400'}`} />
                        <span>Auto: {autoRefresh ? '12s' : 'Off'}</span>
                    </button>

                    {/* Manual Refresh */}
                    <button
                        type="button"
                        onClick={handleManualRefresh}
                        disabled={dataLoading}
                        className="inline-flex h-8 sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 sm:px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Refresh logs now"
                        aria-label="Refresh logs"
                    >
                        <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={dataLoading ? 'animate-spin text-[var(--nepal-blue)]' : ''}
                            aria-hidden="true"
                        >
                            <path d="M21 2v6h-6" />
                            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                            <path d="M3 22v-6h6" />
                            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
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
                                : activeTab === 'push'
                                ? exportPushCsv
                                : activeTab === 'feedback'
                                ? exportFeedbackCsv
                                : activeTab === 'testimonials'
                                ? exportTestimonialsCsv
                                : activeTab === 'developers'
                                ? exportDevelopersCsv
                                : activeTab === 'users'
                                ? exportUsersCsv
                                : exportOcrCsv
                        }
                        disabled={
                            activeTab === 'searches'
                                ? !hasLogs
                                : activeTab === 'notifications'
                                ? !hasNotificationLogs
                                : activeTab === 'push'
                                ? !hasPushLogs
                                : activeTab === 'feedback'
                                ? !hasFeedbackLogs
                                : activeTab === 'testimonials'
                                ? !hasTestimonialLogs
                                : activeTab === 'developers'
                                ? !hasDeveloperLogs
                                : activeTab === 'users'
                                ? !hasUserLogs
                                : !hasOcrLogs
                        }
                        className="inline-flex min-h-[38px] sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 sm:px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title={
                            activeTab === 'searches'
                                ? 'Export search queries to CSV'
                                : activeTab === 'notifications'
                                ? 'Export notification logs to CSV'
                                : activeTab === 'feedback'
                                ? 'Export feedback inquiries to CSV'
                                : activeTab === 'testimonials'
                                ? 'Export testimonials to CSV'
                                : activeTab === 'developers'
                                ? 'Export developer accounts to CSV'
                                : 'Export OCR scan logs to CSV'
                        }
                        aria-label="Export to CSV"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                        className="inline-flex min-h-[38px] sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 sm:px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer"
                        title="Manage Passkeys (Windows Hello, Touch ID, Face ID, YubiKey)"
                        aria-label="Passkeys"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0" />
                        </svg>
                        <span className="hidden lg:inline">Passkeys</span>
                        {passkeyCount > 0 && (
                            <span className="rounded-md bg-[var(--nepal-blue-soft)] px-1.5 py-0.2 text-xs font-mono font-bold text-[var(--nepal-blue)]">
                                {passkeyCount}
                            </span>
                        )}
                    </button>

                    {/* Sign Out */}
                    <button
                        type="button"
                        onClick={() => handleLogout()}
                        className="inline-flex min-h-[38px] sm:h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--error-border)]/60 bg-[var(--error-bg)]/80 px-2.5 sm:px-3 text-xs font-bold text-[var(--error)] shadow-2xs transition hover:bg-[var(--error)] hover:text-white active:scale-95 cursor-pointer"
                        title="Sign out from admin console"
                        aria-label="Sign out"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
