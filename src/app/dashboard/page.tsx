// src/app/dashboard/page.tsx
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { UserProfile, UserSavedLicense } from '@/lib/userAuth'
import type { FeedbackItem } from '@/lib/feedback'
import { FEEDBACK_CATEGORIES } from '@/lib/feedback'

// Helper to convert Nepali numerals to English numerals
function nepaliToEnglishDigits(str: string): string {
    const map: Record<string, string> = {
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
        '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
    }
    return str.replace(/[०-९]/g, (char) => map[char] || char)
}

// Auto format license number (XX-XX-XXXXXXXX)
function formatLicenseInput(input: string): string {
    const cleaned = nepaliToEnglishDigits(input).replace(/[^0-9]/g, '').slice(0, 12)
    if (cleaned.length <= 2) return cleaned
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`
}

export default function UserDashboardPage() {
    const router = useRouter()
    const [loadingUser, setLoadingUser] = useState(true)
    const [user, setUser] = useState<UserProfile | null>(null)
    const [language, setLanguage] = useState<'en' | 'ne'>('en')

    // Active Tab: 'licenses' | 'support' | 'security'
    const [activeTab, setActiveTab] = useState<'licenses' | 'support' | 'security'>('licenses')

    // Licenses State
    const [licenses, setLicenses] = useState<UserSavedLicense[]>([])
    const [loadingLicenses, setLoadingLicenses] = useState(false)
    const [refreshingLicenseId, setRefreshingLicenseId] = useState<string | null>(null)
    const [refreshingAll, setRefreshingAll] = useState(false)
    const [copiedLicenseId, setCopiedLicenseId] = useState<string | null>(null)

    // License Filter & Search
    const [licenseFilter, setLicenseFilter] = useState<'all' | 'ready' | 'pending'>('all')
    const [licenseSearch, setLicenseSearch] = useState('')

    // Delete License Confirmation Modal
    const [deleteTarget, setDeleteTarget] = useState<UserSavedLicense | null>(null)
    const [deletingLicense, setDeletingLicense] = useState(false)

    // Unsubscribe from Alerts Confirmation Modal
    const [unsubscribeTarget, setUnsubscribeTarget] = useState<UserSavedLicense | null>(null)
    const [togglingNotification, setTogglingNotification] = useState(false)

    // Global Toast Feedback State
    const [toast, setToast] = useState<{
        type: 'success' | 'error' | 'info'
        message: string
    } | null>(null)

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ type, message })
    }, [])

    useEffect(() => {
        if (!toast) return
        const timer = setTimeout(() => setToast(null), 3500)
        return () => clearTimeout(timer)
    }, [toast])

    // Add License Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [newLabel, setNewLabel] = useState('Mine')
    const [newNumber, setNewNumber] = useState('')
    const [newNotify, setNewNotify] = useState(true)
    const [addingLicense, setAddingLicense] = useState(false)
    const [addModalError, setAddModalError] = useState<string | null>(null)

    // Support State
    const [tickets, setTickets] = useState<FeedbackItem[]>([])
    const [loadingTickets, setLoadingTickets] = useState(false)
    const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false)
    const [ticketCategory, setTicketCategory] = useState(FEEDBACK_CATEGORIES[0]?.id || 'license_not_found')
    const [ticketSubject, setTicketSubject] = useState('')
    const [ticketMessage, setTicketMessage] = useState('')
    const [ticketLicense, setTicketLicense] = useState('')
    const [submittingTicket, setSubmittingTicket] = useState(false)
    const [ticketModalError, setTicketModalError] = useState<string | null>(null)
    const [ticketModalSuccess, setTicketModalSuccess] = useState<string | null>(null)

    // Security & Password State
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [savingPassword, setSavingPassword] = useState(false)
    const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

    // Keyboard Escape listener to dismiss any active modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (deleteTarget && !deletingLicense) setDeleteTarget(null)
                if (unsubscribeTarget && !togglingNotification) setUnsubscribeTarget(null)
                if (isAddModalOpen && !addingLicense) setIsAddModalOpen(false)
                if (isNewTicketModalOpen && !submittingTicket) setIsNewTicketModalOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [deleteTarget, deletingLicense, unsubscribeTarget, togglingNotification, isAddModalOpen, addingLicense, isNewTicketModalOpen, submittingTicket])

    // Body scroll lock when any modal is open
    useEffect(() => {
        const isModalOpen = Boolean(deleteTarget || unsubscribeTarget || isAddModalOpen || isNewTicketModalOpen)
        if (typeof document !== 'undefined') {
            document.body.style.overflow = isModalOpen ? 'hidden' : ''
        }
        return () => {
            if (typeof document !== 'undefined') {
                document.body.style.overflow = ''
            }
        }
    }, [deleteTarget, unsubscribeTarget, isAddModalOpen, isNewTicketModalOpen])

    // Detect language from URL or local storage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlLang = new URLSearchParams(window.location.search).get('lang')
            const saved = localStorage.getItem('nlc_language')
            const targetLang = (urlLang === 'ne' || urlLang === 'en')
                ? urlLang
                : (saved === 'ne' || saved === 'en' ? saved : null)

            queueMicrotask(() => {
                if (targetLang) setLanguage(targetLang)
            })
        }
    }, [])

    // Load Authenticated User
    const fetchUser = useCallback(async () => {
        try {
            const res = await fetch('/api/user/auth/me')
            const data = await res.json()
            if (res.ok && data?.authenticated && data?.user) {
                setUser(data.user)
            } else {
                router.replace('/login')
            }
        } catch {
            router.replace('/login')
        } finally {
            setLoadingUser(false)
        }
    }, [router])

    // Load User Licenses
    const fetchLicenses = useCallback(async () => {
        queueMicrotask(() => setLoadingLicenses(true))
        try {
            const res = await fetch('/api/user/licenses')
            const data = await res.json()
            if (res.ok && Array.isArray(data?.licenses)) {
                setLicenses(data.licenses)
            }
        } catch (err) {
            console.error('Failed to load licenses:', err)
        } finally {
            setLoadingLicenses(false)
        }
    }, [])

    // Load User Support Tickets
    const fetchTickets = useCallback(async () => {
        queueMicrotask(() => setLoadingTickets(true))
        try {
            const res = await fetch('/api/user/support')
            const data = await res.json()
            if (res.ok && Array.isArray(data?.tickets)) {
                setTickets(data.tickets)
            }
        } catch (err) {
            console.error('Failed to load tickets:', err)
        } finally {
            setLoadingTickets(false)
        }
    }, [])

    useEffect(() => {
        queueMicrotask(() => {
            fetchUser()
        })
    }, [fetchUser])

    useEffect(() => {
        if (user) {
            queueMicrotask(() => {
                fetchLicenses()
                fetchTickets()
            })
        }
    }, [user, fetchLicenses, fetchTickets])

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsAddModalOpen(false)
                setIsNewTicketModalOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Handle Logout
    const handleLogout = async () => {
        try {
            await fetch('/api/user/auth/logout', { method: 'POST' })
        } finally {
            router.replace('/')
        }
    }

    // Refresh single license status
    const handleRefreshStatus = async (item: UserSavedLicense) => {
        setRefreshingLicenseId(item.id)
        try {
            const res = await fetch(`/api/license?number=${encodeURIComponent(item.license_number)}&source=dashboard`)
            const data = await res.json()
            if (res.ok && data?.status === 'success' && data?.data) {
                setLicenses((prev) =>
                    prev.map((lic) =>
                        lic.id === item.id
                            ? {
                                  ...lic,
                                  status: 'ready',
                                  holder_name: data.data.holder_name,
                                  office: data.data.office,
                                  category: data.data.category,
                              }
                            : lic
                    )
                )
                showToast(
                    language === 'ne'
                        ? `#${item.license_number} को स्थिति अद्यावधिक गरियो।`
                        : `Status updated for #${item.license_number}`,
                    'success'
                )
            } else {
                setLicenses((prev) =>
                    prev.map((lic) => (lic.id === item.id ? { ...lic, status: 'not_printed' } : lic))
                )
            }
        } catch (err) {
            console.error('Error refreshing license:', err)
            showToast(
                language === 'ne' ? 'स्थिति जाँच गर्न असफल भयो।' : 'Failed to refresh status.',
                'error'
            )
        } finally {
            setRefreshingLicenseId(null)
        }
    }

    // Refresh all licenses in batch
    const handleRefreshAll = async () => {
        if (licenses.length === 0 || refreshingAll) return
        setRefreshingAll(true)
        try {
            await Promise.all(licenses.map((lic) => handleRefreshStatus(lic)))
            showToast(
                language === 'ne' ? 'सबै लाइसेन्स स्थिति अद्यावधिक गरियो।' : 'All licenses refreshed successfully.',
                'success'
            )
        } finally {
            setRefreshingAll(false)
        }
    }

    // Copy license number to clipboard
    const handleCopyNumber = (item: UserSavedLicense) => {
        navigator.clipboard.writeText(item.license_number)
        setCopiedLicenseId(item.id)
        showToast(
            language === 'ne' ? 'लाइसेन्स नम्बर कपी गरियो!' : 'License number copied to clipboard!',
            'success'
        )
        setTimeout(() => setCopiedLicenseId(null), 2000)
    }

    // Confirm and Delete single license from vault (Proper Modal Handler)
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        const target = deleteTarget
        setDeletingLicense(true)

        try {
            const res = await fetch(`/api/user/licenses?id=${encodeURIComponent(target.id)}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                setLicenses((prev) => prev.filter((l) => l.id !== target.id))
                showToast(
                    language === 'ne'
                        ? `लाइसेन्स #${target.license_number} भल्टबाट हटाइयो।`
                        : `License #${target.license_number} removed from vault.`,
                    'info'
                )
                setDeleteTarget(null)
            } else {
                showToast(
                    language === 'ne' ? 'लाइसेन्स हटाउन असफल भयो।' : 'Failed to remove license.',
                    'error'
                )
            }
        } catch (err) {
            console.error('Failed to delete license:', err)
            showToast(
                language === 'ne' ? 'प्राविधिक समस्या भयो।' : 'Network error occurred.',
                'error'
            )
        } finally {
            setDeletingLicense(false)
        }
    }

    // Handle click on the card's alert subscription switch
    const handleAlertClick = (item: UserSavedLicense) => {
        if (item.notify_email) {
            // Currently subscribed: open Unsubscribe confirmation modal
            setUnsubscribeTarget(item)
        } else {
            // Currently unsubscribed: subscribe & send welcome email
            handleSubscribe(item)
        }
    }

    // Subscribe to automated email alerts for a license
    const handleSubscribe = async (item: UserSavedLicense) => {
        setTogglingNotification(true)
        // Optimistic UI update
        setLicenses((prev) =>
            prev.map((l) => (l.id === item.id ? { ...l, notify_email: true } : l))
        )
        try {
            const res = await fetch('/api/user/licenses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, notify_email: true }),
            })
            const data = await res.json()
            if (res.ok) {
                showToast(
                    language === 'ne'
                        ? 'इमेल अलर्ट सक्रिय भयो! स्वागत इमेल पठाइएको छ।'
                        : 'Subscribed to alerts! Welcome confirmation email sent.',
                    'success'
                )
            } else {
                setLicenses((prev) =>
                    prev.map((l) => (l.id === item.id ? { ...l, notify_email: false } : l))
                )
                showToast(data.error || 'Failed to subscribe.', 'error')
            }
        } catch (err) {
            console.error('Failed to subscribe to alerts:', err)
            setLicenses((prev) =>
                prev.map((l) => (l.id === item.id ? { ...l, notify_email: false } : l))
            )
            showToast(language === 'ne' ? 'प्राविधिक समस्या भयो।' : 'Network error.', 'error')
        } finally {
            setTogglingNotification(false)
        }
    }

    // Confirm and Unsubscribe from alerts (from confirmation modal)
    const handleConfirmUnsubscribe = async () => {
        if (!unsubscribeTarget) return
        const target = unsubscribeTarget
        setTogglingNotification(true)

        try {
            const res = await fetch('/api/user/licenses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: target.id, notify_email: false }),
            })
            const data = await res.json()
            if (res.ok) {
                setLicenses((prev) =>
                    prev.map((l) => (l.id === target.id ? { ...l, notify_email: false } : l))
                )
                showToast(
                    language === 'ne'
                        ? `लाइसेन्स #${target.license_number} का लागि इमेल अलर्ट बन्द (Unsubscribed) गरियो।`
                        : `Unsubscribed from email alerts for #${target.license_number}`,
                    'info'
                )
                setUnsubscribeTarget(null)
            } else {
                showToast(data.error || 'Failed to unsubscribe.', 'error')
            }
        } catch (err) {
            console.error('Failed to unsubscribe:', err)
            showToast(language === 'ne' ? 'प्राविधिक समस्या भयो।' : 'Network error.', 'error')
        } finally {
            setTogglingNotification(false)
        }
    }

    // Handle Add License Submission
    const handleAddLicense = async (e: React.FormEvent) => {
        e.preventDefault()
        setAddModalError(null)

        const formatted = formatLicenseInput(newNumber)
        if (!/^\d{2}-\d{2}-\d{8}$/.test(formatted)) {
            setAddModalError(
                language === 'ne'
                    ? 'कृपया सही ढाँचामा लाइसेन्स नम्बर लेख्नुहोस् (उदा: ०१-०६-१२३४५६७८)'
                    : 'Please enter a valid format XX-XX-XXXXXXXX (e.g. 01-06-12345678)'
            )
            return
        }

        setAddingLicense(true)
        try {
            const res = await fetch('/api/user/licenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    label: newLabel.trim() || 'My License',
                    license_number: formatted,
                    notify_email: newNotify,
                }),
            })
            const data = await res.json()

            if (!res.ok) {
                setAddModalError(data.error || 'Failed to save license.')
            } else {
                setLicenses((prev) => [data.license, ...prev])
                setIsAddModalOpen(false)
                setNewNumber('')
                setNewLabel('Mine')
                showToast(
                    language === 'ne'
                        ? 'लाइसेन्स सफलतापूर्वक भल्टमा थपियो!'
                        : 'License added to vault successfully!',
                    'success'
                )
            }
        } catch {
            setAddModalError('Server error while saving.')
        } finally {
            setAddingLicense(false)
        }
    }

    // Handle Submit Support Ticket
    const handleSubmitTicket = async (e: React.FormEvent) => {
        e.preventDefault()
        setTicketModalError(null)
        setTicketModalSuccess(null)

        if (!ticketMessage.trim() || ticketMessage.trim().length < 5) {
            setTicketModalError(
                language === 'ne'
                    ? 'कृपया सन्देश कम्तिमा ५ अक्षरको लेख्नुहोस्।'
                    : 'Please enter a message of at least 5 characters.'
            )
            return
        }

        setSubmittingTicket(true)
        try {
            const res = await fetch('/api/user/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: ticketCategory,
                    subject: ticketSubject.trim() || 'User Inquiry',
                    message: ticketMessage.trim(),
                    licenseNumber: ticketLicense.trim() || undefined,
                }),
            })
            const data = await res.json()

            if (!res.ok) {
                setTicketModalError(data.error || 'Failed to submit.')
            } else {
                const successMsg = language === 'ne' ? 'उजुरी/सोधपुछ सफलतापूर्वक पठाइयो!' : 'Inquiry submitted successfully!'
                setTicketModalSuccess(successMsg)
                showToast(successMsg, 'success')
                setTicketMessage('')
                setTicketSubject('')
                setTicketLicense('')
                fetchTickets()
                setTimeout(() => {
                    setIsNewTicketModalOpen(false)
                    setTicketModalSuccess(null)
                }, 1000)
            }
        } catch {
            setTicketModalError('Network error.')
        } finally {
            setSubmittingTicket(false)
        }
    }

    // Handle Password Change / Set
    const handleSavePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordFeedback(null)

        if (!newPassword || newPassword.length < 6) {
            setPasswordFeedback({
                type: 'error',
                message: language === 'ne' ? 'पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ।' : 'Password must be at least 6 characters.',
            })
            return
        }

        if (newPassword !== confirmPassword) {
            setPasswordFeedback({
                type: 'error',
                message: language === 'ne' ? 'पासवर्डहरू मिलेनन्।' : 'Passwords do not match.',
            })
            return
        }

        setSavingPassword(true)
        try {
            const res = await fetch('/api/user/auth/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    newPassword,
                    currentPassword: user?.has_password ? currentPassword : undefined,
                }),
            })
            const data = await res.json()

            if (!res.ok) {
                setPasswordFeedback({
                    type: 'error',
                    message: data.error || (language === 'ne' ? 'पासवर्ड सुरक्षित गर्न सकिएन।' : 'Failed to update password.'),
                })
            } else {
                const passMsg = language === 'ne' ? 'पासवर्ड सफलतापूर्वक सुरक्षित भयो!' : 'Password updated successfully!'
                setPasswordFeedback({
                    type: 'success',
                    message: passMsg,
                })
                showToast(passMsg, 'success')
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                fetchUser()
            }
        } catch {
            setPasswordFeedback({
                type: 'error',
                message: language === 'ne' ? 'सर्भर समस्या।' : 'Server error.',
            })
        } finally {
            setSavingPassword(false)
        }
    }

    // Filtered Licenses
    const filteredLicenses = useMemo(() => {
        return licenses.filter((item) => {
            const matchesFilter =
                licenseFilter === 'all'
                    ? true
                    : licenseFilter === 'ready'
                    ? item.status === 'ready'
                    : item.status !== 'ready'

            if (!matchesFilter) return false

            if (!licenseSearch.trim()) return true
            const query = licenseSearch.toLowerCase().trim()
            return (
                item.license_number.toLowerCase().includes(query) ||
                item.label.toLowerCase().includes(query) ||
                (item.holder_name && item.holder_name.toLowerCase().includes(query)) ||
                (item.office && item.office.toLowerCase().includes(query)) ||
                (item.category && item.category.toLowerCase().includes(query))
            )
        })
    }, [licenses, licenseFilter, licenseSearch])

    if (loadingUser) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--nepal-blue)] border-t-transparent" />
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        {language === 'ne' ? 'लोड हुँदैछ...' : 'Loading citizen portal...'}
                    </span>
                </div>
            </main>
        )
    }

    if (!user) return null

    const isNe = language === 'ne'
    const readyCount = licenses.filter((l) => l.status === 'ready').length
    const pendingCount = licenses.filter((l) => l.status !== 'ready').length

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors pb-20 selection:bg-[var(--nepal-blue)]/20">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-30 border-b border-[var(--border-default)] bg-[var(--surface-primary)]/85 backdrop-blur-xl transition-all">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2.5 group">
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-primary)] p-1.5 border border-[var(--border-default)] shadow-xs transition-transform group-hover:scale-105">
                                <Image
                                    src="/License-Checker-Nepal-logo.png"
                                    alt="Nepal License Checker"
                                    width={32}
                                    height={32}
                                    className="rounded-lg object-contain"
                                    priority
                                />
                            </div>
                            <div>
                                <span className="text-xs sm:text-sm font-extrabold tracking-tight text-[var(--text-primary)] block leading-tight">
                                    Nepal License Checker
                                </span>
                                <span className="text-[10px] font-semibold text-[var(--nepal-blue)] block">
                                    {isNe ? 'नागरिक भल्ट पोर्टल' : 'Citizen Family Vault'}
                                </span>
                            </div>
                        </Link>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Language Switch */}
                        <div className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5 text-xs shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setLanguage('en')}
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                                    language === 'en' ? 'bg-[var(--nepal-blue)] text-white shadow-2xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                EN
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguage('ne')}
                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
                                    language === 'ne' ? 'bg-[var(--nepal-blue)] text-white shadow-2xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                नेपाली
                            </button>
                        </div>

                        {/* Sign Out */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition shadow-2xs cursor-pointer"
                            title={isNe ? 'खाताबाट बाहिरिनुहोस्' : 'Sign Out'}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            <span className="hidden min-[380px]:inline">{isNe ? 'बाहिरिनुहोस्' : 'Sign Out'}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Container */}
            <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8 space-y-6 sm:space-y-7">
                {/* Hero Greeting & Stats Banner */}
                <div className="relative rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--nepal-blue)]/10 via-[var(--surface-primary)] to-[var(--bg-secondary)]/40 p-5 sm:p-7 shadow-xl overflow-hidden">
                    {/* Background subtle watermark icon */}
                    <div className="pointer-events-none absolute -right-6 -bottom-6 text-[var(--nepal-blue)]/5 dark:text-[var(--nepal-blue)]/10">
                        <svg width="180" height="180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <rect x="3" y="4" width="18" height="16" rx="3" />
                            <circle cx="9" cy="10" r="2" />
                            <line x1="15" y1="8" x2="17" y2="8" />
                            <line x1="15" y1="12" x2="17" y2="12" />
                            <line x1="7" y1="16" x2="17" y2="16" />
                        </svg>
                    </div>

                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* User Identity & Info */}
                        <div className="flex items-center gap-3.5 sm:gap-4.5">
                            <div className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-default)] p-1.5 shadow-sm shrink-0 overflow-hidden">
                                <Image
                                    src="/user_icon.png"
                                    alt="User Avatar"
                                    width={64}
                                    height={64}
                                    className="h-full w-full object-contain"
                                    priority
                                />
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight truncate">
                                        {isNe ? 'नमस्ते,' : 'Namaste,'} {user.email.split('@')[0]}
                                    </h1>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>{isNe ? 'सत्यापित नागरिक' : 'Verified Citizen'}</span>
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] font-medium truncate mt-0.5">
                                    {user.email} • {isNe ? 'पारिवारिक स्मार्ट कार्ड भल्ट' : 'Family Driving License Vault'}
                                </p>
                            </div>
                        </div>

                        {/* Interactive Metric Tiles */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
                            {/* Metric 1: Total Saved */}
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab('licenses')
                                    setLicenseFilter('all')
                                }}
                                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                                    activeTab === 'licenses' && licenseFilter === 'all'
                                        ? 'border-[var(--nepal-blue)] bg-[var(--surface-primary)] shadow-sm'
                                        : 'border-[var(--border-default)] bg-[var(--surface-primary)]/70 hover:border-[var(--nepal-blue)]/50'
                                }`}
                            >
                                <span className="block text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                    {isNe ? 'कुल सेभ' : 'Total Saved'}
                                </span>
                                <span className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] mt-0.5 block">
                                    {licenses.length}
                                </span>
                            </button>

                            {/* Metric 2: Ready */}
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab('licenses')
                                    setLicenseFilter('ready')
                                }}
                                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                                    activeTab === 'licenses' && licenseFilter === 'ready'
                                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm'
                                        : 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                        {isNe ? 'छापिएको' : 'Ready'}
                                    </span>
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                </div>
                                <span className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                                    {readyCount}
                                </span>
                            </button>

                            {/* Metric 3: In Print Queue */}
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTab('licenses')
                                    setLicenseFilter('pending')
                                }}
                                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                                    activeTab === 'licenses' && licenseFilter === 'pending'
                                        ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                                        : 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60'
                                }`}
                            >
                                <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                    {isNe ? 'बाँकी' : 'In Queue'}
                                </span>
                                <span className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">
                                    {pendingCount}
                                </span>
                            </button>

                            {/* Metric 4: Messages */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('support')}
                                className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                                    activeTab === 'support'
                                        ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10 shadow-sm'
                                        : 'border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue)]/5 hover:border-[var(--nepal-blue)]/60'
                                }`}
                            >
                                <span className="block text-[11px] font-bold text-[var(--nepal-blue)] uppercase tracking-wider">
                                    {isNe ? 'सन्देशहरू' : 'Inquiries'}
                                </span>
                                <span className="text-xl sm:text-2xl font-extrabold text-[var(--nepal-blue)] mt-0.5 block">
                                    {tickets.length}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dashboard Tabs Bar */}
                <div className="flex items-center justify-between border-b border-[var(--border-default)] gap-2 sm:gap-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-1">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Tab 1: Licenses */}
                        <button
                            type="button"
                            onClick={() => setActiveTab('licenses')}
                            className={`flex items-center gap-2 rounded-xl py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                                activeTab === 'licenses'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]'
                            }`}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="16" rx="3" />
                                <circle cx="9" cy="10" r="2" />
                                <line x1="15" y1="8" x2="17" y2="8" />
                                <line x1="15" y1="12" x2="17" y2="12" />
                                <line x1="7" y1="16" x2="17" y2="16" />
                            </svg>
                            <span>{isNe ? 'पारिवारिक लाइसेन्सहरू' : 'Family Licenses'}</span>
                            <span className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                                activeTab === 'licenses' ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                            }`}>
                                {licenses.length}
                            </span>
                        </button>

                        {/* Tab 2: Sent Messages & Support */}
                        <button
                            type="button"
                            onClick={() => setActiveTab('support')}
                            className={`flex items-center gap-2 rounded-xl py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                                activeTab === 'support'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]'
                            }`}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            <span>{isNe ? 'मेरो सन्देश तथा सोधपुछ' : 'Sent Inquiries'}</span>
                            {tickets.length > 0 && (
                                <span className={`rounded-full px-2 py-0.2 text-[10px] font-extrabold ${
                                    activeTab === 'support' ? 'bg-white/20 text-white' : 'bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]'
                                }`}>
                                    {tickets.length}
                                </span>
                            )}
                        </button>

                        {/* Tab 3: Security & Password */}
                        <button
                            type="button"
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-2 rounded-xl py-2 px-3 sm:px-4 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                                activeTab === 'security'
                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]'
                            }`}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                            <span>{isNe ? 'सुरक्षा तथा खाता' : 'Account & Security'}</span>
                        </button>
                    </div>

                    {/* Quick Add CTA on Tabs Bar */}
                    {activeTab === 'licenses' && licenses.length > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Refresh All */}
                            <button
                                type="button"
                                onClick={handleRefreshAll}
                                disabled={refreshingAll}
                                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer disabled:opacity-50"
                                title="Check status for all saved licenses"
                            >
                                <svg
                                    width="13"
                                    height="13"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    className={refreshingAll ? 'animate-spin text-[var(--nepal-blue)]' : ''}
                                >
                                    <polyline points="23 4 23 10 17 10" />
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                                <span>{refreshingAll ? (isNe ? 'जाँच्दै...' : 'Checking...') : (isNe ? 'सबै ताजा गर्नुहोस्' : 'Refresh All')}</span>
                            </button>

                            {/* Add Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddModalOpen(true)
                                    setAddModalError(null)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:opacity-95 active:scale-95 cursor-pointer"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                <span>{isNe ? 'लाइसेन्स थप्नुहोस्' : 'Add License'}</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* TAB 1: SAVED FAMILY LICENSES */}
                {activeTab === 'licenses' && (
                    <div className="space-y-5">
                        {/* Search & Filter Toolbar */}
                        {licenses.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-primary)] p-3 rounded-2xl border border-[var(--border-default)]">
                                {/* Search input */}
                                <div className="relative flex-1">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={licenseSearch}
                                        onChange={(e) => setLicenseSearch(e.target.value)}
                                        placeholder={isNe ? 'नम्बर, नाम वा लेबलबाट खोज्नुहोस्...' : 'Filter by number, name, or label...'}
                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-9 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--nepal-blue)] focus:outline-none transition"
                                    />
                                    {licenseSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setLicenseSearch('')}
                                            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Filter status chips */}
                                <div className="flex items-center gap-1.5 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => setLicenseFilter('all')}
                                        className={`rounded-xl px-3 py-1.5 font-bold transition cursor-pointer ${
                                            licenseFilter === 'all'
                                                ? 'bg-[var(--nepal-blue)] text-white shadow-2xs'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        {isNe ? 'सबै' : 'All'} ({licenses.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLicenseFilter('ready')}
                                        className={`rounded-xl px-3 py-1.5 font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                            licenseFilter === 'ready'
                                                ? 'bg-emerald-600 text-white shadow-2xs'
                                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                        }`}
                                    >
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        <span>{isNe ? 'छापिएको' : 'Ready'}</span>
                                        <span>({readyCount})</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLicenseFilter('pending')}
                                        className={`rounded-xl px-3 py-1.5 font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                            licenseFilter === 'pending'
                                                ? 'bg-amber-600 text-white shadow-2xs'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                                        }`}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            <circle cx="12" cy="12" r="10" />
                                            <polyline points="12 6 12 12 16 14" />
                                        </svg>
                                        <span>{isNe ? 'बाँकी' : 'In Queue'}</span>
                                        <span>({pendingCount})</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {loadingLicenses ? (
                            <div className="flex justify-center py-16">
                                <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--nepal-blue)] border-t-transparent" />
                            </div>
                        ) : licenses.length === 0 ? (
                            /* Empty State Onboarding */
                            <div className="rounded-2xl sm:rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface-primary)] p-8 sm:p-12 text-center space-y-4">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 shadow-xs">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="16" rx="3" />
                                        <circle cx="9" cy="10" r="2" />
                                        <line x1="15" y1="8" x2="17" y2="8" />
                                        <line x1="15" y1="12" x2="17" y2="12" />
                                        <line x1="7" y1="16" x2="17" y2="16" />
                                    </svg>
                                </div>
                                <div className="max-w-md mx-auto space-y-1.5">
                                    <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                                        {isNe ? 'पारिवारिक भल्ट खाली छ' : 'Your Family License Vault is Empty'}
                                    </h3>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                        {isNe
                                            ? 'तपाईं वा परिवारका सदस्यहरू (बुबा, आमा, दाजुभाइ, दिदीबहिनी) को लाइसेन्स नम्बर सेभ गर्नुहोस्। कार्ड छापिने बित्तिकै तपाईंलाई इमेलमा सूचना आउनेछ।'
                                            : 'Save your own or family members’ driving licenses (Father, Mother, Siblings) to track official print status and get notified as soon as DOTM finishes printing.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddModalOpen(true)
                                        setAddModalError(null)
                                    }}
                                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:opacity-95 active:scale-95 cursor-pointer"
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    <span>{isNe ? 'पहिलो लाइसेन्स थप्नुहोस्' : 'Add First License to Vault'}</span>
                                </button>
                            </div>
                        ) : filteredLicenses.length === 0 ? (
                            /* No search results */
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-8 text-center space-y-2">
                                <p className="text-xs font-bold text-[var(--text-primary)]">
                                    {isNe ? 'कुनै लाइसेन्स फेला परेन' : 'No matching licenses found'}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    {isNe ? 'कृपया फरक शब्द वा नम्बर खोज्नुहोस्।' : 'Try adjusting your search query or filter.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLicenseSearch('')
                                        setLicenseFilter('all')
                                    }}
                                    className="text-xs font-bold text-[var(--nepal-blue)] hover:underline pt-2 block mx-auto cursor-pointer"
                                >
                                    {isNe ? 'सबै देखाउनुहोस्' : 'Reset filters'}
                                </button>
                            </div>
                        ) : (
                            /* Authentic Smart Card Grid */
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                                {filteredLicenses.map((item) => {
                                    const isReady = item.status === 'ready'
                                    const isRefreshing = refreshingLicenseId === item.id
                                    const isCopied = copiedLicenseId === item.id

                                    return (
                                        <div
                                            key={item.id}
                                            className="group relative rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] dev-glass-card p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-5"
                                        >
                                            <div>
                                                {/* Card Header: Relationship Pill & Live Status */}
                                                <div className="flex items-start justify-between gap-3 mb-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--nepal-blue)]/10 px-2.5 py-1 text-xs font-extrabold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 shadow-2xs">
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                                                                <line x1="7" y1="7" x2="7.01" y2="7" />
                                                            </svg>
                                                            <span>{item.label}</span>
                                                        </span>
                                                        {item.holder_name && (
                                                            <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[160px]">
                                                                {item.holder_name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Status Badge */}
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold shrink-0 shadow-2xs ${
                                                            isReady
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`h-2 w-2 rounded-full ${
                                                                isReady ? 'bg-emerald-500' : 'bg-amber-500'
                                                            }`}
                                                        />
                                                        <span>
                                                            {isReady
                                                                ? isNe
                                                                    ? 'छपाइ भइसकेको (Ready)'
                                                                    : 'Ready to Collect'
                                                                : isNe
                                                                ? 'छपाइ हुन बाँकी (In Queue)'
                                                                : 'In Printing Queue'}
                                                        </span>
                                                    </span>
                                                </div>

                                                {/* License Number with Quick Copy */}
                                                <div className="flex items-center justify-between gap-2 bg-[var(--bg-secondary)]/50 rounded-xl p-3 border border-[var(--border-default)]">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                                                            {isNe ? 'स्मार्ट लाइसेन्स नम्बर' : 'Smart License Number'}
                                                        </span>
                                                        <span className="font-mono text-base sm:text-lg font-extrabold text-[var(--text-primary)] tracking-wider">
                                                            {item.license_number}
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyNumber(item)}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)] border border-[var(--border-default)] transition cursor-pointer shadow-2xs"
                                                        title="Copy license number"
                                                    >
                                                        {isCopied ? (
                                                            <>
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{isNe ? 'कपी भयो' : 'Copied'}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                </svg>
                                                                <span>{isNe ? 'कपी' : 'Copy'}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Transport Office & Vehicle Category Meta */}
                                                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                                                    {item.office ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 font-semibold border border-[var(--border-default)]/60">
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                                <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1" />
                                                            </svg>
                                                            <span className="truncate max-w-[200px]">{item.office}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 text-[var(--text-muted)] italic border border-[var(--border-default)]/50">
                                                            {isNe ? 'कार्यालय विवरण जाँच गर्नुहोस्' : 'Office info updates on check'}
                                                        </span>
                                                    )}

                                                    {item.category && (
                                                        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] px-2.5 py-1 font-extrabold border border-[var(--nepal-blue)]/20">
                                                            Category: {item.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action & Toggle Toolbar */}
                                            <div className="pt-3.5 border-t border-[var(--border-default)] flex items-center justify-between gap-2 text-xs">
                                                {/* Smart Alert Subscribe / Unsubscribe Switch Button */}
                                                <button
                                                    type="button"
                                                    disabled={togglingNotification}
                                                    onClick={() => handleAlertClick(item)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer disabled:opacity-50 shadow-2xs ${
                                                        item.notify_email
                                                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20'
                                                            : 'text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-default)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)]/50'
                                                    }`}
                                                    title={
                                                        item.notify_email
                                                            ? (isNe ? 'इमेल अलर्ट सक्रिय छ (क्लिक गरी Unsubscribe गर्नुहोस्)' : 'Email alerts active (Click to unsubscribe)')
                                                            : (isNe ? 'इमेल अलर्ट बन्द छ (क्लिक गरी Subscribe गर्नुहोस्)' : 'Email alerts paused (Click to subscribe)')
                                                    }
                                                >
                                                    {item.notify_email ? (
                                                        <>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600 dark:text-emerald-400">
                                                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                            </svg>
                                                            <span>{isNe ? 'अलर्ट सक्रिय' : 'Alerts Active'}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-[var(--text-muted)]">
                                                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                                <line x1="2" y1="2" x2="22" y2="22" />
                                                            </svg>
                                                            <span>{isNe ? 'अलर्ट बन्द (Subscribe)' : 'Subscribe Alerts'}</span>
                                                        </>
                                                    )}
                                                </button>

                                                {/* Right Actions: Check Now, Delete */}
                                                <div className="flex items-center gap-1.5">
                                                    {/* Check Status Live */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRefreshStatus(item)}
                                                        disabled={isRefreshing}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition text-[11px] font-bold cursor-pointer disabled:opacity-50 shadow-2xs"
                                                        title="Live check with DOTM database"
                                                    >
                                                        <svg
                                                            width="12"
                                                            height="12"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2.2"
                                                            className={isRefreshing ? 'animate-spin text-[var(--nepal-blue)]' : ''}
                                                        >
                                                            <polyline points="23 4 23 10 17 10" />
                                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                                        </svg>
                                                        <span>{isRefreshing ? (isNe ? '...' : '...') : (isNe ? 'पुनः जाँच' : 'Check')}</span>
                                                    </button>

                                                    {/* Delete from Vault (Opens Proper Confirmation Modal) */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeleteTarget(item)}
                                                        className="inline-flex items-center p-2 rounded-xl text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                                                        title={isNe ? 'भल्टबाट हटाउनुहोस्' : 'Remove from saved vault'}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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
                )}

                {/* TAB 2: MY SENT INQUIRIES & SUPPORT HISTORY */}
                {activeTab === 'support' && (
                    <div className="space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--surface-primary)] p-5 rounded-2xl border border-[var(--border-default)]">
                            <div>
                                <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                                    <span>{isNe ? 'मेरो पठाइएका सोधपुछ तथा उजुरी इतिहास' : 'My Sent Inquiries & Support History'}</span>
                                    {tickets.length > 0 && (
                                        <span className="rounded-full bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] px-2.5 py-0.5 text-[11px] font-extrabold border border-[var(--nepal-blue)]/20">
                                            {tickets.length}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    {isNe
                                        ? 'यस इमेलबाट पठाइएका सबै उजुरी, सोधपुछ र सहायता टोलीको आधिकारिक जवाफ यहाँ स्वतः उपलब्ध हुन्छ।'
                                        : 'Every inquiry submitted with your account email appears here automatically along with team replies.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsNewTicketModalOpen(true)
                                    setTicketModalError(null)
                                    setTicketModalSuccess(null)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 cursor-pointer shrink-0"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                <span>{isNe ? 'नयाँ सोधपुछ पठाउनुहोस्' : 'Submit New Inquiry'}</span>
                            </button>
                        </div>

                        {loadingTickets ? (
                            <div className="flex justify-center py-16">
                                <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--nepal-blue)] border-t-transparent" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="rounded-2xl sm:rounded-3xl border border-dashed border-[var(--border-default)] bg-[var(--surface-primary)] p-8 sm:p-12 text-center space-y-3">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    {isNe ? 'कुनै सन्देश वा सोधपुछ फेला परेन' : 'No Inquiries Found'}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                                    {isNe
                                        ? 'लाइसेन्स नभेटिएको, ढिलाइ भएको वा कुनै समस्या भए सिधै हाम्रो सहायता टोलीलाई सन्देश पठाउनुहोस्।'
                                        : 'Have questions about your smart license printing or notice an issue? You can submit an inquiry directly here.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsNewTicketModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 cursor-pointer"
                                >
                                    <span>{isNe ? '+ सन्देश पठाउनुहोस्' : '+ Submit Inquiry'}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tickets.map((t) => {
                                    const cat = FEEDBACK_CATEGORIES.find((c) => c.id === t.category)
                                    const catLabel = isNe && cat?.labelNe ? cat.labelNe : cat?.label || t.category
                                    const isResolved = t.status === 'resolved'
                                    const isInProgress = t.status === 'in_progress'

                                    return (
                                        <div
                                            key={t.id}
                                            className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 sm:p-6 shadow-sm space-y-4"
                                        >
                                            {/* Top Metadata Header */}
                                            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[var(--border-default)]/60 pb-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Status Badge */}
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                                                            isResolved
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                                                : isInProgress
                                                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25'
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                                                        }`}
                                                    >
                                                        {isResolved
                                                            ? isNe
                                                                ? '🟢 समाधान भयो (Resolved)'
                                                                : '🟢 Resolved'
                                                            : isInProgress
                                                            ? isNe
                                                                ? '🔵 समीक्षा हुँदैछ (In Review)'
                                                                : '🔵 Under Review'
                                                            : isNe
                                                            ? '🟡 प्राप्त भयो (Received)'
                                                            : '🟡 Received'}
                                                    </span>

                                                    <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                                                        {catLabel}
                                                    </span>

                                                    <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md">
                                                        #{t.id.slice(0, 16)}
                                                    </span>
                                                </div>

                                                <span className="text-[11px] text-[var(--text-secondary)]">
                                                    {new Date(t.created_at).toLocaleString(
                                                        isNe ? 'ne-NP' : 'en-US',
                                                        {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        }
                                                    )}
                                                </span>
                                            </div>

                                            {/* User Sent Message Box */}
                                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                            <circle cx="12" cy="7" r="4" />
                                                        </svg>
                                                        <span>{isNe ? 'तपाईंले पठाउनुभएको सन्देश:' : 'You sent:'}</span>
                                                    </span>

                                                    {t.license_number && (
                                                        <span className="font-mono text-xs font-bold text-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10 px-2 py-0.5 rounded-md border border-[var(--nepal-blue)]/20">
                                                            License: {t.license_number}
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                                    {t.subject}
                                                </h3>

                                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                                    {t.message}
                                                </p>
                                            </div>

                                            {/* Official Team Response */}
                                            {t.admin_notes ? (
                                                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-xs space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                        </svg>
                                                        <span>{isNe ? 'सहायता टोलीको जवाफ:' : 'Support Team Reply:'}</span>
                                                    </div>
                                                    <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed pl-5">
                                                        {t.admin_notes}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-secondary)]/30 px-3.5 py-2.5 text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-500">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    <span>
                                                        {isNe
                                                            ? 'तपाईंको सन्देश सहायता टोलीले प्राप्त गरिसकेको छ। समीक्षापछि जवाफ यहाँ देखिनेछ र इमेलमा पनि जानकारी आउनेछ।'
                                                            : 'Your message has been received by our support team. Resolution update will appear here and via email.'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: ACCOUNT & SECURITY */}
                {activeTab === 'security' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        {/* Profile Info Card */}
                        <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-sm space-y-4">
                            <div>
                                <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                                    {isNe ? 'खाता तथा सुरक्षा विवरण' : 'Account & Security Details'}
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    {isNe ? 'तपाईंको दर्ता गरिएको इमेल, सत्र र सुरक्षा स्थिति।' : 'Your primary authenticated citizen profile.'}
                                </p>
                            </div>

                            <div className="space-y-3 text-xs divide-y divide-[var(--border-default)]/60">
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-semibold text-[var(--text-secondary)]">Email Address</span>
                                    <span className="font-bold text-[var(--text-primary)]">{user.email}</span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-semibold text-[var(--text-secondary)]">
                                        {isNe ? 'दर्ता मिति' : 'Member Since'}
                                    </span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="font-semibold text-[var(--text-secondary)]">
                                        {isNe ? 'प्रमाणीकरण विधि' : 'Auth Method'}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] px-2.5 py-0.5 font-bold border border-[var(--nepal-blue)]/20">
                                        {user.has_password
                                            ? isNe
                                                ? 'पासवर्ड + ओटीपी दुवै चालु'
                                                : 'Password + OTP Active'
                                            : isNe
                                            ? '६-अङ्कको ओटीपी मात्र'
                                            : 'Passwordless OTP'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Set / Change Password Card */}
                        <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-sm space-y-4">
                            <div>
                                <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
                                    {user.has_password
                                        ? isNe
                                            ? 'पासवर्ड परिवर्तन गर्नुहोस्'
                                            : 'Change Permanent Password'
                                        : isNe
                                        ? 'स्थायी पासवर्ड राख्नुहोस् (ऐच्छिक)'
                                        : 'Set Permanent Password (Optional)'}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    {isNe
                                        ? 'पासवर्ड राखेपछि तपाईं पासवर्ड वा ६-अङ्कको ओटीपी दुवैबाट जुनसुकै बेला लगइन गर्न सक्नुहुन्छ।'
                                        : 'Setting a password lets you sign in using either your permanent password or a 6-digit email OTP.'}
                                </p>
                            </div>

                            {passwordFeedback && (
                                <div
                                    className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                                        passwordFeedback.type === 'success'
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                                    }`}
                                >
                                    <span>{passwordFeedback.message}</span>
                                </div>
                            )}

                            <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
                                {user.has_password && (
                                    <div>
                                        <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                            {isNe ? 'हालको पासवर्ड' : 'Current Password'}
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none transition"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                        {isNe ? 'नयाँ पासवर्ड (कम्तिमा ६ अक्षर)' : 'New Password (min 6 characters)'}
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none transition"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                        {isNe ? 'नयाँ पासवर्ड पुनः पुष्टि गर्नुहोस्' : 'Confirm New Password'}
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none transition"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingPassword}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] py-2.5 px-4 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {savingPassword ? (
                                        <span>{isNe ? 'सुरक्षित गर्दै...' : 'Saving...'}</span>
                                    ) : (
                                        <span>
                                            {user.has_password
                                                ? isNe
                                                    ? 'पासवर्ड अद्यावधिक गर्नुहोस्'
                                                    : 'Update Password'
                                                : isNe
                                                ? 'पासवर्ड सुरक्षित गर्नुहोस्'
                                                : 'Save Permanent Password'}
                                        </span>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* ADD LICENSE MODAL (Elevated Dialog with Backdrop) */}
            {isAddModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsAddModalOpen(false)
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
                            <div>
                                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                                    {isNe ? 'पारिवारिक लाइसेन्स थप्नुहोस्' : 'Add License to Vault'}
                                </h3>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                    {isNe ? 'तपाईं वा परिवारका सदस्यको लाइसेन्स नम्बर दर्ता गर्नुहोस्।' : 'Save your personal or family member license.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="rounded-xl p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer transition"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {addModalError && (
                            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                {addModalError}
                            </div>
                        )}

                        <form onSubmit={handleAddLicense} className="space-y-4 text-xs">
                            {/* Label / Relationship Chips */}
                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                    {isNe ? 'लाइसेन्स कसको हो? (उपनाम/लेबल)' : 'Whose License is This? (Label / Nickname)'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                    placeholder="e.g. Mine, Father, Mother"
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none transition"
                                />

                                {/* Suggestion Chips */}
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {['Mine', 'Father', 'Mother', 'Brother', 'Sister', 'Spouse'].map((chip) => (
                                        <button
                                            type="button"
                                            key={chip}
                                            onClick={() => setNewLabel(chip)}
                                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                                                newLabel.toLowerCase() === chip.toLowerCase()
                                                    ? 'bg-[var(--nepal-blue)] text-white shadow-2xs'
                                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
                                            }`}
                                        >
                                            {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* License Number Input */}
                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                    {isNe ? 'लाइसेन्स नम्बर (XX-XX-XXXXXXXX)' : 'License Number (XX-XX-XXXXXXXX)'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newNumber}
                                    onChange={(e) => setNewNumber(formatLicenseInput(e.target.value))}
                                    placeholder="01-06-12345678"
                                    className="w-full font-mono font-bold tracking-wider rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none transition"
                                />
                                <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                                    {isNe ? 'अंग्रेजी वा नेपाली अङ्क (०-९) दुवै चल्छ।' : 'Accepts English or Nepali digits (०-९). Auto-formats.'}
                                </p>
                            </div>

                            {/* Notify Toggle */}
                            <label className="flex items-start gap-2.5 cursor-pointer pt-1 bg-[var(--bg-secondary)]/50 p-3 rounded-xl border border-[var(--border-default)]">
                                <input
                                    type="checkbox"
                                    checked={newNotify}
                                    onChange={(e) => setNewNotify(e.target.checked)}
                                    className="h-4 w-4 rounded accent-[var(--nepal-blue)] mt-0.5"
                                />
                                <span className="text-[11px] font-medium text-[var(--text-primary)] leading-snug">
                                    {isNe
                                        ? 'लाइसेन्स छापिएपछि मेरो इमेलमा तुरुन्तै स्वतः अलर्ट पठाउनुहोस्'
                                        : 'Send me an automatic email alert when DOTM prints this license'}
                                </span>
                            </label>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                                >
                                    {isNe ? 'रद्द' : 'Cancel'}
                                </button>

                                <button
                                    type="submit"
                                    disabled={addingLicense || !newNumber}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {addingLicense ? (
                                        <span>{isNe ? 'सेभ गर्दै...' : 'Saving...'}</span>
                                    ) : (
                                        <span>{isNe ? 'भल्टमा सेभ गर्नुहोस्' : 'Save to Vault'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* NEW SUPPORT INQUIRY MODAL */}
            {isNewTicketModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsNewTicketModalOpen(false)
                    }}
                >
                    <div className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
                            <div>
                                <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                                    {isNe ? 'नयाँ सोधपुछ वा उजुरी पठाउनुहोस्' : 'Submit Support Inquiry'}
                                </h3>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                    {isNe ? 'हाम्रो प्राविधिक टोलीले समीक्षा गरी जवाफ दिनेछ।' : 'Our team will review your inquiry and update you.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsNewTicketModalOpen(false)}
                                className="rounded-xl p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer transition"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {ticketModalError && (
                            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                {ticketModalError}
                            </div>
                        )}

                        {ticketModalSuccess && (
                            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {ticketModalSuccess}
                            </div>
                        )}

                        <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                    {isNe ? 'विषयको विधा' : 'Category'}
                                </label>
                                <select
                                    value={ticketCategory}
                                    onChange={(e) => setTicketCategory(e.target.value)}
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none transition"
                                >
                                    {FEEDBACK_CATEGORIES.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {isNe && c.labelNe ? c.labelNe : c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Optional Attached License selection from family vault */}
                            {licenses.length > 0 && (
                                <div>
                                    <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                        {isNe ? 'सम्बन्धित लाइसेन्स (ऐच्छिक)' : 'Related License (Optional)'}
                                    </label>
                                    <select
                                        value={ticketLicense}
                                        onChange={(e) => setTicketLicense(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none transition"
                                    >
                                        <option value="">{isNe ? '-- कुनै लाइसेन्स छान्नुहोस् --' : '-- Select a saved license --'}</option>
                                        {licenses.map((lic) => (
                                            <option key={lic.id} value={lic.license_number}>
                                                {lic.label} ({lic.license_number})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                    {isNe ? 'शीर्षक' : 'Subject'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={ticketSubject}
                                    onChange={(e) => setTicketSubject(e.target.value)}
                                    placeholder={isNe ? 'उदा: लाइसेन्स छपाइ ढिलाइ वा कार्ड संकलन सम्बन्धी' : 'e.g. License not showing or card collection inquiry'}
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                    {isNe ? 'तपाईंको सन्देश वा समस्याको विवरण' : 'Message / Inquiry Details'}
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={ticketMessage}
                                    onChange={(e) => setTicketMessage(e.target.value)}
                                    placeholder={
                                        isNe
                                            ? 'तपाईंको प्रश्न वा समस्या यहाँ विस्तृत रूपमा लेख्नुहोस्...'
                                            : 'Please describe your inquiry or problem in detail...'
                                    }
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none transition leading-relaxed"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsNewTicketModalOpen(false)}
                                    className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                                >
                                    {isNe ? 'रद्द' : 'Cancel'}
                                </button>

                                <button
                                    type="submit"
                                    disabled={submittingTicket || !ticketMessage.trim()}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {submittingTicket ? (
                                        <span>{isNe ? 'पठाउँदै...' : 'Submitting...'}</span>
                                    ) : (
                                        <span>{isNe ? 'पठाउनुहोस्' : 'Submit Inquiry'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PROPER DELETE LICENSE CONFIRMATION MODAL */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-dialog-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !deletingLicense) {
                            setDeleteTarget(null)
                        }
                    }}
                >
                    <div
                        className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-2xl space-y-4 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header: Hazard Icon + Title */}
                        <div className="flex items-start gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 id="delete-dialog-title" className="text-base font-extrabold text-[var(--text-primary)]">
                                    {isNe ? 'लाइसेन्स भल्टबाट हटाउने निश्चित हुनुहुन्छ?' : 'Remove License from Vault?'}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                    {isNe
                                        ? 'यो लाइसेन्स तपाईंको भल्टबाट हटाइनेछ र कार्ड छापिने बित्तिकै आउने स्वचालित इमेल सूचनाहरू बन्द हुनेछन्।'
                                        : 'This license will be removed from your family vault and automated print readiness alerts will be stopped.'}
                                </p>
                            </div>
                        </div>

                        {/* Target License Summary Card */}
                        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/70 p-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                                    {isNe ? 'लाइसेन्स नम्बर' : 'License Number'}
                                </span>
                                <span className="font-mono font-extrabold text-[var(--text-primary)] tracking-wider">
                                    {deleteTarget.license_number}
                                </span>
                            </div>
                            {deleteTarget.label && (
                                <div className="flex items-center justify-between border-t border-[var(--border-default)]/60 pt-2">
                                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                                        {isNe ? 'सम्बन्ध / लेबल' : 'Relation / Label'}
                                    </span>
                                    <span className="font-semibold text-[var(--text-primary)]">
                                        {deleteTarget.label}
                                    </span>
                                </div>
                            )}
                            {deleteTarget.holder_name && (
                                <div className="flex items-center justify-between border-t border-[var(--border-default)]/60 pt-2">
                                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                                        {isNe ? 'नाम' : 'Holder Name'}
                                    </span>
                                    <span className="font-semibold text-[var(--text-primary)]">
                                        {deleteTarget.holder_name}
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center justify-between border-t border-[var(--border-default)]/60 pt-2">
                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                                    {isNe ? 'छपाइ स्थिति' : 'Print Status'}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    deleteTarget.status === 'ready'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                    {deleteTarget.status === 'ready'
                                        ? isNe ? 'छापिएको (Ready)' : 'Ready to Collect'
                                        : isNe ? 'बाँकी (In Queue)' : 'In Printing Queue'}
                                </span>
                            </div>
                        </div>

                        {/* Dialog Footer Actions */}
                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                disabled={deletingLicense}
                                onClick={() => setDeleteTarget(null)}
                                className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer disabled:opacity-50"
                            >
                                {isNe ? 'रद्द' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                disabled={deletingLicense}
                                onClick={handleConfirmDelete}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {deletingLicense ? (
                                    <>
                                        <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        <span>{isNe ? 'हटाउँदै...' : 'Removing...'}</span>
                                    </>
                                ) : (
                                    <span>{isNe ? 'हो, हटाउनुहोस्' : 'Yes, Remove License'}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROPER UNSUBSCRIBE FROM ALERTS CONFIRMATION MODAL */}
            {unsubscribeTarget && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="unsubscribe-dialog-title"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !togglingNotification) {
                            setUnsubscribeTarget(null)
                        }
                    }}
                >
                    <div
                        className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-2xl space-y-4 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header: Alert Off Icon + Title */}
                        <div className="flex items-start gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                    <line x1="2" y1="2" x2="22" y2="22" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 id="unsubscribe-dialog-title" className="text-base font-extrabold text-[var(--text-primary)]">
                                    {isNe ? 'इमेल सूचनाहरू बन्द (Unsubscribe) गर्ने?' : 'Unsubscribe from Email Alerts?'}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                    {isNe
                                        ? 'तपाईंले यो लाइसेन्सका लागि स्वचालित इमेल सूचनाहरू बन्द गर्न लाग्नुभएको छ। यातायात व्यवस्था विभाग (DOTM) ले कार्ड छापेपछि तपाईंलाई सूचना आउने छैन।'
                                        : 'You will no longer receive an automated notification email when DOTM finishes printing this driving license.'}
                                </p>
                            </div>
                        </div>

                        {/* License details preview */}
                        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/70 p-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                                    {isNe ? 'लाइसेन्स नम्बर' : 'License Number'}
                                </span>
                                <span className="font-mono font-extrabold text-[var(--text-primary)] tracking-wider">
                                    {unsubscribeTarget.license_number}
                                </span>
                            </div>
                            {unsubscribeTarget.label && (
                                <div className="flex items-center justify-between border-t border-[var(--border-default)]/60 pt-2">
                                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                                        {isNe ? 'सम्बन्ध / लेबल' : 'Relation / Label'}
                                    </span>
                                    <span className="font-semibold text-[var(--text-primary)]">
                                        {unsubscribeTarget.label}
                                    </span>
                                </div>
                            )}
                            {user?.email && (
                                <div className="flex items-center justify-between border-t border-[var(--border-default)]/60 pt-2">
                                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider">
                                        {isNe ? 'इमेल ठेगाना' : 'Subscribed Email'}
                                    </span>
                                    <span className="font-semibold text-[var(--text-primary)] truncate max-w-[200px]">
                                        {user.email}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                disabled={togglingNotification}
                                onClick={() => setUnsubscribeTarget(null)}
                                className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer disabled:opacity-50"
                            >
                                {isNe ? 'अलर्ट चालु राख्नुहोस्' : 'Keep Alerts On'}
                            </button>
                            <button
                                type="button"
                                disabled={togglingNotification}
                                onClick={handleConfirmUnsubscribe}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {togglingNotification ? (
                                    <>
                                        <svg className="animate-spin -ml-0.5 mr-1 h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        <span>{isNe ? 'अनसबस्क्राइब गर्दै...' : 'Unsubscribing...'}</span>
                                    </>
                                ) : (
                                    <span>{isNe ? 'हो, अनसबस्क्राइब गर्नुहोस्' : 'Yes, Unsubscribe'}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FLOATING TOAST NOTIFICATION */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-6 right-6 z-50 animate-slide-up flex items-center gap-2.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-md max-w-sm"
                >
                    {toast.type === 'success' && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    )}
                    {toast.type === 'error' && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </div>
                    )}
                    {toast.type === 'info' && (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        </div>
                    )}
                    <span className="text-[var(--text-primary)] leading-normal">{toast.message}</span>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        className="ml-auto text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5 cursor-pointer"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}
        </main>
    )
}
