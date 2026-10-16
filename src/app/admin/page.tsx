'use client'

import { useState, useEffect, useTransition, useRef, useCallback, useSyncExternalStore } from 'react'
import {
    startAuthentication,
    startRegistration,
    browserSupportsWebAuthn,
} from '@simplewebauthn/browser'
import { formatNepalDateTime } from '@/lib/cronHelper'

import {
    AdminScraperData,
    SearchLog,
    SearchStats,
    NotificationLog,
    NotificationStatsData,
    FeedbackLog,
    FeedbackStatsData,
    TestimonialLog,
    TestimonialStatsData,
    AdminPasskey,
    ConfirmDialogState,
    ToastState,
} from './types'
import {
    INACTIVITY_TIMEOUT_MS,
    INACTIVITY_TRIGGER_MS,
    ACTIVITY_STORAGE_KEY,
    maskLicenseNumber,
    maskIpAddress,
} from './helpers'

// Feature-based subpages / components
import AdminNavbar from './navbar/page'
import AdminAnalytics from './analytics/page'
import AdminAutomation from './automation/page'
import AdminSearches from './searches/page'
import AdminNotifications from './notifications/page'
import AdminFeedback from './feedback/page'
import AdminTestimonials from './testimonials/page'
import AdminLogin from './login/page'
import AdminModals from './modals/page'

