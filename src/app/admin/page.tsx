'use client'

import { useState, useEffect, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatNepalDateTime, formatTimeUntil } from '@/lib/cronHelper'

interface AdminScraperData {
    totalRecords: number
    lastRun: {
        timestamp: number
        trigger: string
        status: string
        scraped: number
        saved: number
        failed: number
        newPdfsCount?: number
        skippedPdfsCount?: number
        totalPdfsCount?: number
        durationSeconds: number
        circuitBreakerTripped?: boolean
    } | null
    nextRun: {
        timestamp: number
        iso: string
    }
    schedule: string
}

interface SearchLog {
    id: number
    license_number: string
    status: 'found' | 'not_found' | 'error'
    holder_name?: string | null
    office?: string | null
    category?: string | null
    ip: string
    country?: string | null
    city?: string | null
    region?: string | null
    user_agent?: string | null
    created_at: number
}

interface SearchStats {
    total: number
    today: number
    found: number
    uniqueIps: number
    foundRate: number
    topLocations: Array<{ city: string; country: string; count: number }>
}

interface NotificationLog {
    id: string
    license_number: string
    email: string
    status: 'pending' | 'processing' | 'sent' | 'cancelled'
    created_at: number
    updated_at: number
    sent_at?: number | null
    cancelled_at?: number | null
    holder_name?: string | null
    office?: string | null
}

interface NotificationStatsData {
    total: number
    pending: number
    sent: number
    cancelled: number
    deliveryRate: number
}

interface FeedbackLog {
    id: string
    name: string
    email: string
    license_number?: string | null
    category: string
    subject: string
    message: string
    status: 'new' | 'resolved'
    admin_notes?: string | null
    ip?: string | null
    created_at: number
    updated_at: number
}

interface FeedbackStatsData {
    total: number
    newCount: number
    resolvedCount: number
    todayCount: number
}

function getFlag(countryCode?: string | null): string {
    if (!countryCode || countryCode.length !== 2) return '🌐'
    const code = countryCode.toUpperCase()
    return String.fromCodePoint(...code.split('').map((c) => 127397 + c.charCodeAt(0)))
}

function formatTimeAgo(timestamp: number | string | null | undefined): string {
    if (!timestamp) return '—'
    let ms = typeof timestamp === 'string' ? Number(timestamp) : timestamp
    if (isNaN(ms) || ms <= 0) return '—'
    // Normalize timestamps in seconds to milliseconds
    if (ms < 100000000000) {
        ms *= 1000
    }
    const diffSecs = Math.floor((Date.now() - ms) / 1000)
    if (diffSecs < 15) return 'Just now'
    if (diffSecs < 60) return `${diffSecs}s ago`
    const mins = Math.floor(diffSecs / 60)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    if (days < 30) return `${days}d ago`
    const months = Math.floor(days / 30)
    if (months < 12) return `${months}mo ago`
    const years = Math.floor(days / 365)
    return `${years}y ago`
}

function maskLicenseNumber(license: string | null | undefined, isPrivate: boolean): string {
    if (!license) return '—'
    if (!isPrivate) return license
    return `${license.slice(0, 2)}*******`
}

function maskIpAddress(ip: string | null | undefined, isPrivate: boolean): string {
    if (!ip) return '—'
    if (!isPrivate) return ip
    const prefix = ip.includes('.') ? ip.split('.')[0] : ip.slice(0, 3)
    return `${prefix}*******`
}

