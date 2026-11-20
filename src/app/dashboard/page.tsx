// src/app/dashboard/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
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

    // Active Tab
    const [activeTab, setActiveTab] = useState<'licenses' | 'support' | 'security'>('licenses')

    // Licenses State
    const [licenses, setLicenses] = useState<UserSavedLicense[]>([])
    const [loadingLicenses, setLoadingLicenses] = useState(false)
    const [refreshingLicenseId, setRefreshingLicenseId] = useState<string | null>(null)

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

    // Detect language
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlLang = new URLSearchParams(window.location.search).get('lang')
            if (urlLang === 'ne' || urlLang === 'en') {
                setLanguage(urlLang)
            } else {
                const saved = localStorage.getItem('nlc_language')
                if (saved === 'ne' || saved === 'en') setLanguage(saved)
            }
        }
    }, [])

    // Load User
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

    // Load Licenses
    const fetchLicenses = useCallback(async () => {
        setLoadingLicenses(true)
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

    // Load Support Tickets
    const fetchTickets = useCallback(async () => {
        setLoadingTickets(true)
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
        fetchUser()
    }, [fetchUser])

    useEffect(() => {
        if (user) {
            fetchLicenses()
            fetchTickets()
        }
    }, [user, fetchLicenses, fetchTickets])

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
            const res = await fetch(`/api/license?number=${encodeURIComponent(item.license_number)}`)
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
            } else {
                setLicenses((prev) =>
                    prev.map((lic) => (lic.id === item.id ? { ...lic, status: 'not_printed' } : lic))
                )
            }
        } catch (err) {
            console.error('Error refreshing license:', err)
        } finally {
            setRefreshingLicenseId(null)
        }
    }

    // Delete single license
    const handleDeleteLicense = async (id: string, num: string) => {
        const confirmMsg =
            language === 'ne'
                ? `के तपाईं साँच्चै #${num} लाइसेन्स सूचीबाट हटाउन चाहनुहुन्छ?`
                : `Are you sure you want to remove license #${num} from your saved list?`
        if (!confirm(confirmMsg)) return

        try {
            const res = await fetch(`/api/user/licenses?id=${encodeURIComponent(id)}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                setLicenses((prev) => prev.filter((l) => l.id !== id))
            }
        } catch (err) {
            console.error('Failed to delete license:', err)
        }
    }

    // Toggle notification for license
    const handleToggleNotification = async (item: UserSavedLicense) => {
        const nextState = !item.notify_email
        setLicenses((prev) =>
            prev.map((l) => (l.id === item.id ? { ...l, notify_email: nextState } : l))
        )
        try {
            await fetch('/api/user/licenses', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, notify_email: nextState }),
            })
        } catch (err) {
            console.error('Failed to toggle notification:', err)
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
                setTicketModalSuccess(
                    language === 'ne' ? 'उजुरी/सोधपुछ सफलतापूर्वक पठाइयो!' : 'Inquiry submitted successfully!'
                )
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
                setPasswordFeedback({
                    type: 'success',
                    message: language === 'ne' ? 'पासवर्ड सफलतापूर्वक सुरक्षित भयो!' : 'Password updated successfully!',
                })
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

    if (loadingUser) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--nepal-blue)] border-t-transparent" />
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        {language === 'ne' ? 'लोड हुँदैछ...' : 'Loading dashboard...'}
                    </span>
                </div>
            </main>
        )
    }

    if (!user) return null

    // Compute stats
    const readyCount = licenses.filter((l) => l.status === 'ready').length
    const pendingCount = licenses.filter((l) => l.status === 'not_printed').length

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors pb-16">
            {/* Top Navbar */}
            <header className="sticky top-0 z-30 border-b border-[var(--border-default)] bg-[var(--surface-primary)]/80 backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="flex items-center gap-2 group">
                            <Image
                                src="/License-Checker-Nepal-logo.png"
                                alt="Logo"
                                width={36}
                                height={36}
                                className="rounded-xl object-contain transition-transform group-hover:scale-105"
                            />
                            <div className="hidden min-[420px]:block">
                                <span className="text-xs font-extrabold tracking-tight text-[var(--text-primary)] block leading-tight">
                                    Nepal License Checker 🇳🇵
                                </span>
                                <span className="text-[10px] font-semibold text-[var(--text-secondary)] block">
                                    {language === 'ne' ? 'नागरिक ड्यासबोर्ड' : 'Citizen Dashboard'}
                                </span>
                            </div>
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Language Switch */}
                        <div className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setLanguage('en')}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                                    language === 'en' ? 'bg-[var(--nepal-blue)] text-white' : 'text-[var(--text-secondary)]'
                                }`}
                            >
                                EN
                            </button>
                            <button
                                type="button"
                                onClick={() => setLanguage('ne')}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${
                                    language === 'ne' ? 'bg-[var(--nepal-blue)] text-white' : 'text-[var(--text-secondary)]'
                                }`}
                            >
                                नेपाली
                            </button>
                        </div>

                        {/* Home Button */}
                        <Link
                            href="/"
                            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            <span>{language === 'ne' ? 'नयाँ खोजी' : 'Lookup'}</span>
                        </Link>

                        {/* Logout Button */}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            <span>{language === 'ne' ? 'बाहिरिनुहोस्' : 'Sign Out'}</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8 space-y-6">
                {/* User Greeting & Stats Banner */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-[var(--nepal-blue)] text-white font-extrabold text-xl shadow-xs shrink-0">
                            {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] truncate">
                                    {language === 'ne' ? 'नमस्ते,' : 'Namaste,'} {user.email.split('@')[0]}
                                </h1>
                                <span className="inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    {language === 'ne' ? 'सत्यापित खाता' : 'Verified'}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] truncate">{user.email}</p>
                        </div>
                    </div>

                    {/* Stats Tiles */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
                        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-2.5 text-center min-w-[75px] sm:min-w-[100px]">
                            <span className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                                {language === 'ne' ? 'कुल सेभ' : 'Total Saved'}
                            </span>
                            <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
                                {licenses.length}
                            </span>
                        </div>

                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-center min-w-[75px] sm:min-w-[100px]">
                            <span className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {language === 'ne' ? 'छापिएको' : 'Ready'}
                            </span>
                            <span className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                {readyCount}
                            </span>
                        </div>

                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-center min-w-[75px] sm:min-w-[100px]">
                            <span className="block text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                {language === 'ne' ? 'बाँकी' : 'Pending'}
                            </span>
                            <span className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400">
                                {pendingCount}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setActiveTab('support')}
                            className="rounded-xl border border-[var(--nepal-blue)]/20 bg-[var(--nepal-blue)]/5 p-2.5 text-center min-w-[75px] sm:min-w-[100px] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)]/10 cursor-pointer"
                            title="View all sent support messages"
                        >
                            <span className="block text-[11px] font-semibold text-[var(--nepal-blue)]">
                                {language === 'ne' ? 'मेरो सन्देशहरू' : 'Sent Messages'}
                            </span>
                            <span className="text-lg sm:text-xl font-extrabold text-[var(--nepal-blue)]">
                                {tickets.length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Tabs Bar */}
                <div className="flex border-b border-[var(--border-default)] gap-2 sm:gap-6 overflow-x-auto scrollbar-none">
                    <button
                        type="button"
                        onClick={() => setActiveTab('licenses')}
                        className={`flex items-center gap-2 pb-3 px-1 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                            activeTab === 'licenses'
                                ? 'border-[var(--nepal-blue)] text-[var(--nepal-blue)]'
                                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="16" rx="3" />
                            <circle cx="9" cy="10" r="2" />
                            <line x1="15" y1="8" x2="17" y2="8" />
                            <line x1="15" y1="12" x2="17" y2="12" />
                            <line x1="7" y1="16" x2="17" y2="16" />
                        </svg>
                        <span>{language === 'ne' ? 'मेरो र परिवारका लाइसेन्सहरू' : 'Family Licenses'}</span>
                        <span className="ml-0.5 rounded-full bg-[var(--bg-secondary)] px-2 py-0.2 text-[10px] font-bold">
                            {licenses.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('support')}
                        className={`flex items-center gap-2 pb-3 px-1 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                            activeTab === 'support'
                                ? 'border-[var(--nepal-blue)] text-[var(--nepal-blue)]'
                                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{language === 'ne' ? 'मेरो सन्देश तथा सोधपुछ' : 'My Sent Messages'}</span>
                        {tickets.length > 0 && (
                            <span className="ml-0.5 rounded-full bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] px-2 py-0.2 text-[10px] font-extrabold border border-[var(--nepal-blue)]/25">
                                {tickets.length}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-2 pb-3 px-1 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                            activeTab === 'security'
                                ? 'border-[var(--nepal-blue)] text-[var(--nepal-blue)]'
                                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>{language === 'ne' ? 'सुरक्षा तथा पासवर्ड' : 'Account & Security'}</span>
                    </button>
                </div>

                {/* TAB 1: SAVED FAMILY LICENSES */}
                {activeTab === 'licenses' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                                    {language === 'ne' ? 'परिवारका सुरक्षित लाइसेन्सहरू' : 'Saved Family Licenses'}
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    {language === 'ne'
                                        ? 'आफ्नो र परिवारका लाइसेन्सहरू यहाँ सुरक्षित राख्नुहोस् र अवस्था एकै ठाउँबाट जाँच्नुहोस्।'
                                        : 'Monitor license printing status for your entire family in one unified place.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsAddModalOpen(true)
                                    setAddModalError(null)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 cursor-pointer"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                <span>{language === 'ne' ? 'नयाँ लाइसेन्स थप्नुहोस्' : 'Add License'}</span>
                            </button>
                        </div>

                        {loadingLicenses ? (
                            <div className="flex justify-center py-12">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                            </div>
                        ) : licenses.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-primary)] p-8 text-center space-y-3">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] text-[var(--nepal-blue)]">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="4" width="18" height="16" rx="3" />
                                        <circle cx="9" cy="10" r="2" />
                                        <line x1="15" y1="8" x2="17" y2="8" />
                                        <line x1="15" y1="12" x2="17" y2="12" />
                                        <line x1="7" y1="16" x2="17" y2="16" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    {language === 'ne' ? 'कुनै लाइसेन्स सेभ गरिएको छैन' : 'No Saved Licenses Yet'}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                                    {language === 'ne'
                                        ? 'तपाईं वा तपाईंको परिवार (बुबा, आमा, भाइ, दिदी) को लाइसेन्स नम्बर थप्नुहोस् र सधैं ताजा स्थिति हेर्नुहोस्।'
                                        : 'Add your driving license or family members (father, mother, siblings) to track printing progress.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 cursor-pointer"
                                >
                                    <span>{language === 'ne' ? '+ पहिलो लाइसेन्स थप्नुहोस्' : '+ Add First License'}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {licenses.map((item) => {
                                    const isReady = item.status === 'ready'
                                    const isRefreshing = refreshingLicenseId === item.id

                                    return (
                                        <div
                                            key={item.id}
                                            className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between space-y-4"
                                        >
                                            <div>
                                                {/* Header row: Label & Status */}
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center rounded-lg bg-[var(--nepal-blue)]/10 px-2.5 py-1 text-xs font-extrabold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20">
                                                            🏷️ {item.label}
                                                        </span>
                                                        {item.holder_name && (
                                                            <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[150px]">
                                                                {item.holder_name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Status Badge */}
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold shrink-0 ${
                                                            isReady
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${
                                                                isReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                                            }`}
                                                        />
                                                        {isReady
                                                            ? language === 'ne'
                                                                ? 'छपाइ भइसकेको (Ready)'
                                                                : 'Ready to Collect'
                                                            : language === 'ne'
                                                            ? 'छपाइ हुन बाँकी (Pending)'
                                                            : 'Not Printed Yet'}
                                                    </span>
                                                </div>

                                                {/* License Number in Monospace */}
                                                <div className="font-mono text-lg font-extrabold text-[var(--text-primary)] tracking-wide">
                                                    {item.license_number}
                                                </div>

                                                {/* Office & Category meta */}
                                                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[var(--text-secondary)]">
                                                    {item.office && (
                                                        <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-0.5 font-medium">
                                                            🏢 {item.office}
                                                        </span>
                                                    )}
                                                    {item.category && (
                                                        <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-0.5 font-bold text-[var(--nepal-blue)]">
                                                            Category: {item.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between gap-2 text-xs">
                                                {/* Notification Toggle */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleNotification(item)}
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                                        item.notify_email
                                                            ? 'text-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10'
                                                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                                                    }`}
                                                    title="Toggle automatic email alerts"
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill={item.notify_email ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                                    </svg>
                                                    <span>{item.notify_email ? (language === 'ne' ? 'अलर्ट चालु' : 'Alert On') : (language === 'ne' ? 'अलर्ट बन्द' : 'Alert Off')}</span>
                                                </button>

                                                <div className="flex items-center gap-1">
                                                    {/* Quick Refresh Status */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRefreshStatus(item)}
                                                        disabled={isRefreshing}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-default)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                                                        title="Re-check status now"
                                                    >
                                                        <svg
                                                            width="12"
                                                            height="12"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            className={isRefreshing ? 'animate-spin' : ''}
                                                        >
                                                            <polyline points="23 4 23 10 17 10" />
                                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                                        </svg>
                                                        <span>{language === 'ne' ? 'जाँच' : 'Check'}</span>
                                                    </button>

                                                    {/* View on Homepage / Slip */}
                                                    <Link
                                                        href={`/?number=${encodeURIComponent(item.license_number)}`}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-default)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition text-[11px] font-semibold cursor-pointer"
                                                        title="View full lookup details & slip"
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                            <polyline points="15 3 21 3 21 9" />
                                                            <line x1="10" y1="14" x2="21" y2="3" />
                                                        </svg>
                                                        <span>{language === 'ne' ? 'स्लिप' : 'Slip'}</span>
                                                    </Link>

                                                    {/* Delete */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteLicense(item.id, item.license_number)}
                                                        className="inline-flex items-center p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                                        title="Delete from saved list"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

                        {/* Recent Support Messages & Inquiries Widget */}
                        <div className="mt-8 pt-6 border-t border-[var(--border-default)]">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <div>
                                    <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        <span>{language === 'ne' ? 'मेरो पठाइएका सन्देश तथा उजुरीहरू' : 'My Sent Messages & Inquiries'}</span>
                                        {tickets.length > 0 && (
                                            <span className="rounded-full bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] px-2 py-0.5 text-[10px] font-extrabold border border-[var(--nepal-blue)]/20">
                                                {tickets.length}
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {language === 'ne'
                                            ? 'तपाईंले यस इमेलबाट पठाउनुभएका सबै सन्देशहरू र सहायता टोलीको जवाफ यहाँ देखिन्छ।'
                                            : 'Inquiries sent from your email and resolution updates from our team.'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsNewTicketModalOpen(true)
                                            setTicketModalError(null)
                                            setTicketModalSuccess(null)
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        <span>{language === 'ne' ? 'नयाँ सन्देश' : 'New Message'}</span>
                                    </button>

                                    {tickets.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('support')}
                                            className="text-xs font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer flex items-center gap-1 px-1 py-1.5"
                                        >
                                            <span>{language === 'ne' ? 'सबै हेर्नुहोस् →' : 'View All →'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {tickets.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-primary)]/60 p-5 text-center space-y-2">
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {language === 'ne'
                                            ? 'तपाईंले अहिलेसम्म कुनै सहायता सन्देश पठाउनुभएको छैन। लाइसेन्स सम्बन्धी कुनै प्रश्न भए सिधै सोध्न सक्नुहुन्छ।'
                                            : 'You haven’t submitted any support inquiries yet. Need help with a license? Send our team a message.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {tickets.slice(0, 2).map((t) => {
                                        const cat = FEEDBACK_CATEGORIES.find((c) => c.id === t.category)
                                        const catLabel = language === 'ne' && cat?.labelNe ? cat.labelNe : cat?.label || t.category
                                        const isResolved = t.status === 'resolved'
                                        const isInProgress = t.status === 'in_progress'

                                        return (
                                            <div
                                                key={t.id}
                                                onClick={() => setActiveTab('support')}
                                                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 hover:border-[var(--nepal-blue)]/40 transition cursor-pointer space-y-2.5 shadow-2xs"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                                            isResolved
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                : isInProgress
                                                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                        }`}
                                                    >
                                                        {isResolved
                                                            ? (language === 'ne' ? '🟢 समाधान भयो' : '🟢 Resolved')
                                                            : isInProgress
                                                            ? (language === 'ne' ? '🔵 समीक्षा हुँदैछ' : '🔵 In Review')
                                                            : (language === 'ne' ? '🟡 प्राप्त भयो' : '🟡 Received')}
                                                    </span>
                                                    <span className="text-[11px] text-[var(--text-secondary)]">
                                                        {new Date(t.created_at).toLocaleDateString(language === 'ne' ? 'ne-NP' : 'en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </span>
                                                </div>

                                                <div>
                                                    <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">{t.subject}</h4>
                                                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5">
                                                        {t.message}
                                                    </p>
                                                </div>

                                                {t.admin_notes ? (
                                                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 font-medium line-clamp-1">
                                                        💬 {language === 'ne' ? 'जवाफ: ' : 'Reply: '}{t.admin_notes}
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-[var(--text-muted)] italic block">
                                                        {language === 'ne' ? 'सहायता टोलीको समीक्षा पर्खिँदै...' : 'Awaiting team review...'}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: MY SUPPORT & INQUIRIES */}
                {activeTab === 'support' && (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                                    {language === 'ne' ? 'मेरो पठाइएका सन्देश तथा उजुरीहरू' : 'My Sent Messages & Support History'}
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    {language === 'ne'
                                        ? 'यस इमेलबाट सम्पर्क पृष्ठ, सहायता पपअप वा ड्यासबोर्डबाट पठाइएका सबै उजुरी र सन्देशहरू यहाँ स्वतः उपलब्ध हुन्छन्।'
                                        : 'All inquiries submitted using your email (via contact page, popup, or dashboard) appear here automatically.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsNewTicketModalOpen(true)
                                    setTicketModalError(null)
                                    setTicketModalSuccess(null)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 cursor-pointer"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19" />
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                                <span>{language === 'ne' ? 'नयाँ प्रश्न / उजुरी पठाउनुहोस्' : 'New Inquiry'}</span>
                            </button>
                        </div>

                        {loadingTickets ? (
                            <div className="flex justify-center py-12">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-primary)] p-8 text-center space-y-3">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-secondary)] text-[var(--nepal-blue)]">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    {language === 'ne' ? 'कुनै सन्देश फेला परेन' : 'No Inquiries Found'}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
                                    {language === 'ne'
                                        ? 'लाइसेन्स नभेटिएको वा कुनै समस्या परेमा तपाईं सिधै यहाँबाट सहायता टोलीलाई सन्देश पठाउन सक्नुहुन्छ।'
                                        : 'If you have questions about your license or face any issue, you can send an inquiry directly to our support team.'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsNewTicketModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 cursor-pointer"
                                >
                                    <span>{language === 'ne' ? '+ सन्देश पठाउनुहोस्' : '+ Submit Inquiry'}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tickets.map((t) => {
                                    const cat = FEEDBACK_CATEGORIES.find((c) => c.id === t.category)
                                    const catLabel = language === 'ne' && cat?.labelNe ? cat.labelNe : cat?.label || t.category

                                    const isResolved = t.status === 'resolved'
                                    const isInProgress = t.status === 'in_progress'

                                    return (
                                        <div
                                            key={t.id}
                                            className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 shadow-xs space-y-4"
                                        >
                                            {/* Top Metadata Row */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-default)]/60 pb-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {/* Status Badge */}
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                                                            isResolved
                                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                                : isInProgress
                                                                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                                        }`}
                                                    >
                                                        {isResolved
                                                            ? language === 'ne'
                                                                ? '🟢 समाधान भयो (Resolved)'
                                                                : '🟢 Resolved'
                                                            : isInProgress
                                                            ? language === 'ne'
                                                                ? '🔵 समीक्षा हुँदैछ (In Progress)'
                                                                : '🔵 Under Review'
                                                            : language === 'ne'
                                                            ? '🟡 प्राप्त भयो (New)'
                                                            : '🟡 Received'}
                                                    </span>

                                                    <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                                                        {catLabel}
                                                    </span>

                                                    <span className="font-mono text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                                                        #{t.id.slice(0, 16)}
                                                    </span>
                                                </div>

                                                <span className="text-[11px] text-[var(--text-secondary)]">
                                                    {new Date(t.created_at).toLocaleString(
                                                        language === 'ne' ? 'ne-NP' : 'en-US',
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

                                            {/* User's Sent Message Box */}
                                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                            <circle cx="12" cy="7" r="4" />
                                                        </svg>
                                                        <span>{language === 'ne' ? 'तपाईंले पठाउनुभएको सन्देश:' : 'You sent:'}</span>
                                                    </span>

                                                    {t.license_number && (
                                                        <span className="font-mono text-xs font-bold text-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10 px-2 py-0.5 rounded border border-[var(--nepal-blue)]/20">
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

                                            {/* Admin Notes / Support Response */}
                                            {t.admin_notes ? (
                                                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 text-xs space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                        </svg>
                                                        <span>{language === 'ne' ? 'सहायता टोलीको जवाफ (Support Team Reply):' : 'Support Team Reply:'}</span>
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
                                                        {language === 'ne'
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
                    <div className="max-w-xl space-y-6">
                        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-sm space-y-4">
                            <div>
                                <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                                    {language === 'ne' ? 'खाता विवरण' : 'Account Details'}
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    {language === 'ne' ? 'तपाईंको दर्ता गरिएको इमेल र सुरक्षा विवरण।' : 'Your primary authenticated email.'}
                                </p>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between py-2 border-b border-[var(--border-default)]">
                                    <span className="font-semibold text-[var(--text-secondary)]">Email</span>
                                    <span className="font-bold text-[var(--text-primary)]">{user.email}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-[var(--border-default)]">
                                    <span className="font-semibold text-[var(--text-secondary)]">
                                        {language === 'ne' ? 'दर्ता मिति' : 'Member Since'}
                                    </span>
                                    <span className="font-medium text-[var(--text-primary)]">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2">
                                    <span className="font-semibold text-[var(--text-secondary)]">
                                        {language === 'ne' ? 'पासवर्ड स्थिति' : 'Password Status'}
                                    </span>
                                    <span className="font-bold text-[var(--nepal-blue)]">
                                        {user.has_password
                                            ? language === 'ne'
                                                ? 'पासवर्ड सुरक्षित गरिएको छ'
                                                : 'Permanent Password Active'
                                            : language === 'ne'
                                            ? '६-अङ्कको ओटीपी मात्र (पासवर्ड राखिएको छैन)'
                                            : 'Passwordless OTP Only'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Set / Change Password Form */}
                        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-sm space-y-4">
                            <div>
                                <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                                    {user.has_password
                                        ? language === 'ne'
                                            ? 'पासवर्ड परिवर्तन गर्नुहोस्'
                                            : 'Change Permanent Password'
                                        : language === 'ne'
                                        ? 'स्थायी पासवर्ड राख्नुहोस् (ऐच्छिक)'
                                        : 'Set Permanent Password (Optional)'}
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)]">
                                    {language === 'ne'
                                        ? 'पासवर्ड राखेपछि तपाईं ओटीपी वा पासवर्ड दुवैबाट लगइन गर्न सक्नुहुनेछ।'
                                        : 'Setting a password lets you sign in using either your password or 6-digit email OTP.'}
                                </p>
                            </div>

                            {passwordFeedback && (
                                <div
                                    className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                                        passwordFeedback.type === 'success'
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                    }`}
                                >
                                    <span>{passwordFeedback.message}</span>
                                </div>
                            )}

                            <form onSubmit={handleSavePassword} className="space-y-3 text-xs">
                                {user.has_password && (
                                    <div>
                                        <label className="block font-bold text-[var(--text-secondary)] mb-1">
                                            {language === 'ne' ? 'हालको पासवर्ड' : 'Current Password'}
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block font-bold text-[var(--text-secondary)] mb-1">
                                        {language === 'ne' ? 'नयाँ पासवर्ड (कम्तिमा ६ अक्षर)' : 'New Password (min 6 characters)'}
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-[var(--text-secondary)] mb-1">
                                        {language === 'ne' ? 'नयाँ पासवर्ड पुनः पुष्टि गर्नुहोस्' : 'Confirm New Password'}
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingPassword}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] py-2.5 px-4 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {savingPassword ? (
                                        <span>{language === 'ne' ? 'सुरक्षित गर्दै...' : 'Saving...'}</span>
                                    ) : (
                                        <span>
                                            {user.has_password
                                                ? language === 'ne'
                                                    ? 'पासवर्ड अद्यावधिक गर्नुहोस्'
                                                    : 'Update Password'
                                                : language === 'ne'
                                                ? 'पासवर्ड सुरक्षित गर्नुहोस्'
                                                : 'Save Password'}
                                        </span>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* ADD LICENSE MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                                {language === 'ne' ? 'नयाँ लाइसेन्स थप्नुहोस्' : 'Add New License'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="rounded-lg p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {addModalError && (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                {addModalError}
                            </div>
                        )}

                        <form onSubmit={handleAddLicense} className="space-y-4 text-xs">
                            {/* Label / Role with quick chips */}
                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider text-[10px]">
                                    {language === 'ne' ? 'लाइसेन्स कसको हो? (उपनाम/लेबल)' : 'Who owns this license? (Nickname / Label)'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                    placeholder="e.g. Father, Mother, My Car"
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none"
                                />

                                {/* Suggestion chips */}
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {['Mine', 'Father', 'Mother', 'Brother', 'Sister', 'Spouse'].map((chip) => (
                                        <button
                                            type="button"
                                            key={chip}
                                            onClick={() => setNewLabel(chip)}
                                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                                                newLabel.toLowerCase() === chip.toLowerCase()
                                                    ? 'bg-[var(--nepal-blue)] text-white'
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
                                    {language === 'ne' ? 'लाइसेन्स नम्बर (XX-XX-XXXXXXXX)' : 'License Number (XX-XX-XXXXXXXX)'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newNumber}
                                    onChange={(e) => setNewNumber(formatLicenseInput(e.target.value))}
                                    placeholder="01-06-12345678"
                                    className="w-full font-mono font-bold tracking-wider rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none"
                                />
                                <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                                    {language === 'ne'
                                        ? 'अंग्रेजी वा नेपाली अङ्क (०-९) दुवै चल्छ।'
                                        : 'Accepts both English and Nepali numerals.'}
                                </p>
                            </div>

                            {/* Notify Toggle */}
                            <label className="flex items-center gap-2 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={newNotify}
                                    onChange={(e) => setNewNotify(e.target.checked)}
                                    className="h-4 w-4 rounded accent-[var(--nepal-blue)]"
                                />
                                <span className="text-[11px] font-medium text-[var(--text-primary)]">
                                    {language === 'ne'
                                        ? 'लाइसेन्स छापिएपछि मलाई इमेलमा तुरुन्त जानकारी दिनुहोस्'
                                        : 'Send me an automatic email alert when DoTM prints this license'}
                                </span>
                            </label>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                                >
                                    {language === 'ne' ? 'रद्द गर्नुहोस्' : 'Cancel'}
                                </button>

                                <button
                                    type="submit"
                                    disabled={addingLicense || !newNumber}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {addingLicense ? (
                                        <span>{language === 'ne' ? 'सेभ गर्दै...' : 'Saving...'}</span>
                                    ) : (
                                        <span>{language === 'ne' ? 'सेभ गर्नुहोस्' : 'Save to Dashboard'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* NEW SUPPORT INQUIRY MODAL */}
            {isNewTicketModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
                    <div className="w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                                {language === 'ne' ? 'नयाँ सोधपुछ वा उजुरी पठाउनुहोस्' : 'Submit Support Inquiry'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setIsNewTicketModalOpen(false)}
                                className="rounded-lg p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {ticketModalError && (
                            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                {ticketModalError}
                            </div>
                        )}

                        {ticketModalSuccess && (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {ticketModalSuccess}
                            </div>
                        )}

                        <form onSubmit={handleSubmitTicket} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1">
                                    {language === 'ne' ? 'विषयको विधा' : 'Category'}
                                </label>
                                <select
                                    value={ticketCategory}
                                    onChange={(e) => setTicketCategory(e.target.value)}
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none"
                                >
                                    {FEEDBACK_CATEGORIES.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {language === 'ne' && c.labelNe ? c.labelNe : c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Optional Attached License selection from family vault */}
                            {licenses.length > 0 && (
                                <div>
                                    <label className="block font-bold text-[var(--text-secondary)] mb-1">
                                        {language === 'ne' ? 'सम्बन्धित लाइसेन्स (ऐच्छिक)' : 'Related License (Optional)'}
                                    </label>
                                    <select
                                        value={ticketLicense}
                                        onChange={(e) => setTicketLicense(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none"
                                    >
                                        <option value="">{language === 'ne' ? '-- कुनै लाइसेन्स छान्नुहोस् --' : '-- Select a saved license --'}</option>
                                        {licenses.map((lic) => (
                                            <option key={lic.id} value={lic.license_number}>
                                                {lic.label} ({lic.license_number})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1">
                                    {language === 'ne' ? 'शीर्षक' : 'Subject'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={ticketSubject}
                                    onChange={(e) => setTicketSubject(e.target.value)}
                                    placeholder="e.g. License not showing or card collection inquiry"
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-[var(--text-secondary)] mb-1">
                                    {language === 'ne' ? 'तपाईंको सन्देश वा समस्याको विवरण' : 'Message / Details'}
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    value={ticketMessage}
                                    onChange={(e) => setTicketMessage(e.target.value)}
                                    placeholder={
                                        language === 'ne'
                                            ? 'तपाईंको प्रश्न वा समस्या यहाँ विस्तृत रूपमा लेख्नुहोस्...'
                                            : 'Please describe your inquiry or problem in detail...'
                                    }
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsNewTicketModalOpen(false)}
                                    className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                                >
                                    {language === 'ne' ? 'रद्द' : 'Cancel'}
                                </button>

                                <button
                                    type="submit"
                                    disabled={submittingTicket || !ticketMessage.trim()}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {submittingTicket ? (
                                        <span>{language === 'ne' ? 'पठाउँदै...' : 'Submitting...'}</span>
                                    ) : (
                                        <span>{language === 'ne' ? 'पठाउनुहोस्' : 'Submit Inquiry'}</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}