export default function AdminPage() {
    const [authLoading, setAuthLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isConfigured, setIsConfigured] = useState(true)
    const [passwordInput, setPasswordInput] = useState('')
    const [loginError, setLoginError] = useState('')
    const [loginSubmitting, setLoginSubmitting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [privacyMode, setPrivacyMode] = useState(true)

    // View Tabs: 'searches' | 'notifications' | 'feedback' | 'testimonials'
    const [activeTab, setActiveTab] = useState<'searches' | 'notifications' | 'feedback' | 'testimonials'>('searches')

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
    const [selectedSearchIds, setSelectedSearchIds] = useState<number[]>([])
    const [searchSelectMode, setSearchSelectMode] = useState(false)

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
    const [selectedNotifIds, setSelectedNotifIds] = useState<string[]>([])
    const [notifSelectMode, setNotifSelectMode] = useState(false)

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
    const [selectedFeedbackIds, setSelectedFeedbackIds] = useState<string[]>([])
    const [feedbackSelectMode, setFeedbackSelectMode] = useState(false)
    const [selectedFeedbackMessage, setSelectedFeedbackMessage] = useState<FeedbackLog | null>(null)

    // Dashboard State - Testimonials Moderation
    const [testimonialStats, setTestimonialStats] = useState<TestimonialStatsData | null>(null)
    const [testimonialLogs, setTestimonialLogs] = useState<TestimonialLog[]>([])
    const [testimonialTotal, setTestimonialTotal] = useState(0)
    const [testimonialPage, setTestimonialPage] = useState(1)
    const [testimonialLimit, setTestimonialLimit] = useState(50)
    const [testimonialTotalPages, setTestimonialTotalPages] = useState(1)
    const [testimonialSearchFilter, setTestimonialSearchFilter] = useState('')
    const [testimonialStatusFilter, setTestimonialStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
    const [testimonialLoading, setTestimonialLoading] = useState(false)
    const [selectedTestimonialIds, setSelectedTestimonialIds] = useState<string[]>([])
    const [testimonialSelectMode, setTestimonialSelectMode] = useState(false)

    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
    const [confirmSubmitting] = useState(false)
    const [toast, setToast] = useState<ToastState | null>(null)

    // Inactivity Auto-Logout State
    const [inactivityWarningOpen, setInactivityWarningOpen] = useState(false)
    const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState(60)
    const [inactivityNotice, setInactivityNotice] = useState<string | null>(null)
    const lastActivityRef = useRef<number>(0)
    const lastStorageWriteRef = useRef<number>(0)
    const warningOpenRef = useRef(false)

    useEffect(() => {
        warningOpenRef.current = inactivityWarningOpen
    }, [inactivityWarningOpen])

    // Passkey / WebAuthn State
    const passkeysSupported = useSyncExternalStore(
        () => () => {},
        () => browserSupportsWebAuthn(),
        () => false
    )
    const [passkeys, setPasskeys] = useState<AdminPasskey[]>([])
    const [passkeyCount, setPasskeyCount] = useState<number>(0)
    const [passkeyLoading, setPasskeyLoading] = useState(false)
    const [passkeyModalOpen, setPasskeyModalOpen] = useState(false)
    const [newPasskeyName, setNewPasskeyName] = useState('')
    const [registeringPasskey, setRegisteringPasskey] = useState(false)

    const [, startTransition] = useTransition()

    const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
        setToast({ message, type })
        setTimeout(() => {
            setToast((prev) => (prev?.message === message ? null : prev))
        }, 3200)
    }

    // 1. Check Auth Status on Load (with prior inactivity verification)
    useEffect(() => {
        let isMounted = true

        const verifySessionOnMount = async () => {
            try {
                // If previous session in storage has exceeded the 5-minute inactivity limit, force logout
                if (typeof window !== 'undefined') {
                    const storedActivity = localStorage.getItem(ACTIVITY_STORAGE_KEY)
                    if (storedActivity) {
                        const lastActive = Number(storedActivity)
                        if (!isNaN(lastActive) && Date.now() - lastActive >= INACTIVITY_TIMEOUT_MS) {
                            try {
                                await fetch('/api/admin/auth', { method: 'DELETE' })
                            } catch {
                                // ignore
                            }
                            localStorage.removeItem(ACTIVITY_STORAGE_KEY)
                            if (!isMounted) return
                            setIsConfigured(true)
                            setIsAuthenticated(false)
                            setInactivityNotice('You were automatically logged out due to 5 minutes of inactivity.')
                            setAuthLoading(false)
                            return
                        }
                    }
                }

                const res = await fetch('/api/admin/auth', { cache: 'no-store' })
                const data = await res.json()
                if (!isMounted) return
                setIsConfigured(data?.configured ?? true)
                const isAuth = Boolean(data?.authenticated)
                setIsAuthenticated(isAuth)
                if (isAuth) {
                    const now = Date.now()
                    lastActivityRef.current = now
                    if (typeof window !== 'undefined') {
                        try {
                            localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now))
                        } catch {
                            // ignore
                        }
                    }
                }
                setAuthLoading(false)
            } catch {
                if (!isMounted) return
                setIsAuthenticated(false)
                setAuthLoading(false)
            }
        }

        verifySessionOnMount()

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

    // 2d. Fetch Testimonials & Moderation Stats
    useEffect(() => {
        if (!isAuthenticated) return
        let cancelled = false

        const params = new URLSearchParams({
            page: String(testimonialPage),
            limit: String(testimonialLimit),
            search: testimonialSearchFilter,
            status: testimonialStatusFilter,
        })

        fetch(`/api/admin/testimonials?${params.toString()}`, { cache: 'no-store' })
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
                    setTestimonialLogs(json.data.testimonials || [])
                    setTestimonialTotal(json.data.total || 0)
                    setTestimonialTotalPages(json.data.totalPages || 1)
                    if (json.data.stats) {
                        setTestimonialStats(json.data.stats)
                    }
                }
                setTestimonialLoading(false)
            })
            .catch(() => {
                if (!cancelled) setTestimonialLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [isAuthenticated, testimonialPage, testimonialLimit, testimonialSearchFilter, testimonialStatusFilter, refreshKey])

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
        setTestimonialLoading(true)
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
                setInactivityNotice(null)
                setInactivityWarningOpen(false)
                const now = Date.now()
                lastActivityRef.current = now
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now))
                    } catch {
                        // ignore
                    }
                }
            } else {
                setLoginError(data.error || 'Incorrect password')
            }
        } catch {
            setLoginError('Unable to connect to the server.')
        } finally {
            setLoginSubmitting(false)
        }
    }

    // 4b. Fetch Enrolled Passkeys
    const fetchPasskeys = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/passkey', { cache: 'no-store' })
            const data = await res.json()
            if (data.status === 'success') {
                setPasskeyCount(data.count || 0)
                if (Array.isArray(data.passkeys)) {
                    setPasskeys(data.passkeys)
                }
            }
        } catch {
            // ignore
        }
    }, [])

    // Fetch passkeys count and list on mount and auth change
    useEffect(() => {
        let isCancelled = false

        fetch('/api/admin/passkey', { cache: 'no-store' })
            .then((res) => res.json())
            .then((data) => {
                if (isCancelled) return
                if (data.status === 'success') {
                    setPasskeyCount(data.count || 0)
                    if (Array.isArray(data.passkeys)) {
                        setPasskeys(data.passkeys)
                    }
                }
            })
            .catch(() => {
                // ignore
            })

        return () => {
            isCancelled = true
        }
    }, [isAuthenticated])

    // 4c. Passkey Sign-In
    const handlePasskeyLogin = async () => {
        setPasskeyLoading(true)
        setLoginError('')

        try {
            const optRes = await fetch('/api/admin/passkey/login-options', { cache: 'no-store' })
            const optData = await optRes.json()

            if (!optRes.ok || optData.status !== 'success' || !optData.options) {
                throw new Error(optData.error || 'Failed to initialize passkey sign-in')
            }

            const authResp = await startAuthentication({ optionsJSON: optData.options })

            const verifyRes = await fetch('/api/admin/passkey/login-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ response: authResp }),
            })

            const verifyData = await verifyRes.json()

            if (verifyRes.ok && verifyData.status === 'success') {
                setIsAuthenticated(true)
                setPasswordInput('')
                setInactivityNotice(null)
                setInactivityWarningOpen(false)
                const now = Date.now()
                lastActivityRef.current = now
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now))
                    } catch {
                        // ignore
                    }
                }
                showToast('Welcome back! Signed in with Passkey', 'info')
                fetchPasskeys()
            } else {
                throw new Error(verifyData.error || 'Passkey verification failed')
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Passkey login failed'
            if (!message.toLowerCase().includes('abort') && !message.toLowerCase().includes('cancel') && !message.toLowerCase().includes('not allowed')) {
                setLoginError(message)
            }
        } finally {
            setPasskeyLoading(false)
        }
    }

    // 4d. Register New Passkey (Biometrics / Security Key)
    const handleRegisterPasskey = async (e: React.FormEvent) => {
        e.preventDefault()
        if (registeringPasskey) return
        setRegisteringPasskey(true)

        try {
            const optRes = await fetch('/api/admin/passkey/register-options', { cache: 'no-store' })
            const optData = await optRes.json()

            if (!optRes.ok || optData.status !== 'success' || !optData.options) {
                throw new Error(optData.error || 'Failed to initialize registration')
            }

            const regResp = await startRegistration({ optionsJSON: optData.options })

            const verifyRes = await fetch('/api/admin/passkey/register-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response: regResp,
                    deviceName: newPasskeyName.trim() || 'Biometric Passkey',
                }),
            })

            const verifyData = await verifyRes.json()

            if (verifyRes.ok && verifyData.status === 'success') {
                setNewPasskeyName('')
                showToast('Passkey registered successfully!', 'success')
                await fetchPasskeys()
            } else {
                throw new Error(verifyData.error || 'Failed to save passkey')
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Registration failed'
            if (!message.toLowerCase().includes('abort') && !message.toLowerCase().includes('cancel') && !message.toLowerCase().includes('not allowed')) {
                showToast(message, 'info')
            }
        } finally {
            setRegisteringPasskey(false)
        }
    }

    // 4e. Delete Passkey
    const handleDeletePasskey = (passkey: AdminPasskey) => {
        setConfirmDialog({
            title: `Delete passkey "${passkey.device_name}"?`,
            message: 'You will no longer be able to sign in using this specific device or security key. (Master password will still work).',
            confirmLabel: 'Yes, Delete Passkey',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/admin/passkey?id=${encodeURIComponent(passkey.id)}`, {
                        method: 'DELETE',
                    })
                    if (res.ok) {
                        showToast('Passkey removed')
                        await fetchPasskeys()
                    } else {
                        const json = await res.json()
                        showToast(json.error || 'Failed to delete passkey', 'info')
                    }
                } catch {
                    showToast('Failed to delete passkey', 'info')
                }
            },
        })
    }

    // 5. Handle Logout
    const handleLogout = useCallback(async (reason?: 'inactivity') => {
        try {
            await fetch('/api/admin/auth', { method: 'DELETE' })
        } finally {
            if (typeof window !== 'undefined') {
                try {
                    localStorage.removeItem(ACTIVITY_STORAGE_KEY)
                } catch {
                    // ignore
                }
            }
            setInactivityWarningOpen(false)
            setIsAuthenticated(false)
            if (reason === 'inactivity') {
                setInactivityNotice('You were automatically logged out due to 5 minutes of inactivity.')
            }
            setLogs([])
            setStats(null)
            setScraperData(null)
            setNotificationLogs([])
            setNotificationStats(null)
            setFeedbackLogs([])
            setFeedbackStats(null)
        }
    }, [])

    // 5b. Record Activity & Reset Inactivity Timer
    const recordActivity = useCallback((forceStorageUpdate = false) => {
        const now = Date.now()
        lastActivityRef.current = now
        if (forceStorageUpdate || now - lastStorageWriteRef.current > 3000) {
            lastStorageWriteRef.current = now
            if (typeof window !== 'undefined') {
                try {
                    localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now))
                } catch {
                    // ignore
                }
            }
        }
    }, [])

    const stayLoggedIn = useCallback(() => {
        recordActivity(true)
        setInactivityWarningOpen(false)
        setInactivitySecondsLeft(60)
        showToast('Session kept active', 'info')
    }, [recordActivity])

    // Multi-tab activity synchronization
    useEffect(() => {
        if (!isAuthenticated) return

        const handleStorage = (e: StorageEvent) => {
            if (e.key === ACTIVITY_STORAGE_KEY && e.newValue) {
                const remoteTime = Number(e.newValue)
                if (!isNaN(remoteTime) && remoteTime > lastActivityRef.current) {
                    lastActivityRef.current = remoteTime
                    setInactivityWarningOpen(false)
                    setInactivitySecondsLeft(60)
                }
            }
        }

        window.addEventListener('storage', handleStorage)
        return () => window.removeEventListener('storage', handleStorage)
    }, [isAuthenticated])

    // Inactivity idle monitor: 5 minutes idle timeout with 60-second warning countdown
    useEffect(() => {
        if (!isAuthenticated) return

        const initialNow = Date.now()
        lastActivityRef.current = initialNow
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(ACTIVITY_STORAGE_KEY, String(initialNow))
            } catch {
                // ignore
            }
        }

        const checkInactivity = () => {
            let lastActivity = lastActivityRef.current
            if (typeof window !== 'undefined') {
                try {
                    const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY)
                    if (stored) {
                        const storedNum = Number(stored)
                        if (!isNaN(storedNum) && storedNum > lastActivity) {
                            lastActivity = storedNum
                            lastActivityRef.current = storedNum
                        }
                    }
                } catch {
                    // ignore
                }
            }

            const now = Date.now()
            const elapsed = now - lastActivity

            if (elapsed >= INACTIVITY_TIMEOUT_MS) {
                handleLogout('inactivity')
                return
            }

            if (elapsed >= INACTIVITY_TRIGGER_MS) {
                const remainingSecs = Math.max(1, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000))
                setInactivitySecondsLeft(remainingSecs)
                setInactivityWarningOpen(true)
            } else {
                setInactivityWarningOpen(false)
            }
        }

        const interval = setInterval(checkInactivity, 1000)

        const onUserActivity = () => {
            // Passively record activity only when the warning modal is not asking for confirmation
            if (!warningOpenRef.current) {
                recordActivity(false)
            }
        }

        const onVisibilityOrFocus = () => {
            checkInactivity()
        }

        const events: Array<keyof WindowEventMap> = [
            'mousemove',
            'mousedown',
            'keydown',
            'touchstart',
            'scroll',
        ]

        events.forEach((evt) => {
            window.addEventListener(evt, onUserActivity, { passive: true })
        })

        window.addEventListener('visibilitychange', onVisibilityOrFocus)
        window.addEventListener('focus', onVisibilityOrFocus)

        return () => {
            clearInterval(interval)
            events.forEach((evt) => {
                window.removeEventListener(evt, onUserActivity)
            })
            window.removeEventListener('visibilitychange', onVisibilityOrFocus)
            window.removeEventListener('focus', onVisibilityOrFocus)
        }
    }, [isAuthenticated, handleLogout, recordActivity])

    // 6. Copy Helper
    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard?.writeText(text)
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(null), 1800)
    }

    // 7. CSV Export (Respects Privacy Mode)
    const exportCsv = () => {
        if (!logs.length) return
        const headers = ['ID', 'Date (NPT)', 'Date (ISO)', 'License Number', 'Status', 'Holder Name', 'Office', 'Category', 'IP Address', 'Country', 'City', 'Region']
        const rows = logs.map((l) => [
            l.id,
            `"${formatNepalDateTime(l.created_at, 'en', true)}"`,
            new Date(l.created_at).toISOString(),
            `"${maskLicenseNumber(l.license_number, privacyMode)}"`,
            l.status,
            `"${l.holder_name || ''}"`,
            `"${l.office || ''}"`,
            `"${l.category || ''}"`,
            maskIpAddress(l.ip, privacyMode),
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
        showToast(
            privacyMode
                ? 'Exported search logs CSV (Privacy Masked)'
                : 'Exported search logs CSV (Full Data)',
            'info'
        )
    }

    // 8. Notification CSV Export (Respects Privacy Mode)
    const exportNotificationCsv = () => {
        if (!notificationLogs.length) return
        const headers = ['ID', 'Subscribed At (NPT)', 'Subscribed At (ISO)', 'License Number', 'User Email', 'Status', 'Delivered At (NPT)', 'Delivered At (ISO)', 'Holder Name', 'Issuing Office']
        const rows = notificationLogs.map((l) => [
            `"${l.id}"`,
            `"${formatNepalDateTime(l.created_at, 'en', true)}"`,
            new Date(l.created_at).toISOString(),
            `"${maskLicenseNumber(l.license_number, privacyMode)}"`,
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
        showToast(
            privacyMode
                ? 'Exported notification logs CSV (Privacy Masked)'
                : 'Exported notification logs CSV (Full Data)',
            'info'
        )
    }

    // 8b. Search Log Deletion Handlers (Single, Selected, Older Than X Days, All)
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
                        setSelectedSearchIds((prev) => prev.filter((x) => x !== id))
                        setTotal((prev) => Math.max(0, prev - 1))
                        setRefreshKey((k) => k + 1)
                        showToast('Search log deleted')
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    const handleDeleteSelectedSearchLogs = () => {
        if (!selectedSearchIds.length) return
        const count = selectedSearchIds.length
        setConfirmDialog({
            title: `Delete ${count} selected search log${count > 1 ? 's' : ''}?`,
            message: `Are you sure you want to permanently delete the ${count} selected search log${count > 1 ? 's' : ''}? This action cannot be undone.`,
            confirmLabel: `Yes, Delete (${count})`,
            onConfirm: async () => {
                try {
                    const idsParam = selectedSearchIds.join(',')
                    const res = await fetch(`/api/admin/logs?ids=${encodeURIComponent(idsParam)}`, {
                        method: 'DELETE',
                    })
                    if (res.ok) {
                        const idSet = new Set(selectedSearchIds)
                        setLogs((prev) => prev.filter((item) => !idSet.has(item.id)))
                        setSelectedSearchIds([])
                        setSearchSelectMode(false)
                        setRefreshKey((k) => k + 1)
                        showToast(`Deleted ${count} selected search log${count > 1 ? 's' : ''}`)
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    const handleDeleteSearchLogsOlderThan = (days: number) => {
        if (total === 0) return
        setConfirmDialog({
            title: `Delete logs older than ${days} days?`,
            message: `Are you sure you want to permanently delete all search logs older than ${days} days? Recent logs from the last ${days} days will be kept.`,
            confirmLabel: `Yes, Delete Older Than ${days}d`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/admin/logs?days=${days}`, { method: 'DELETE' })
                    if (res.ok) {
                        setSelectedSearchIds([])
                        setSearchSelectMode(false)
                        setPage(1)
                        setRefreshKey((k) => k + 1)
                        showToast(`Deleted search logs older than ${days} days`)
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
            requiredPhrase: 'delete all',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/logs', { method: 'DELETE' })
                    if (res.ok) {
                        setLogs([])
                        setSelectedSearchIds([])
                        setSearchSelectMode(false)
                        setTotal(0)
                        setPage(1)
                        setRefreshKey((k) => k + 1)
                        showToast('All search logs deleted')
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    // 9. Notification Deletion Handlers (Single, Selected, By Status, All)
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
                        setSelectedNotifIds((prev) => prev.filter((x) => x !== id))
                        setRefreshKey((k) => k + 1)
                        showToast('Notification entry deleted')
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    const handleDeleteSelectedNotifications = () => {
        if (!selectedNotifIds.length) return
        const count = selectedNotifIds.length
        setConfirmDialog({
            title: `Delete ${count} selected notification${count > 1 ? 's' : ''}?`,
            message: `Are you sure you want to permanently delete the ${count} selected notification subscription${count > 1 ? 's' : ''}? This action cannot be undone.`,
            confirmLabel: `Yes, Delete (${count})`,
            onConfirm: async () => {
                try {
                    const idsParam = selectedNotifIds.join(',')
                    const res = await fetch(`/api/admin/notifications?ids=${encodeURIComponent(idsParam)}`, {
                        method: 'DELETE',
                    })
                    if (res.ok) {
                        const idSet = new Set(selectedNotifIds)
                        setNotificationLogs((prev) => prev.filter((item) => !idSet.has(item.id)))
                        setSelectedNotifIds([])
                        setNotifSelectMode(false)
                        setRefreshKey((k) => k + 1)
                        showToast(`Deleted ${count} selected notification${count > 1 ? 's' : ''}`)
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    const handleDeleteNotificationsByStatus = (status: 'cancelled' | 'sent') => {
        const label = status === 'cancelled' ? 'cancelled' : 'delivered'
        setConfirmDialog({
            title: `Delete all ${label} notifications?`,
            message: `Are you sure you want to permanently delete all ${label} notification entries? Active pending subscriptions will not be affected.`,
            confirmLabel: `Yes, Delete ${status === 'cancelled' ? 'Cancelled' : 'Delivered'}`,
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/admin/notifications?status=${status}`, {
                        method: 'DELETE',
                    })
                    if (res.ok) {
                        setSelectedNotifIds([])
                        setNotifSelectMode(false)
                        setNotifPage(1)
                        setRefreshKey((k) => k + 1)
                        showToast(`Deleted all ${label} notifications`)
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    const handleDeleteAllNotifications = () => {
        if (!notificationLogs.length && notifTotal === 0) return
        const totalCount = notificationStats?.total ?? notifTotal
        setConfirmDialog({
            title: 'Are you sure you want to delete all notifications?',
            message: `This will permanently delete ALL ${totalCount.toLocaleString()} email notification subscriptions and logs. This action cannot be undone.`,
            confirmLabel: `Yes, Delete All (${totalCount.toLocaleString()})`,
            requiredPhrase: 'delete all',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/notifications?all=true', { method: 'DELETE' })
                    if (res.ok) {
                        setNotificationLogs([])
                        setSelectedNotifIds([])
                        setNotifSelectMode(false)
                        setNotifTotal(0)
                        setNotifPage(1)
                        setRefreshKey((k) => k + 1)
                        showToast('All notification logs deleted')
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    // 10. Feedback CSV Export (Respects Privacy Mode)
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
            `"${l.license_number ? maskLicenseNumber(l.license_number, privacyMode) : ''}"`,
            l.status,
            `"${l.ip ? maskIpAddress(l.ip, privacyMode) : ''}"`,
        ])
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nepal-license-feedback-logs-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        showToast(
            privacyMode
                ? 'Exported feedback CSV (Privacy Masked)'
                : 'Exported feedback CSV (Full Data)',
            'info'
        )
    }

    // 10b. Testimonials CSV Export
    const exportTestimonialsCsv = () => {
        if (!testimonialLogs.length) return
        const headers = ['ID', 'Submitted At (NPT)', 'Submitted At (ISO)', 'Name', 'Location', 'Rating', 'Message', 'Email', 'Status', 'Featured', 'IP']
        const rows = testimonialLogs.map((l) => [
            `"${l.id}"`,
            `"${formatNepalDateTime(l.created_at, 'en', true)}"`,
            new Date(l.created_at).toISOString(),
            `"${(l.name || '').replace(/"/g, '""')}"`,
            `"${(l.role || '').replace(/"/g, '""')}"`,
            l.rating,
            `"${(l.message || '').replace(/"/g, '""')}"`,
            `"${(l.email || '').replace(/"/g, '""')}"`,
            l.status,
            l.is_featured ? 'Yes' : 'No',
            `"${l.ip ? maskIpAddress(l.ip, privacyMode) : ''}"`,
        ])
        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nepal-license-testimonials-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        showToast(
            privacyMode
                ? 'Exported testimonials CSV (Privacy Masked)'
                : 'Exported testimonials CSV (Full Data)',
            'info'
        )
    }

    // 11. Toggle & Bulk Update Feedback Status
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
                showToast(`Feedback marked as ${nextStatus}`)
            }
        } catch {
            // Error
        }
    }

    const handleBulkFeedbackStatus = async (nextStatus: 'new' | 'resolved') => {
        if (!selectedFeedbackIds.length) return
        const count = selectedFeedbackIds.length
        try {
            const res = await fetch('/api/admin/feedback', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedFeedbackIds, status: nextStatus }),
            })
            if (res.ok) {
                const idSet = new Set(selectedFeedbackIds)
                setFeedbackLogs((prev) =>
                    prev.map((item) => (idSet.has(item.id) ? { ...item, status: nextStatus } : item))
                )
                setSelectedFeedbackIds([])
                setFeedbackSelectMode(false)
                setRefreshKey((k) => k + 1)
                showToast(`Marked ${count} feedback entr${count > 1 ? 'ies' : 'y'} as ${nextStatus}`)
            }
        } catch {
            // Error
        }
    }

    // 12. Delete Feedback Handlers (Single, Selected, Resolved, All)
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
                        setSelectedFeedbackIds((prev) => prev.filter((x) => x !== id))
                        if (selectedFeedbackMessage && selectedFeedbackMessage.id === id) {
                            setSelectedFeedbackMessage(null)
                        }
                        setRefreshKey((k) => k + 1)
                        showToast('Feedback entry deleted')
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    const handleDeleteSelectedFeedback = () => {
        if (!selectedFeedbackIds.length) return
        const count = selectedFeedbackIds.length
        setConfirmDialog({
            title: `Delete ${count} selected feedback entr${count > 1 ? 'ies' : 'y'}?`,
            message: `Are you sure you want to permanently delete the ${count} selected feedback entr${count > 1 ? 'ies' : 'y'}? This action cannot be undone.`,
            confirmLabel: `Yes, Delete (${count})`,
            onConfirm: async () => {
                try {
                    const idsParam = selectedFeedbackIds.join(',')
                    const res = await fetch(`/api/admin/feedback?ids=${encodeURIComponent(idsParam)}`, {
                        method: 'DELETE',
                    })
                    if (res.ok) {
                        const idSet = new Set(selectedFeedbackIds)
                        setFeedbackLogs((prev) => prev.filter((item) => !idSet.has(item.id)))
                        setSelectedFeedbackIds([])
                        setFeedbackSelectMode(false)
                        setRefreshKey((k) => k + 1)
                        showToast(`Deleted ${count} selected feedback entr${count > 1 ? 'ies' : 'y'}`)
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    const handleDeleteResolvedFeedback = () => {
        setConfirmDialog({
            title: 'Delete all resolved feedback?',
            message: 'Are you sure you want to permanently delete all resolved feedback inquiries? Unread/new inquiries will be kept.',
            confirmLabel: 'Yes, Delete Resolved',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/feedback?status=resolved', { method: 'DELETE' })
                    if (res.ok) {
                        setSelectedFeedbackIds([])
                        setFeedbackPage(1)
                        setRefreshKey((k) => k + 1)
                        showToast('Deleted all resolved feedback')
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    const handleDeleteAllFeedback = () => {
        if (!feedbackLogs.length && feedbackTotal === 0) return
        const totalCount = feedbackStats?.total ?? feedbackTotal
        setConfirmDialog({
            title: 'Are you sure you want to delete all feedback?',
            message: `This will permanently delete ALL ${totalCount.toLocaleString()} user feedback inquiries. This action cannot be undone.`,
            confirmLabel: `Yes, Delete All (${totalCount.toLocaleString()})`,
            requiredPhrase: 'delete all',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/feedback?all=true', { method: 'DELETE' })
                    if (res.ok) {
                        setFeedbackLogs([])
                        setSelectedFeedbackIds([])
                        setFeedbackTotal(0)
                        setFeedbackPage(1)
                        setRefreshKey((k) => k + 1)
                        showToast('All feedback inquiries deleted')
                    }
                } catch {
                    // Error
                }
            },
        })
    }

    // 13. Testimonials Moderation Handlers
    const handleUpdateTestimonialStatus = async (
        id: string,
        status: 'pending' | 'approved' | 'rejected',
        options?: { is_featured?: boolean; adminNotes?: string }
    ) => {
        try {
            const res = await fetch('/api/admin/testimonials', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status, is_featured: options?.is_featured, adminNotes: options?.adminNotes }),
            })
            if (res.ok) {
                setTestimonialLogs((prev) =>
                    prev.map((item) =>
                        item.id === id
                            ? {
                                  ...item,
                                  status,
                                  is_featured: typeof options?.is_featured === 'boolean' ? options.is_featured : item.is_featured,
                              }
                            : item
                    )
                )
                setRefreshKey((k) => k + 1)
                showToast(`Testimonial marked as ${status}`)
            } else {
                showToast('Failed to update testimonial status', 'error')
            }
        } catch {
            showToast('Network error while updating testimonial', 'error')
        }
    }

    const handleBulkTestimonialStatus = async (status: 'pending' | 'approved' | 'rejected') => {
        if (!selectedTestimonialIds.length) return
        const count = selectedTestimonialIds.length
        try {
            const res = await fetch('/api/admin/testimonials', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedTestimonialIds, status }),
            })
            if (res.ok) {
                const idSet = new Set(selectedTestimonialIds)
                setTestimonialLogs((prev) =>
                    prev.map((item) => (idSet.has(item.id) ? { ...item, status } : item))
                )
                setSelectedTestimonialIds([])
                setRefreshKey((k) => k + 1)
                showToast(`${count} testimonials marked as ${status}`)
            } else {
                showToast('Failed to bulk update testimonials', 'error')
            }
        } catch {
            showToast('Network error while bulk updating', 'error')
        }
    }

    const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
        const next = !currentFeatured
        try {
            const res = await fetch('/api/admin/testimonials', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_featured: next }),
            })
            if (res.ok) {
                setTestimonialLogs((prev) =>
                    prev.map((item) => (item.id === id ? { ...item, is_featured: next } : item))
                )
                showToast(next ? 'Testimonial marked as Featured ⭐' : 'Featured status removed')
            }
        } catch {
            showToast('Failed to toggle featured status', 'error')
        }
    }

    const handleDeleteTestimonial = (id: string, name: string) => {
        setConfirmDialog({
            title: 'Delete testimonial?',
            message: `Are you sure you want to delete feedback from "${name}"? This action cannot be undone.`,
            confirmLabel: 'Yes, Delete',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/admin/testimonials?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
                    if (res.ok) {
                        setTestimonialLogs((prev) => prev.filter((item) => item.id !== id))
                        setSelectedTestimonialIds((prev) => prev.filter((x) => x !== id))
                        setRefreshKey((k) => k + 1)
                        showToast('Testimonial deleted')
                    }
                } catch {
                    showToast('Failed to delete testimonial', 'error')
                }
            },
        })
    }

    const handleDeleteSelectedTestimonials = () => {
        if (!selectedTestimonialIds.length) return
        const count = selectedTestimonialIds.length
        setConfirmDialog({
            title: `Delete ${count} selected testimonials?`,
            message: `Are you sure you want to permanently delete ${count} selected testimonials? This action cannot be undone.`,
            confirmLabel: `Yes, Delete (${count})`,
            onConfirm: async () => {
                try {
                    const idsParam = selectedTestimonialIds.join(',')
                    const res = await fetch(`/api/admin/testimonials?ids=${encodeURIComponent(idsParam)}`, {
                        method: 'DELETE',
                    })
                    if (res.ok) {
                        const idSet = new Set(selectedTestimonialIds)
                        setTestimonialLogs((prev) => prev.filter((item) => !idSet.has(item.id)))
                        setSelectedTestimonialIds([])
                        setTestimonialSelectMode(false)
                        setRefreshKey((k) => k + 1)
                        showToast(`Deleted ${count} testimonials`)
                    }
                } catch {
                    showToast('Failed to delete selected testimonials', 'error')
                }
            },
        })
    }

    const handleDeleteRejectedTestimonials = () => {
        setConfirmDialog({
            title: 'Delete all rejected testimonials?',
            message: 'Are you sure you want to permanently delete all rejected testimonials? Approved and pending ones will remain safe.',
            confirmLabel: 'Yes, Delete Rejected',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/testimonials?status=rejected', { method: 'DELETE' })
                    if (res.ok) {
                        setSelectedTestimonialIds([])
                        setTestimonialPage(1)
                        setRefreshKey((k) => k + 1)
                        showToast('Deleted all rejected testimonials')
                    }
                } catch {
                    showToast('Failed to delete rejected testimonials', 'error')
                }
            },
        })
    }

    const handleDeleteAllTestimonials = () => {
        if (!testimonialLogs.length && testimonialTotal === 0) return
        const totalCount = testimonialStats?.total ?? testimonialTotal
        setConfirmDialog({
            title: 'Are you sure you want to delete all testimonials?',
            message: `This will permanently delete ALL ${totalCount.toLocaleString()} testimonials. This action cannot be undone.`,
            confirmLabel: `Yes, Delete All (${totalCount.toLocaleString()})`,
            requiredPhrase: 'delete all',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/testimonials?all=true', { method: 'DELETE' })
                    if (res.ok) {
                        setTestimonialLogs([])
                        setSelectedTestimonialIds([])
                        setTestimonialTotal(0)
                        setTestimonialPage(1)
                        setRefreshKey((k) => k + 1)
                        showToast('All testimonials deleted')
                    }
                } catch {
                    showToast('Failed to delete testimonials', 'error')
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
            <AdminLogin
                inactivityNotice={inactivityNotice}
                setInactivityNotice={setInactivityNotice}
                isConfigured={isConfigured}
                passkeysSupported={passkeysSupported}
                passkeyCount={passkeyCount}
                passkeyLoading={passkeyLoading}
                loginSubmitting={loginSubmitting}
                handlePasskeyLogin={handlePasskeyLogin}
                handleLogin={handleLogin}
                passwordInput={passwordInput}
                setPasswordInput={setPasswordInput}
                loginError={loginError}
                setLoginError={setLoginError}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
            />
        )
    }

    // ----------------------------------------------------
    // Authenticated Admin Dashboard
    // ----------------------------------------------------
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pb-16 text-[var(--text-primary)]">
            {/* Top Navigation Bar */}
            <AdminNavbar
                privacyMode={privacyMode}
                setPrivacyMode={setPrivacyMode}
                autoRefresh={autoRefresh}
                setAutoRefresh={setAutoRefresh}
                dataLoading={dataLoading}
                handleManualRefresh={handleManualRefresh}
                activeTab={activeTab}
                exportCsv={exportCsv}
                exportNotificationCsv={exportNotificationCsv}
                exportFeedbackCsv={exportFeedbackCsv}
                exportTestimonialsCsv={exportTestimonialsCsv}
                hasLogs={logs.length > 0}
                hasNotificationLogs={notificationLogs.length > 0}
                hasFeedbackLogs={feedbackLogs.length > 0}
                hasTestimonialLogs={testimonialLogs.length > 0}
                setPasskeyModalOpen={setPasskeyModalOpen}
                fetchPasskeys={fetchPasskeys}
                passkeyCount={passkeyCount}
                handleLogout={handleLogout}
                showToast={showToast}
            />

            <main className="mx-auto max-w-7xl px-3 sm:px-6 pt-4 sm:pt-6">
                {/* Analytics & KPI Overview */}
                <AdminAnalytics
                    stats={stats}
                    privacyMode={privacyMode}
                    setActiveTab={setActiveTab}
                    setSearchFilter={setSearchFilter}
                    setPage={setPage}
                />

                {/* DOTM Automation & Scraper Status Monitor */}
                <AdminAutomation scraperData={scraperData} />

                {/* View Mode Tab Switcher */}
                <div className="mt-5 sm:mt-6 flex flex-col gap-3 border-b border-[var(--border-default)] pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex w-full sm:w-auto overflow-x-auto no-scrollbar rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 shadow-xs">
                        <button
                            type="button"
                            onClick={() => setActiveTab('searches')}
                            className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                                activeTab === 'searches'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <span className="hidden sm:inline">Search Queries</span>
                            <span className="sm:hidden">Searches</span>
                            <span className={`rounded-full px-1.5 sm:px-2 py-0.5 font-mono text-[10px] ${
                                activeTab === 'searches' ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                            }`}>
                                {total.toLocaleString()}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('notifications')}
                            className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                                activeTab === 'notifications'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                            <span className="hidden sm:inline">Email Notifications</span>
                            <span className="sm:hidden">Notifications</span>
                            <span className={`rounded-full px-1.5 sm:px-2 py-0.5 font-mono text-[10px] ${
                                activeTab === 'notifications' ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                            }`}>
                                {notifTotal.toLocaleString()}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('feedback')}
                            className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                                activeTab === 'feedback'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span className="hidden sm:inline">Feedback & Support</span>
                            <span className="sm:hidden">Feedback</span>
                            <span className={`rounded-full px-1.5 sm:px-2 py-0.5 font-mono text-[10px] ${
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

                        <button
                            type="button"
                            onClick={() => setActiveTab('testimonials')}
                            className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                                activeTab === 'testimonials'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="hidden sm:inline">Testimonials</span>
                            <span className="sm:hidden">Testimonials</span>
                            <span className={`rounded-full px-1.5 sm:px-2 py-0.5 font-mono text-[10px] ${
                                activeTab === 'testimonials' ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                            }`}>
                                {testimonialTotal.toLocaleString()}
                            </span>
                            {testimonialStats && testimonialStats.pendingCount > 0 && (
                                <span className="inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white animate-pulse" title={`${testimonialStats.pendingCount} testimonials waiting for approval`}>
                                    {testimonialStats.pendingCount} pending
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

                    {activeTab === 'testimonials' && testimonialStats && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="font-medium">Pending Review:</span>
                                <strong className="font-bold">{testimonialStats.pendingCount}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                                <span className="font-medium">Live on Site:</span>
                                <strong className="font-bold">{testimonialStats.approvedCount}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1">
                                <span className="text-amber-500">⭐</span>
                                <span className="font-medium text-[var(--text-secondary)]">Avg Rating:</span>
                                <strong className="font-bold text-[var(--text-primary)]">{testimonialStats.averageRating} / 5</strong>
                            </span>
                        </div>
                    )}
                </div>

                {/* Tab Views */}
                {activeTab === 'searches' ? (
                    <AdminSearches
                        logs={logs}
                        total={total}
                        page={page}
                        limit={limit}
                        totalPages={totalPages}
                        searchFilter={searchFilter}
                        statusFilter={statusFilter}
                        dataLoading={dataLoading}
                        lastUpdated={lastUpdated}
                        privacyMode={privacyMode}
                        searchSelectMode={searchSelectMode}
                        selectedSearchIds={selectedSearchIds}
                        copiedKey={copiedKey}
                        setPage={setPage}
                        setLimit={setLimit}
                        setSearchFilter={setSearchFilter}
                        setStatusFilter={setStatusFilter}
                        setSearchSelectMode={setSearchSelectMode}
                        setSelectedSearchIds={setSelectedSearchIds}
                        copyToClipboard={copyToClipboard}
                        handleDeleteSearchLog={handleDeleteSearchLog}
                        handleDeleteSelectedSearchLogs={handleDeleteSelectedSearchLogs}
                        handleDeleteSearchLogsOlderThan={handleDeleteSearchLogsOlderThan}
                        handleDeleteAllSearchLogs={handleDeleteAllSearchLogs}
                        startTransition={startTransition}
                    />
                ) : activeTab === 'notifications' ? (
                    <AdminNotifications
                        notificationLogs={notificationLogs}
                        notificationStats={notificationStats}
                        notifTotal={notifTotal}
                        notifPage={notifPage}
                        notifLimit={notifLimit}
                        notifTotalPages={notifTotalPages}
                        notifSearchFilter={notifSearchFilter}
                        notifStatusFilter={notifStatusFilter}
                        notifLoading={notifLoading}
                        privacyMode={privacyMode}
                        notifSelectMode={notifSelectMode}
                        selectedNotifIds={selectedNotifIds}
                        copiedKey={copiedKey}
                        setNotifPage={setNotifPage}
                        setNotifLimit={setNotifLimit}
                        setNotifSearchFilter={setNotifSearchFilter}
                        setNotifStatusFilter={setNotifStatusFilter}
                        setNotifSelectMode={setNotifSelectMode}
                        setSelectedNotifIds={setSelectedNotifIds}
                        copyToClipboard={copyToClipboard}
                        handleDeleteNotification={handleDeleteNotification}
                        handleDeleteSelectedNotifications={handleDeleteSelectedNotifications}
                        handleDeleteNotificationsByStatus={handleDeleteNotificationsByStatus}
                        handleDeleteAllNotifications={handleDeleteAllNotifications}
                        startTransition={startTransition}
                    />
                ) : activeTab === 'feedback' ? (
                    <AdminFeedback
                        feedbackLogs={feedbackLogs}
                        feedbackStats={feedbackStats}
                        feedbackTotal={feedbackTotal}
                        feedbackPage={feedbackPage}
                        feedbackLimit={feedbackLimit}
                        feedbackTotalPages={feedbackTotalPages}
                        feedbackSearchFilter={feedbackSearchFilter}
                        feedbackStatusFilter={feedbackStatusFilter}
                        feedbackCategoryFilter={feedbackCategoryFilter}
                        feedbackLoading={feedbackLoading}
                        privacyMode={privacyMode}
                        feedbackSelectMode={feedbackSelectMode}
                        selectedFeedbackIds={selectedFeedbackIds}
                        copiedKey={copiedKey}
                        setFeedbackPage={setFeedbackPage}
                        setFeedbackLimit={setFeedbackLimit}
                        setFeedbackSearchFilter={setFeedbackSearchFilter}
                        setFeedbackStatusFilter={setFeedbackStatusFilter}
                        setFeedbackCategoryFilter={setFeedbackCategoryFilter}
                        setFeedbackSelectMode={setFeedbackSelectMode}
                        setSelectedFeedbackIds={setSelectedFeedbackIds}
                        setSelectedFeedbackMessage={setSelectedFeedbackMessage}
                        copyToClipboard={copyToClipboard}
                        handleToggleFeedbackStatus={handleToggleFeedbackStatus}
                        handleBulkFeedbackStatus={handleBulkFeedbackStatus}
                        handleDeleteFeedback={handleDeleteFeedback}
                        handleDeleteSelectedFeedback={handleDeleteSelectedFeedback}
                        handleDeleteResolvedFeedback={handleDeleteResolvedFeedback}
                        handleDeleteAllFeedback={handleDeleteAllFeedback}
                        startTransition={startTransition}
                    />
                ) : (
                    <AdminTestimonials
                        testimonialLogs={testimonialLogs}
                        testimonialStats={testimonialStats}
                        testimonialTotal={testimonialTotal}
                        testimonialPage={testimonialPage}
                        testimonialLimit={testimonialLimit}
                        testimonialTotalPages={testimonialTotalPages}
                        testimonialSearchFilter={testimonialSearchFilter}
                        testimonialStatusFilter={testimonialStatusFilter}
                        testimonialLoading={testimonialLoading}
                        privacyMode={privacyMode}
                        testimonialSelectMode={testimonialSelectMode}
                        selectedTestimonialIds={selectedTestimonialIds}
                        copiedKey={copiedKey}
                        setTestimonialPage={setTestimonialPage}
                        setTestimonialLimit={setTestimonialLimit}
                        setTestimonialSearchFilter={setTestimonialSearchFilter}
                        setTestimonialStatusFilter={setTestimonialStatusFilter}
                        setTestimonialSelectMode={setTestimonialSelectMode}
                        setSelectedTestimonialIds={setSelectedTestimonialIds}
                        copyToClipboard={copyToClipboard}
                        handleUpdateTestimonialStatus={handleUpdateTestimonialStatus}
                        handleBulkTestimonialStatus={handleBulkTestimonialStatus}
                        handleToggleFeatured={handleToggleFeatured}
                        handleDeleteTestimonial={handleDeleteTestimonial}
                        handleDeleteSelectedTestimonials={handleDeleteSelectedTestimonials}
                        handleDeleteRejectedTestimonials={handleDeleteRejectedTestimonials}
                        handleDeleteAllTestimonials={handleDeleteAllTestimonials}
                        exportTestimonialsCsv={exportTestimonialsCsv}
                        startTransition={startTransition}
                    />
                )}

                {/* Modals & Dialogs (Detail Message, Passkeys, Confirm Delete, Inactivity Warning, Toast) */}
                <AdminModals
                    selectedFeedbackMessage={selectedFeedbackMessage}
                    setSelectedFeedbackMessage={setSelectedFeedbackMessage}
                    handleToggleFeedbackStatus={handleToggleFeedbackStatus}
                    privacyMode={privacyMode}
                    passkeyModalOpen={passkeyModalOpen}
                    setPasskeyModalOpen={setPasskeyModalOpen}
                    newPasskeyName={newPasskeyName}
                    setNewPasskeyName={setNewPasskeyName}
                    registeringPasskey={registeringPasskey}
                    handleRegisterPasskey={handleRegisterPasskey}
                    passkeys={passkeys}
                    fetchPasskeys={fetchPasskeys}
                    handleDeletePasskey={handleDeletePasskey}
                    confirmDialog={confirmDialog}
                    setConfirmDialog={setConfirmDialog}
                    confirmSubmitting={confirmSubmitting}
                    inactivityWarningOpen={inactivityWarningOpen}
                    inactivitySecondsLeft={inactivitySecondsLeft}
                    handleLogout={handleLogout}
                    stayLoggedIn={stayLoggedIn}
                    toast={toast}
                    setToast={setToast}
                />
            </main>
        </div>
    )
}