export default function AdminPage() {
    const [authLoading, setAuthLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isConfigured, setIsConfigured] = useState(true)
    const [passwordInput, setPasswordInput] = useState('')
    const [loginError, setLoginError] = useState('')
    const [loginSubmitting, setLoginSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [privacyMode, setPrivacyMode] = useState(true)

    // View Tabs: 'searches' | 'notifications' | 'feedback'
    const [activeTab, setActiveTab] = useState<'searches' | 'notifications' | 'feedback'>('searches')

    // Dashboard State - Searches
    const [logs, setLogs] = useState<SearchLog[]>([])
    const [stats, setStats] = useState<SearchStats | null>(null)
    const [scraperData, setScraperData] = useState<AdminScraperData | null>(null)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [limit, setLimit] = useState(50)
    const [totalPages, setTotalPages] = useState(1)
    const [searchFilter, setSearchFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'not_found'>('all')
    const [dataLoading, setDataLoading] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [copiedKey, setCopiedKey] = useState<string | null>(null)

    // Dashboard State - Email Notifications
    const [notificationStats, setNotificationStats] = useState<NotificationStatsData | null>(null)
    const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([])
    const [notifTotal, setNotifTotal] = useState(0)
    const [notifPage, setNotifPage] = useState(1)
    const [notifLimit, setNotifLimit] = useState(50)
    const [notifTotalPages, setNotifTotalPages] = useState(1)
    const [notifSearchFilter, setNotifSearchFilter] = useState('')
    const [notifStatusFilter, setNotifStatusFilter] = useState<'all' | 'pending' | 'sent' | 'cancelled'>('all')
    const [notifLoading, setNotifLoading] = useState(false)

    // Dashboard State - User Feedback & Inquiries
    const [feedbackStats, setFeedbackStats] = useState<FeedbackStatsData | null>(null)
    const [feedbackLogs, setFeedbackLogs] = useState<FeedbackLog[]>([])
    const [feedbackTotal, setFeedbackTotal] = useState(0)
    const [feedbackPage, setFeedbackPage] = useState(1)
    const [feedbackLimit, setFeedbackLimit] = useState(50)
    const [feedbackTotalPages, setFeedbackTotalPages] = useState(1)
    const [feedbackSearchFilter, setFeedbackSearchFilter] = useState('')
    const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'new' | 'resolved'>('all')
    const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>('all')
    const [feedbackLoading, setFeedbackLoading] = useState(false)
    const [selectedFeedbackMessage, setSelectedFeedbackMessage] = useState<FeedbackLog | null>(null)
    const [confirmDialog, setConfirmDialog] = useState<{
        title: string
        message: string
        confirmLabel: string
        onConfirm: () => Promise<void>
    } | null>(null)
    const [confirmSubmitting, setConfirmSubmitting] = useState(false)

    const [, startTransition] = useTransition()

    // 1. Check Auth Status on Load
    useEffect(() => {
        let isMounted = true
        fetch('/api/admin/auth', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (!isMounted) return
                setIsConfigured(data?.configured ?? true)
                setIsAuthenticated(Boolean(data?.authenticated))
                setAuthLoading(false)
            })
            .catch(() => {
                if (!isMounted) return
                setIsAuthenticated(false)
                setAuthLoading(false)
            })

        return () => {
            isMounted = false
        }
    }, [])

    // 2. Fetch Logs & Stats
    useEffect(() => {
        if (!isAuthenticated) return
        let cancelled = false

        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
            search: searchFilter,
            status: statusFilter,
        })

        fetch(`/api/admin/logs?${params.toString()}`, { cache: 'no-store' })
            .then((res) => {
                if (res.status === 401) {
                    if (!cancelled) setIsAuthenticated(false)
                    return null
                }
                return res.json()
            })
            .then((json) => {
                if (cancelled || !json) return
                if (json.status === 'success' && json.data) {
                    setLogs(json.data.logs || [])
                    setTotal(json.data.total || 0)
                    setTotalPages(json.data.totalPages || 1)
                    if (json.data.stats) {
                        setStats(json.data.stats)
                    }
                    if (json.data.scraper) {
                        setScraperData(json.data.scraper)
                    }
                    if (json.data.notificationStats) {
                        setNotificationStats(json.data.notificationStats)
                    }
                    setLastUpdated(new Date())
                }
                setDataLoading(false)
            })
            .catch(() => {
                if (!cancelled) setDataLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [isAuthenticated, page, limit, searchFilter, statusFilter, refreshKey])

    // 2b. Fetch Notification Logs & Subscriber Stats
    useEffect(() => {
        if (!isAuthenticated) return
        let cancelled = false

        const params = new URLSearchParams({
            page: String(notifPage),
            limit: String(notifLimit),
            search: notifSearchFilter,
            status: notifStatusFilter,
        })

        fetch(`/api/admin/notifications?${params.toString()}`, { cache: 'no-store' })
            .then((res) => {
                if (res.status === 401) {
                    if (!cancelled) setIsAuthenticated(false)
                    return null
                }
                return res.json()
            })
            .then((json) => {
                if (cancelled || !json) return
                if (json.status === 'success' && json.data) {
                    setNotificationLogs(json.data.logs || [])
                    setNotifTotal(json.data.total || 0)
                    setNotifTotalPages(json.data.totalPages || 1)
                    if (json.data.stats) {
                        setNotificationStats(json.data.stats)
                    }
                }
                setNotifLoading(false)
            })
            .catch(() => {
                if (!cancelled) setNotifLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [isAuthenticated, notifPage, notifLimit, notifSearchFilter, notifStatusFilter, refreshKey])

    // 2c. Fetch User Feedback Logs & Stats
    useEffect(() => {
        if (!isAuthenticated) return
        let cancelled = false

        const params = new URLSearchParams({
            page: String(feedbackPage),
            limit: String(feedbackLimit),
            search: feedbackSearchFilter,
            status: feedbackStatusFilter,
            category: feedbackCategoryFilter,
        })

        fetch(`/api/admin/feedback?${params.toString()}`, { cache: 'no-store' })
            .then((res) => {
                if (res.status === 401) {
                    if (!cancelled) setIsAuthenticated(false)
                    return null
                }
                return res.json()
            })
            .then((json) => {
                if (cancelled || !json) return
                if (json.status === 'success' && json.data) {
                    setFeedbackLogs(json.data.logs || [])
                    setFeedbackTotal(json.data.total || 0)
                    setFeedbackTotalPages(json.data.totalPages || 1)
                    if (json.data.stats) {
                        setFeedbackStats(json.data.stats)
                    }
                }
                setFeedbackLoading(false)
            })
            .catch(() => {
                if (!cancelled) setFeedbackLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [isAuthenticated, feedbackPage, feedbackLimit, feedbackSearchFilter, feedbackStatusFilter, feedbackCategoryFilter, refreshKey])

    // 3. Auto-refresh polling every 12 seconds (pauses when browser tab is hidden/inactive)
    useEffect(() => {
        if (!isAuthenticated || !autoRefresh) return
        const timer = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return
            }
            setRefreshKey((k) => k + 1)
        }, 12000)
        return () => clearInterval(timer)
    }, [isAuthenticated, autoRefresh])

    const handleManualRefresh = () => {
        setDataLoading(true)
        setNotifLoading(true)
        setFeedbackLoading(true)
        setRefreshKey((k) => k + 1)
    }

    // 4. Handle Login
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!passwordInput.trim() || loginSubmitting) return

        setLoginSubmitting(true)
        setLoginError('')

        try {
            const res = await fetch('/api/admin/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: passwordInput }),
            })

            const data = await res.json()
            if (res.ok && data.status === 'success') {
                setIsAuthenticated(true)
                setPasswordInput('')
            } else {
                setLoginError(data.error || 'Incorrect password')
            }
        } catch {
            setLoginError('Unable to connect to the server.')
        } finally {
            setLoginSubmitting(false)
        }
    }

    // 5. Handle Logout
    const handleLogout = async () => {
        try {
            await fetch('/api/admin/auth', { method: 'DELETE' })
        } finally {
            setIsAuthenticated(false)
            setLogs([])
            setStats(null)
            setScraperData(null)
            setNotificationLogs([])
            setNotificationStats(null)
            setFeedbackLogs([])
            setFeedbackStats(null)
        }
    }

    // 6. Copy Helper
    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard?.writeText(text)
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(null), 1800)
    }

    // 7. CSV Export
    const exportCsv = () => {
        if (!logs.length) return
        const headers = ['ID', 'Date (NPT)', 'Date (ISO)', 'License Number', 'Status', 'Holder Name', 'Office', 'Category', 'IP Address', 'Country', 'City', 'Region']
        const rows = logs.map((l) => [
            l.id,
            `"${formatNepalDateTime(l.created_at, 'en', true)}"`,
            new Date(l.created_at).toISOString(),
            `"${l.license_number}"`,
            l.status,
            `"${l.holder_name || ''}"`,
            `"${l.office || ''}"`,
            `"${l.category || ''}"`,
            l.ip,
            l.country || '',
            `"${l.city || ''}"`,
            `"${l.region || ''}"`,
        ])
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nepal-license-search-logs-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // 8. Notification CSV Export
    const exportNotificationCsv = () => {
        if (!notificationLogs.length) return
        const headers = ['ID', 'Subscribed At (NPT)', 'Subscribed At (ISO)', 'License Number', 'User Email', 'Status', 'Delivered At (NPT)', 'Delivered At (ISO)', 'Holder Name', 'Issuing Office']
        const rows = notificationLogs.map((l) => [
            `"${l.id}"`,
            `"${formatNepalDateTime(l.created_at, 'en', true)}"`,
            new Date(l.created_at).toISOString(),
            `"${l.license_number}"`,
            `"${l.email}"`,
            l.status,
            l.sent_at ? `"${formatNepalDateTime(l.sent_at, 'en', true)}"` : '',
            l.sent_at ? new Date(l.sent_at).toISOString() : '',
            `"${l.holder_name || ''}"`,
            `"${l.office || ''}"`,
        ])
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nepal-license-notification-logs-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // 8b. Delete Single Search Log & Delete All Search Logs
    const handleDeleteSearchLog = (id: number, license: string) => {
        const displayLic = maskLicenseNumber(license, privacyMode)
        setConfirmDialog({
            title: 'Are you sure?',
            message: `Are you sure you want to delete the search log for license ${displayLic}? This action cannot be undone.`,
            confirmLabel: 'Yes, Delete Log',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/admin/logs?id=${encodeURIComponent(String(id))}`, {
                        method: 'DELETE',
                    })
                    if (res.ok) {
                        setLogs((prev) => prev.filter((item) => item.id !== id))
                        setTotal((prev) => Math.max(0, prev - 1))
                        setRefreshKey((k) => k + 1)
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    const handleDeleteAllSearchLogs = () => {
        if (!logs.length && total === 0) return
        setConfirmDialog({
            title: 'Are you sure you want to delete all logs?',
            message: `This will permanently delete ALL ${total.toLocaleString()} search logs. This action cannot be undone.`,
            confirmLabel: `Yes, Delete All (${total.toLocaleString()})`,
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/logs', { method: 'DELETE' })
                    if (res.ok) {
                        setLogs([])
                        setTotal(0)
                        setPage(1)
                        setRefreshKey((k) => k + 1)
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    // 9. Delete Notification Log
    const handleDeleteNotification = (id: string, license: string) => {
        const displayLic = maskLicenseNumber(license, privacyMode)
        setConfirmDialog({
            title: 'Are you sure?',
            message: `Are you sure you want to delete the notification entry for license ${displayLic}? This action cannot be undone.`,
            confirmLabel: 'Yes, Delete Entry',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/admin/notifications?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
                    if (res.ok) {
                        setNotificationLogs((prev) => prev.filter((item) => item.id !== id))
                        setRefreshKey((k) => k + 1)
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    // 10. Feedback CSV Export
    const exportFeedbackCsv = () => {
        if (!feedbackLogs.length) return
        const headers = ['ID', 'Received At (NPT)', 'Received At (ISO)', 'Name', 'Email', 'Category', 'Subject', 'Message', 'License Number', 'Status', 'IP']
        const rows = feedbackLogs.map((l) => [
            `"${l.id}"`,
            `"${formatNepalDateTime(l.created_at, 'en', true)}"`,
            new Date(l.created_at).toISOString(),
            `"${(l.name || '').replace(/"/g, '""')}"`,
            `"${(l.email || '').replace(/"/g, '""')}"`,
            `"${(l.category || '').replace(/"/g, '""')}"`,
            `"${(l.subject || '').replace(/"/g, '""')}"`,
            `"${(l.message || '').replace(/"/g, '""')}"`,
            `"${l.license_number || ''}"`,
            l.status,
            `"${l.ip || ''}"`,
        ])
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nepal-license-feedback-logs-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // 11. Toggle Feedback Status
    const handleToggleFeedbackStatus = async (id: string, currentStatus: 'new' | 'resolved') => {
        const nextStatus = currentStatus === 'new' ? 'resolved' : 'new'
        try {
            const res = await fetch('/api/admin/feedback', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: nextStatus }),
            })
            if (res.ok) {
                setFeedbackLogs((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
                )
                if (selectedFeedbackMessage && selectedFeedbackMessage.id === id) {
                    setSelectedFeedbackMessage({ ...selectedFeedbackMessage, status: nextStatus })
                }
                setRefreshKey((k) => k + 1)
            }
        } catch {
            // Error
        }
    }

    // 12. Delete Feedback
    const handleDeleteFeedback = (id: string, subject: string) => {
        setConfirmDialog({
            title: 'Are you sure?',
            message: `Are you sure you want to delete feedback entry: "${subject}"? This action cannot be undone.`,
            confirmLabel: 'Yes, Delete Feedback',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/admin/feedback?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
                    if (res.ok) {
                        setFeedbackLogs((prev) => prev.filter((item) => item.id !== id))
                        if (selectedFeedbackMessage && selectedFeedbackMessage.id === id) {
                            setSelectedFeedbackMessage(null)
                        }
                        setRefreshKey((k) => k + 1)
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    // ----------------------------------------------------
    // Loading Screen
    // ----------------------------------------------------
    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] p-4 text-[var(--text-secondary)]">
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-6 py-4 shadow-sm">
                    <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                    <span className="text-sm font-medium">Checking credentials...</span>
                </div>
            </div>
        )
    }

    // ----------------------------------------------------
    // Login Screen
    // ----------------------------------------------------
    if (!isAuthenticated) {
        return (
            <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--bg-primary)] px-4 py-8">
                {/* Ambient glow */}
                <div
                    className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-full max-w-lg rounded-full bg-gradient-to-br from-[var(--nepal-blue)]/15 via-[var(--nepal-red)]/10 to-transparent blur-3xl"
                    aria-hidden
                />

                <div className="relative w-full max-w-md animate-rise-in">
                    {/* Brand header */}
                    <div className="mb-4 flex flex-col items-center text-center">
                        <div className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2 shadow-sm">
                            <Image
                                src="/License-Checker-Nepal-logo.png"
                                alt="Nepal License Checker"
                                width={44}
                                height={44}
                                priority
                                className="object-contain"
                            />
                        </div>
                        <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)]">
                            Admin Console
                        </h1>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            View live license searches, visitor IPs, and geolocation analytics.
                        </p>
                    </div>

                    {/* Login Card */}
                    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-xl shadow-black/[0.04] sm:p-7">
                        {!isConfigured ? (
                            <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3 text-xs text-[var(--warning-text)]">
                                <strong>Admin password is not set.</strong>
                                <p className="mt-1">
                                    Please set <code className="font-mono font-bold">ADMIN_PASSWORD</code> or <code className="font-mono font-bold">MAINTENANCE_PASSWORD</code> in your environment variables.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="admin-password"
                                        className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                                    >
                                        Administrator Password
                                    </label>
                                    <div className="relative mt-1.5">
                                        <input
                                            id="admin-password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={passwordInput}
                                            onChange={(e) => {
                                                setPasswordInput(e.target.value)
                                                if (loginError) setLoginError('')
                                            }}
                                            placeholder="Enter password..."
                                            autoFocus
                                            autoComplete="current-password"
                                            className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 pr-10 text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {loginError && (
                                    <div className="flex items-center gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-2.5 text-xs font-semibold text-[var(--error)] animate-shake">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <span>{loginError}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loginSubmitting || !passwordInput.trim()}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-mid)] disabled:cursor-not-allowed disabled:bg-[var(--text-muted)]"
                                >
                                    {loginSubmitting ? (
                                        <>
                                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <span>Sign In to Dashboard</span>
                                    )}
                                </button>
                            </form>
                        )}

                        <div className="mt-4 border-t border-[var(--border-default)]/60 pt-4 text-center">
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition hover:text-[var(--nepal-blue)]"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                                <span>Back to License Checker</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        )
    }

    // ----------------------------------------------------
    // Authenticated Admin Dashboard
    // ----------------------------------------------------
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pb-16 text-[var(--text-primary)]">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 border-b border-[var(--border-default)] bg-[var(--surface-primary)]/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1">
                                <Image
                                    src="/License-Checker-Nepal-logo.png"
                                    alt="Nepal License Checker"
                                    width={28}
                                    height={28}
                                    className="object-contain"
                                />
                            </div>
                            <div>
                                <h1 className="text-sm font-black tracking-tight sm:text-base">
                                    Admin Console
                                </h1>
                                <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                                    <span>Turso Edge DB Connected</span>
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Privacy Mode Toggle (ON by default) */}
                        <button
                            type="button"
                            onClick={() => setPrivacyMode(!privacyMode)}
                            className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-xs transition active:scale-95 ${
                                privacyMode
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }`}
                            title={
                                privacyMode
                                    ? 'Privacy Mode is ON (License & IP masked). Click to disable and view full information.'
                                    : 'Privacy Mode is OFF (Showing full License & IP). Click to enable masking.'
                            }
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
                            <span>Privacy: {privacyMode ? 'ON' : 'OFF'}</span>
                        </button>

                        {/* Auto-refresh toggle */}
                        <button
                            type="button"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`hidden items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition sm:inline-flex ${
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
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95"
                            title="Refresh logs now"
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
                            <span className="hidden sm:inline">Refresh</span>
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
                                    ? !logs.length
                                    : activeTab === 'notifications'
                                    ? !notificationLogs.length
                                    : !feedbackLogs.length
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:opacity-50"
                            title={
                                activeTab === 'searches'
                                    ? 'Export search queries to CSV'
                                    : activeTab === 'notifications'
                                    ? 'Export notification logs to CSV'
                                    : 'Export feedback inquiries to CSV'
                            }
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span className="hidden sm:inline">Export</span>
                        </button>

                        {/* Sign Out */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)]/80 bg-[var(--error-bg)] px-3 text-xs font-semibold text-[var(--error)] shadow-xs transition hover:bg-[var(--error-border)] active:scale-95"
                            title="Sign out from admin console"
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

            <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
                {/* KPI Metrics Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    {/* Total Searches */}
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                        <div className="flex items-center justify-between text-[var(--text-muted)]">
                            <span className="text-xs font-bold uppercase tracking-wider">Total Searches</span>
                            <span className="rounded-lg bg-[var(--nepal-blue-soft)] p-1.5 text-[var(--nepal-blue)]">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                            {stats ? stats.total.toLocaleString() : '—'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">All-time recorded queries</p>
                    </div>

                    {/* Today's Searches */}
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                        <div className="flex items-center justify-between text-[var(--text-muted)]">
                            <span className="text-xs font-bold uppercase tracking-wider">Today</span>
                            <span className="rounded-lg bg-[var(--info-bg)] p-1.5 text-[var(--info-text)]">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                </svg>
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                            {stats ? stats.today.toLocaleString() : '—'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Since midnight local</p>
                    </div>

                    {/* Found Success Rate */}
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                        <div className="flex items-center justify-between text-[var(--text-muted)]">
                            <span className="text-xs font-bold uppercase tracking-wider">Found Rate</span>
                            <span className="rounded-lg bg-[var(--success-bg)] p-1.5 text-[var(--success)]">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <p className="text-2xl font-black tracking-tight text-[var(--success)]">
                                {stats ? `${stats.foundRate}%` : '—'}
                            </p>
                            <span className="text-xs text-[var(--text-muted)]">
                                ({stats ? stats.found : 0} printed)
                            </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                            <div
                                className="h-full rounded-full bg-[var(--success)] transition-all duration-500"
                                style={{ width: `${stats ? stats.foundRate : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Unique Visitors / IPs */}
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                        <div className="flex items-center justify-between text-[var(--text-muted)]">
                            <span className="text-xs font-bold uppercase tracking-wider">Unique IPs</span>
                            <span className="rounded-lg bg-purple-500/10 p-1.5 text-purple-600 dark:text-purple-400">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </span>
                        </div>
                        <p className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                            {stats ? stats.uniqueIps.toLocaleString() : '—'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Unique searcher addresses</p>
                    </div>
                </div>

                {/* Top Locations Bar */}
                {stats && stats.topLocations.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 shadow-xs">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>Top Search Origins:</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {stats.topLocations.map((loc, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => {
                                        setSearchFilter(loc.city === 'Unknown' ? '' : loc.city)
                                        setPage(1)
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)]"
                                >
                                    <span>{getFlag(loc.country)}</span>
                                    <span className="font-semibold">{loc.city}</span>
                                    <span className="rounded-full bg-[var(--surface-primary)] px-1.5 py-0.2 text-[10px] text-[var(--text-muted)] font-mono">
                                        {loc.count}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* DOTM Automation & Scraper Status Monitor */}
                <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border-default)]/60 pb-3.5">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)]">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                    <path d="M3 3v5h5" />
                                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                    <path d="M16 21h5v-5" />
                                </svg>
                            </span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-sm font-bold text-[var(--text-primary)] sm:text-base">
                                        DOTM Scraper & Cron Monitor
                                    </h2>
                                    <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border-default)]">
                                        dotm-scraper-cron.yml
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Automated PDF indexer mirroring Department of Transport Management print records
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <a
                                href="https://github.com/NischalAcharya060/Nepal-License-Checker/actions/workflows/dotm-scraper-cron.yml"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)]"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                <span>GitHub Workflow ↗</span>
                            </a>
                        </div>
                    </div>

                    {/* 3 Metric Summary Boxes */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                        {/* Next Scheduled Run */}
                        <div className="rounded-xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/50 p-3.5">
                            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                <span className="font-semibold uppercase tracking-wider">Next Scheduled Run</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)]">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
                                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                                    </svg>
                                    {scraperData?.nextRun?.timestamp
                                        ? formatTimeUntil(scraperData.nextRun.timestamp, 'en')
                                        : 'Scheduled'}
                                </span>
                            </div>
                            <p className="mt-2 text-base font-bold text-[var(--text-primary)]">
                                {scraperData?.nextRun?.timestamp
                                    ? formatNepalDateTime(scraperData.nextRun.timestamp, 'en')
                                    : 'Awaiting sync'}
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                <span>Cron:</span>
                                <code className="rounded bg-[var(--surface-primary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                                    {scraperData?.schedule || '0 2 1,15 * *'}
                                </code>
                                <span className="text-[10px] text-[var(--text-muted)]">(07:45 NPT)</span>
                            </p>
                        </div>

                        {/* Last Run Status & Trigger */}
                        <div className="rounded-xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/50 p-3.5">
                            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                <span className="font-semibold uppercase tracking-wider">Last Run Status</span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    scraperData?.lastRun?.status === 'success'
                                        ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                        : scraperData?.lastRun?.status === 'circuit_breaker'
                                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                            : scraperData?.lastRun
                                                ? 'bg-purple-500/10 text-purple-600'
                                                : 'bg-gray-500/10 text-gray-500'
                                }`}>
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                    {scraperData?.lastRun?.status === 'success'
                                        ? 'Completed'
                                        : scraperData?.lastRun?.status === 'circuit_breaker'
                                            ? 'CDN Outage'
                                            : scraperData?.lastRun?.status || 'Ready'}
                                </span>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <p className="text-base font-bold text-[var(--text-primary)] capitalize">
                                    {scraperData?.lastRun?.trigger
                                        ? scraperData.lastRun.trigger.replace('_', ' ')
                                        : 'Awaiting First Run'}
                                </p>
                                {scraperData?.lastRun?.timestamp && (
                                    <span className="text-xs text-[var(--text-muted)]">
                                        ({formatTimeAgo(scraperData.lastRun.timestamp)})
                                    </span>
                                )}
                            </div>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                {scraperData?.lastRun?.timestamp
                                    ? `${formatNepalDateTime(scraperData.lastRun.timestamp, 'en')} (NPT) • ${scraperData.lastRun.durationSeconds ? `${scraperData.lastRun.durationSeconds}s` : 'Done'}`
                                    : 'Runs incrementally on schedule'}
                            </p>
                        </div>

                        {/* Database Records & Sync */}
                        <div className="rounded-xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/50 p-3.5">
                            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                                <span className="font-semibold uppercase tracking-wider">Indexed Database</span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                                    Turso libSQL
                                </span>
                            </div>
                            <p className="mt-2 text-base font-bold text-[var(--text-primary)]">
                                {(scraperData?.totalRecords || 1185710).toLocaleString()} <span className="text-xs font-normal text-[var(--text-muted)]">licenses stored</span>
                            </p>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                                {scraperData?.lastRun?.scraped !== undefined
                                    ? `Last sync: ${scraperData.lastRun.scraped} scraped, ${scraperData.lastRun.saved} saved`
                                    : 'Syncs new PDF records without duplicates'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* View Mode Tab Switcher */}
                <div className="mt-6 flex flex-col gap-3 border-b border-[var(--border-default)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex flex-wrap rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setActiveTab('searches')}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 ${
                                activeTab === 'searches'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <span>Search Queries</span>
                            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                                activeTab === 'searches' ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                            }`}>
                                {total.toLocaleString()}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('notifications')}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 ${
                                activeTab === 'notifications'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                            <span>Email Notifications</span>
                            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                                activeTab === 'notifications' ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                            }`}>
                                {notifTotal.toLocaleString()}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('feedback')}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 ${
                                activeTab === 'feedback'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span>Feedback & Support</span>
                            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                                activeTab === 'feedback' ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                            }`}>
                                {feedbackTotal.toLocaleString()}
                            </span>
                            {feedbackStats && feedbackStats.newCount > 0 && (
                                <span className="inline-flex items-center justify-center rounded-full bg-[var(--nepal-red)] px-1.5 py-0.2 text-[10px] font-bold text-white animate-pulse" title={`${feedbackStats.newCount} new unread feedbacks`}>
                                    {feedbackStats.newCount} new
                                </span>
                            )}
                        </button>
                    </div>

                    {activeTab === 'notifications' && notificationStats && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                                <span className="font-medium text-[var(--text-secondary)]">Delivered:</span>
                                <strong className="font-bold text-[var(--text-primary)]">{notificationStats.sent}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="font-medium text-[var(--text-secondary)]">In Queue:</span>
                                <strong className="font-bold text-[var(--text-primary)]">{notificationStats.pending}</strong>
                            </span>
                        </div>
                    )}

                    {activeTab === 'feedback' && feedbackStats && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="font-medium">New / Unread:</span>
                                <strong className="font-bold">{feedbackStats.newCount}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                                <span className="font-medium text-[var(--text-secondary)]">Resolved:</span>
                                <strong className="font-bold text-[var(--text-primary)]">{feedbackStats.resolvedCount}</strong>
                            </span>
                        </div>
                    )}
                </div>

                {activeTab === 'searches' ? (
                    <>
                        {/* Search & Filter Toolbar */}
                        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 shadow-sm">
                            {/* Search Input */}
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
                                    value={searchFilter}
                                    onChange={(e) => {
                                        setSearchFilter(e.target.value)
                                        startTransition(() => setPage(1))
                                    }}
                                    placeholder="Filter by license, IP, holder name, city..."
                                    className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9 pr-9 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                                />
                                {searchFilter && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchFilter('')
                                            setPage(1)
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

                            <div className="flex items-center gap-2">
                                {/* Status Filter */}
                                <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1 text-xs font-semibold">
                                    {(['all', 'found', 'not_found'] as const).map((st) => (
                                        <button
                                            key={st}
                                            type="button"
                                            onClick={() => {
                                                setStatusFilter(st)
                                                setPage(1)
                                            }}
                                            className={`rounded-lg px-2.5 py-1 capitalize transition ${
                                                statusFilter === st
                                                    ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs font-bold'
                                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            {st === 'not_found' ? 'Not Found' : st}
                                        </button>
                                    ))}
                                </div>

                                {/* Limit Selector */}
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value))
                                        setPage(1)
                                    }}
                                    className="h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] focus:outline-none"
                                >
                                    <option value={25}>25 rows</option>
                                    <option value={50}>50 rows</option>
                                    <option value={100}>100 rows</option>
                                </select>

                                {/* Delete All Logs Button */}
                                <button
                                    type="button"
                                    onClick={handleDeleteAllSearchLogs}
                                    disabled={total === 0 || dataLoading}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--error-border)]/80 bg-[var(--error-bg)] px-3 text-xs font-semibold text-[var(--error)] shadow-xs transition hover:bg-[var(--error-border)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Delete all search logs"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    <span>Delete All</span>
                                </button>
                            </div>
                        </div>

                        {/* Search Logs Table */}
                        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                        <tr>
                                            <th className="py-3 pl-4 pr-3">Time (NPT)</th>
                                            <th className="px-3 py-3">License Number</th>
                                            <th className="px-3 py-3">Result</th>
                                            <th className="px-3 py-3">Holder Name</th>
                                            <th className="px-3 py-3">IP Address</th>
                                            <th className="px-3 py-3">Location (Origin)</th>
                                            <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-default)]/60">
                                        {dataLoading && !logs.length ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                                        <span>Loading search queries...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : logs.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-xs text-[var(--text-muted)]">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                                            <circle cx="12" cy="12" r="10" />
                                                            <line x1="8" y1="12" x2="16" y2="12" />
                                                        </svg>
                                                        <span className="font-semibold text-[var(--text-secondary)]">No search records found.</span>
                                                        <p className="text-[11px]">When users query licenses on the site, their searches will appear here in real-time.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            logs.map((log) => {
                                                const isFound = log.status === 'found'
                                                return (
                                                    <tr
                                                        key={log.id}
                                                        className="group transition-colors hover:bg-[var(--bg-secondary)]/40"
                                                    >
                                                        {/* Timestamp */}
                                                        <td className="whitespace-nowrap py-3 pl-4 pr-3 font-mono text-[11px]">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-semibold text-[var(--text-primary)]" title={`${formatNepalDateTime(log.created_at, 'en', true)} (NPT, UTC+5:45)`}>
                                                                    {formatNepalDateTime(log.created_at)}
                                                                </span>
                                                                <span className="text-[10px] text-[var(--text-muted)]">
                                                                    {formatTimeAgo(log.created_at)}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* License Number */}
                                                        <td className="whitespace-nowrap px-3 py-3">
                                                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--text-primary)]">
                                                                <span>{maskLicenseNumber(log.license_number, privacyMode)}</span>
                                                                {!privacyMode && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyToClipboard(log.license_number, `lic-${log.id}`)}
                                                                        className="text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--nepal-blue)]"
                                                                        title="Copy license number"
                                                                    >
                                                                        {copiedKey === `lic-${log.id}` ? (
                                                                            <span className="text-[10px] font-bold text-[var(--success)]">✓</span>
                                                                        ) : (
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Result Status Badge */}
                                                        <td className="whitespace-nowrap px-3 py-3">
                                                            {isFound ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                                                                    <span>✓</span>
                                                                    <span>Found</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                                                                    <span>✕</span>
                                                                    <span>Not Found</span>
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Holder Name */}
                                                        <td className="whitespace-nowrap px-3 py-3 text-xs">
                                                            {log.holder_name ? (
                                                                <div>
                                                                    <span className="font-bold text-[var(--text-primary)]">
                                                                        {log.holder_name}
                                                                    </span>
                                                                    {log.office && (
                                                                        <p className="text-[10px] text-[var(--text-muted)]">
                                                                            {log.office}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[var(--text-muted)]">—</span>
                                                            )}
                                                        </td>

                                                        {/* IP Address */}
                                                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">
                                                            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                                <span>{maskIpAddress(log.ip, privacyMode)}</span>
                                                                {!privacyMode && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyToClipboard(log.ip, `ip-${log.id}`)}
                                                                        className="text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--nepal-blue)]"
                                                                        title="Copy IP"
                                                                    >
                                                                        {copiedKey === `ip-${log.id}` ? (
                                                                            <span className="text-[10px] font-bold text-[var(--success)]">✓</span>
                                                                        ) : (
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* Location / Origin */}
                                                        <td className="whitespace-nowrap px-3 py-3 text-xs">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-base" title={log.country || 'Unknown'}>
                                                                    {getFlag(log.country)}
                                                                </span>
                                                                <div>
                                                                    <span className="font-semibold text-[var(--text-primary)]">
                                                                        {log.city || 'Unknown City'}
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
                                                        <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteSearchLog(log.id, log.license_number)}
                                                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)]"
                                                                title="Delete search log"
                                                            >
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

                            {/* Pagination Bar */}
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border-default)] px-4 py-3 sm:flex-row">
                                <div className="text-xs text-[var(--text-muted)]">
                                    Showing <span className="font-bold text-[var(--text-primary)]">{logs.length ? (page - 1) * limit + 1 : 0}</span> to{' '}
                                    <span className="font-bold text-[var(--text-primary)]">{Math.min(page * limit, total)}</span> of{' '}
                                    <span className="font-bold text-[var(--text-primary)]">{total.toLocaleString()}</span> queries
                                    {lastUpdated && (
                                        <span className="ml-2 hidden text-[11px] text-[var(--text-muted)] sm:inline">
                                            (Updated: {lastUpdated.toLocaleTimeString('en-NP', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit', second: '2-digit' })} NPT)
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={page <= 1 || dataLoading}
                                        onClick={() => setPage(page - 1)}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6" />
                                        </svg>
                                        <span>Prev</span>
                                    </button>
                                    <span className="px-2 font-mono text-xs font-bold text-[var(--text-secondary)]">
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={page >= totalPages || dataLoading}
                                        onClick={() => setPage(page + 1)}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <span>Next</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : activeTab === 'notifications' ? (
                    <>
                        {/* Email Notification KPI Metrics */}
                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                            {/* Total Subscribers */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                                <div className="flex items-center justify-between text-[var(--text-muted)]">
                                    <span className="text-xs font-bold uppercase tracking-wider">Subscribers</span>
                                    <span className="rounded-lg bg-[var(--nepal-blue-soft)] p-1.5 text-[var(--nepal-blue)]">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                                    {notificationStats ? notificationStats.total.toLocaleString() : notifTotal.toLocaleString()}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Registered for print alerts</p>
                            </div>

                            {/* Successfully Delivered */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                                <div className="flex items-center justify-between text-[var(--text-muted)]">
                                    <span className="text-xs font-bold uppercase tracking-wider">Delivered</span>
                                    <span className="rounded-lg bg-[var(--success-bg)] p-1.5 text-[var(--success)]">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                    </span>
                                </div>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <p className="text-2xl font-black tracking-tight text-[var(--success)]">
                                        {notificationStats ? notificationStats.sent.toLocaleString() : '0'}
                                    </p>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        ({notificationStats ? `${notificationStats.deliveryRate}%` : '0%'} sent)
                                    </span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                                    <div
                                        className="h-full rounded-full bg-[var(--success)] transition-all duration-500"
                                        style={{ width: `${notificationStats ? notificationStats.deliveryRate : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Pending in Queue */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                                <div className="flex items-center justify-between text-[var(--text-muted)]">
                                    <span className="text-xs font-bold uppercase tracking-wider">In Queue</span>
                                    <span className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="mt-2 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                                    {notificationStats ? notificationStats.pending.toLocaleString() : '0'}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Awaiting DOTM publication</p>
                            </div>

                            {/* Cancelled / Unsubscribed */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                                <div className="flex items-center justify-between text-[var(--text-muted)]">
                                    <span className="text-xs font-bold uppercase tracking-wider">Cancelled</span>
                                    <span className="rounded-lg bg-gray-500/10 p-1.5 text-gray-500">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                                    {notificationStats ? notificationStats.cancelled.toLocaleString() : '0'}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Unsubscribed by user</p>
                            </div>
                        </div>

                        {/* Notification Search & Filter Toolbar */}
                        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 shadow-sm">
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
                                    value={notifSearchFilter}
                                    onChange={(e) => {
                                        setNotifSearchFilter(e.target.value)
                                        startTransition(() => setNotifPage(1))
                                    }}
                                    placeholder="Filter by email, license number, or holder name..."
                                    className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9 pr-9 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                                />
                                {notifSearchFilter && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNotifSearchFilter('')
                                            setNotifPage(1)
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

                            <div className="flex items-center gap-2">
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
                                            className={`rounded-lg px-2.5 py-1 capitalize transition ${
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
                                    className="h-9 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] focus:outline-none"
                                >
                                    <option value={25}>25 rows</option>
                                    <option value={50}>50 rows</option>
                                    <option value={100}>100 rows</option>
                                </select>
                            </div>
                        </div>

                        {/* Notifications Logs Table */}
                        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                        <tr>
                                            <th className="py-3 pl-4 pr-3">Subscribed (NPT)</th>
                                            <th className="px-3 py-3">License Number</th>
                                            <th className="px-3 py-3">User Email</th>
                                            <th className="px-3 py-3">Status & Delivery</th>
                                            <th className="px-3 py-3">License Match (DOTM)</th>
                                            <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-default)]/60">
                                        {notifLoading && !notificationLogs.length ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-xs text-[var(--text-muted)]">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                                        <span>Loading email notifications...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : notificationLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-12 text-center text-xs text-[var(--text-muted)]">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                        </svg>
                                                        <span className="font-semibold text-[var(--text-secondary)]">No notification subscriptions found.</span>
                                                        <p className="text-[11px]">When users subscribe for license print alerts, their requests and delivery logs will appear here.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            notificationLogs.map((log) => {
                                                return (
                                                    <tr
                                                        key={log.id}
                                                        className="group transition-colors hover:bg-[var(--bg-secondary)]/40"
                                                    >
                                                        {/* Timestamp */}
                                                        <td className="whitespace-nowrap py-3 pl-4 pr-3 font-mono text-[11px]">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-semibold text-[var(--text-primary)]" title={`${formatNepalDateTime(log.created_at, 'en', true)} (NPT, UTC+5:45)`}>
                                                                    {formatNepalDateTime(log.created_at)}
                                                                </span>
                                                                <span className="text-[10px] text-[var(--text-muted)]">
                                                                    {formatTimeAgo(log.created_at)}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        {/* License Number */}
                                                        <td className="whitespace-nowrap px-3 py-3">
                                                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--text-primary)]">
                                                                <span>{maskLicenseNumber(log.license_number, privacyMode)}</span>
                                                                {!privacyMode && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyToClipboard(log.license_number, `notif-lic-${log.id}`)}
                                                                        className="text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--nepal-blue)]"
                                                                        title="Copy license number"
                                                                    >
                                                                        {copiedKey === `notif-lic-${log.id}` ? (
                                                                            <span className="text-[10px] font-bold text-[var(--success)]">✓</span>
                                                                        ) : (
                                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* User Email */}
                                                        <td className="whitespace-nowrap px-3 py-3">
                                                            <div className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-primary)]">
                                                                <span>{log.email}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => copyToClipboard(log.email, `notif-mail-${log.id}`)}
                                                                    className="text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--nepal-blue)]"
                                                                    title="Copy email address"
                                                                >
                                                                    {copiedKey === `notif-mail-${log.id}` ? (
                                                                        <span className="text-[10px] font-bold text-[var(--success)]">✓</span>
                                                                    ) : (
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </td>

                                                        {/* Status / Delivery Badge */}
                                                        <td className="whitespace-nowrap px-3 py-3">
                                                            {log.status === 'sent' ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                                                                        <span>✓</span>
                                                                        <span>Delivered</span>
                                                                    </span>
                                                                    {log.sent_at && (
                                                                        <span className="text-[10px] text-[var(--text-muted)]" title={`${formatNepalDateTime(log.sent_at, 'en', true)} (NPT, UTC+5:45)`}>
                                                                            Sent: {formatNepalDateTime(log.sent_at)} ({formatTimeAgo(log.sent_at)})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : log.status === 'cancelled' ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                                                                        <span>✕</span>
                                                                        <span>Cancelled</span>
                                                                    </span>
                                                                    {log.cancelled_at && (
                                                                        <span className="text-[10px] text-[var(--text-muted)]" title={`${formatNepalDateTime(log.cancelled_at, 'en', true)} (NPT, UTC+5:45)`}>
                                                                            Cancelled: {formatNepalDateTime(log.cancelled_at)} ({formatTimeAgo(log.cancelled_at)})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="inline-flex w-fit items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                                        <span>In Queue</span>
                                                                    </span>
                                                                    <span className="text-[10px] text-[var(--text-muted)]">
                                                                        Awaiting print
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* License Match / Holder */}
                                                        <td className="whitespace-nowrap px-3 py-3 text-xs">
                                                            {log.holder_name ? (
                                                                <div>
                                                                    <span className="font-bold text-[var(--text-primary)]">
                                                                        {log.holder_name}
                                                                    </span>
                                                                    {log.office && (
                                                                        <p className="text-[10px] text-[var(--text-muted)]">
                                                                            {log.office}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[11px] text-[var(--text-muted)] italic">
                                                                    Not in records yet
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteNotification(log.id, log.license_number)}
                                                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)]"
                                                                title="Delete notification record"
                                                            >
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

                            {/* Notification Pagination Bar */}
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border-default)] px-4 py-3 sm:flex-row">
                                <div className="text-xs text-[var(--text-muted)]">
                                    Showing <span className="font-bold text-[var(--text-primary)]">{notificationLogs.length ? (notifPage - 1) * notifLimit + 1 : 0}</span> to{' '}
                                    <span className="font-bold text-[var(--text-primary)]">{Math.min(notifPage * notifLimit, notifTotal)}</span> of{' '}
                                    <span className="font-bold text-[var(--text-primary)]">{notifTotal.toLocaleString()}</span> subscriptions
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={notifPage <= 1 || notifLoading}
                                        onClick={() => setNotifPage(notifPage - 1)}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6" />
                                        </svg>
                                        <span>Prev</span>
                                    </button>
                                    <span className="px-2 font-mono text-xs font-bold text-[var(--text-secondary)]">
                                        {notifPage} / {notifTotalPages}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={notifPage >= notifTotalPages || notifLoading}
                                        onClick={() => setNotifPage(notifPage + 1)}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <span>Next</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* User Feedback & Support KPI Metrics */}
                        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                            {/* Total Inquiries */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                                <div className="flex items-center justify-between text-[var(--text-muted)]">
                                    <span className="text-xs font-bold uppercase tracking-wider">Total Inquiries</span>
                                    <span className="rounded-lg bg-[var(--nepal-blue-soft)] p-1.5 text-[var(--nepal-blue)]">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                                    {(feedbackStats?.total ?? feedbackTotal ?? 0).toLocaleString()}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">User messages submitted</p>
                            </div>

                            {/* New / Action Required */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                                <div className="flex items-center justify-between text-[var(--text-muted)]">
                                    <span className="text-xs font-bold uppercase tracking-wider">New / Unread</span>
                                    <span className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="mt-2 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
                                    {(feedbackStats?.newCount ?? 0).toLocaleString()}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Awaiting administrator review</p>
                            </div>

                            {/* Resolved */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                                <div className="flex items-center justify-between text-[var(--text-muted)]">
                                    <span className="text-xs font-bold uppercase tracking-wider">Resolved</span>
                                    <span className="rounded-lg bg-[var(--success-bg)] p-1.5 text-[var(--success)]">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                            <polyline points="22 4 12 14.01 9 11.01" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="mt-2 text-2xl font-black tracking-tight text-[var(--success)]">
                                    {(feedbackStats?.resolvedCount ?? 0).toLocaleString()}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Handled or answered inquiries</p>
                            </div>

                            {/* Today's Inquiries */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm">
                                <div className="flex items-center justify-between text-[var(--text-muted)]">
                                    <span className="text-xs font-bold uppercase tracking-wider">Today</span>
                                    <span className="rounded-lg bg-[var(--info-bg)] p-1.5 text-[var(--info-text)]">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                            <line x1="16" y1="2" x2="16" y2="6" />
                                            <line x1="8" y1="2" x2="8" y2="6" />
                                            <line x1="3" y1="10" x2="21" y2="10" />
                                        </svg>
                                    </span>
                                </div>
                                <p className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
                                    {(feedbackStats?.todayCount ?? 0).toLocaleString()}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Submitted today</p>
                            </div>
                        </div>

                        {/* Feedback Search & Filter Toolbar */}
                        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 shadow-sm">
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
                                    className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9 pr-9 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
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
                                    className="h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-xs font-semibold text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:outline-none"
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
                                            className={`rounded-lg px-2.5 py-1 capitalize transition ${
                                                feedbackStatusFilter === st
                                                    ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs'
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
                                    className="h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] transition focus:border-[var(--nepal-blue)] focus:outline-none"
                                >
                                    <option value="25">25 / page</option>
                                    <option value="50">50 / page</option>
                                    <option value="100">100 / page</option>
                                </select>
                            </div>
                        </div>

                        {/* Feedback Table */}
                        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)] text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                                        <tr>
                                            <th className="py-3 pl-4 pr-3">Status</th>
                                            <th className="px-3 py-3">Submitter</th>
                                            <th className="px-3 py-3">Category & Subject</th>
                                            <th className="px-3 py-3">License No.</th>
                                            <th className="px-3 py-3">Message</th>
                                            <th className="px-3 py-3">Received (NPT)</th>
                                            <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-default)]/60">
                                        {feedbackLoading ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-sm text-[var(--text-muted)]">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--nepal-blue)]/30 border-t-[var(--nepal-blue)]" />
                                                        <span>Loading feedback records...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : feedbackLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-14 text-center text-sm text-[var(--text-muted)]">
                                                    <div className="flex flex-col items-center justify-center gap-2.5">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-2xl text-[var(--nepal-blue)]">
                                                            💬
                                                        </div>
                                                        <span className="text-base font-bold text-[var(--text-primary)]">
                                                            There is no data in feedback form
                                                        </span>
                                                        <p className="max-w-md text-xs text-[var(--text-muted)]">
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
                                                                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--nepal-blue)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--surface-primary)]"
                                                            >
                                                                Clear filters
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            feedbackLogs.map((item) => {
                                                const catInfo = (() => {
                                                    switch (item.category) {
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
                                                })()

                                                return (
                                                    <tr key={item.id} className="transition hover:bg-[var(--bg-secondary)]/50">
                                                        {/* Status */}
                                                        <td className="whitespace-nowrap py-3 pl-4 pr-3">
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

                            {/* Feedback Pagination Bar */}
                            <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border-default)] px-4 py-3 sm:flex-row">
                                <div className="text-xs text-[var(--text-muted)]">
                                    Showing <span className="font-bold text-[var(--text-primary)]">{feedbackLogs.length ? (feedbackPage - 1) * feedbackLimit + 1 : 0}</span> to{' '}
                                    <span className="font-bold text-[var(--text-primary)]">{Math.min(feedbackPage * feedbackLimit, feedbackTotal)}</span> of{' '}
                                    <span className="font-bold text-[var(--text-primary)]">{feedbackTotal.toLocaleString()}</span> inquiries
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={feedbackPage <= 1 || feedbackLoading}
                                        onClick={() => setFeedbackPage(feedbackPage - 1)}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6" />
                                        </svg>
                                        <span>Prev</span>
                                    </button>
                                    <span className="px-2 font-mono text-xs font-bold text-[var(--text-secondary)]">
                                        {feedbackPage} / {feedbackTotalPages}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={feedbackPage >= feedbackTotalPages || feedbackLoading}
                                        onClick={() => setFeedbackPage(feedbackPage + 1)}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <span>Next</span>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Detail Message Modal */}
                {selectedFeedbackMessage && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
                        onClick={() => setSelectedFeedbackMessage(null)}
                    >
                        <div
                            className="relative w-full max-w-xl rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-2xl animate-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                                            selectedFeedbackMessage.status === 'new'
                                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                : 'border-[var(--success)]/30 bg-[var(--success-bg)] text-[var(--success)]'
                                        }`}>
                                            {selectedFeedbackMessage.status === 'new' ? '● New Inquiry' : '✓ Resolved'}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)] font-mono" title={`${formatNepalDateTime(selectedFeedbackMessage.created_at, 'en', true)} (NPT, UTC+5:45)`}>
                                            {formatNepalDateTime(selectedFeedbackMessage.created_at, 'en', true)} (NPT) • {formatTimeAgo(selectedFeedbackMessage.created_at)}
                                        </span>
                                    </div>
                                    <h3 className="mt-1.5 text-base font-black text-[var(--text-primary)]">
                                        {selectedFeedbackMessage.subject}
                                    </h3>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedFeedbackMessage(null)}
                                    className="rounded-full border border-[var(--border-default)] p-1.5 text-[var(--text-muted)] hover:border-[var(--nepal-blue)] hover:text-[var(--text-primary)]"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>

                            {/* Submitter & License Info */}
                            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-xs">
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Submitter Name</span>
                                    <p className="font-bold text-[var(--text-primary)]">{selectedFeedbackMessage.name}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Contact Email</span>
                                    <p>
                                        <a
                                            href={`mailto:${selectedFeedbackMessage.email}?subject=${encodeURIComponent(`Re: [Support] ${selectedFeedbackMessage.subject}`)}`}
                                            className="font-mono font-semibold text-[var(--nepal-blue)] hover:underline"
                                        >
                                            {selectedFeedbackMessage.email}
                                        </a>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">License Number</span>
                                    <p className="font-mono font-semibold text-[var(--text-primary)]">
                                        {selectedFeedbackMessage.license_number
                                            ? maskLicenseNumber(selectedFeedbackMessage.license_number, privacyMode)
                                            : 'Not provided'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">IP & Category</span>
                                    <p className="text-[var(--text-secondary)]">
                                        {selectedFeedbackMessage.category} ·{' '}
                                        {selectedFeedbackMessage.ip
                                            ? maskIpAddress(selectedFeedbackMessage.ip, privacyMode)
                                            : 'Unknown IP'}
                                    </p>
                                </div>
                            </div>

                            {/* Message Body */}
                            <div className="mt-4">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                    User Message:
                                </span>
                                <div className="mt-1.5 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 font-sans text-xs leading-relaxed text-[var(--text-primary)] select-text">
                                    {selectedFeedbackMessage.message}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="mt-5 flex items-center justify-between border-t border-[var(--border-default)] pt-4">
                                <button
                                    type="button"
                                    onClick={() => handleToggleFeedbackStatus(selectedFeedbackMessage.id, selectedFeedbackMessage.status)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
                                        selectedFeedbackMessage.status === 'new'
                                            ? 'bg-[var(--success)] text-white hover:bg-emerald-600'
                                            : 'border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] hover:border-amber-500 hover:text-amber-600'
                                    }`}
                                >
                                    {selectedFeedbackMessage.status === 'new' ? (
                                        <>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            <span>Mark as Resolved</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 4v6h6" />
                                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                            </svg>
                                            <span>Reopen as New</span>
                                        </>
                                    )}
                                </button>

                                <div className="flex items-center gap-2">
                                    <a
                                        href={`mailto:${selectedFeedbackMessage.email}?subject=${encodeURIComponent(`Re: [Support] ${selectedFeedbackMessage.subject}`)}`}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-mid)]"
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                        <span>Reply by Email</span>
                                    </a>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedFeedbackMessage(null)}
                                        className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {confirmDialog && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
                        onClick={() => {
                            if (!confirmSubmitting) setConfirmDialog(null)
                        }}
                    >
                        <div
                            className="relative w-full max-w-md rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-2xl animate-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start gap-3.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error)]">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-base font-black text-[var(--text-primary)]">
                                        {confirmDialog.title}
                                    </h3>
                                    <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                                        {confirmDialog.message}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-[var(--border-default)] pt-4">
                                <button
                                    type="button"
                                    disabled={confirmSubmitting}
                                    onClick={() => setConfirmDialog(null)}
                                    className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={confirmSubmitting}
                                    onClick={async () => {
                                        setConfirmSubmitting(true)
                                        try {
                                            await confirmDialog.onConfirm()
                                        } finally {
                                            setConfirmSubmitting(false)
                                            setConfirmDialog(null)
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--error)] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:opacity-90 disabled:opacity-50"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                    <span>{confirmSubmitting ? 'Deleting...' : confirmDialog.confirmLabel}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
