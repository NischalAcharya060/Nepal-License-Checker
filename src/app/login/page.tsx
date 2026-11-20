// src/app/login/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const [checkingAuth, setCheckingAuth] = useState(true)

    // Language state
    const [language, setLanguage] = useState<'en' | 'ne'>('en')

    // Mode: 'password' (Sign In) | 'otp' (Create Account / One-Time Code)
    const [mode, setMode] = useState<'password' | 'otp'>('password')

    // OTP Flow State: 'email' | 'code'
    const [otpStep, setOtpStep] = useState<'email' | 'code'>('email')

    // Form inputs
    const [email, setEmail] = useState('')
    const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // UI feedback
    const [submitting, setSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    // Resend countdown
    const [cooldown, setCooldown] = useState(0)

    const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])

    // Detect language and mode from URL or local storage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const urlLang = params.get('lang')
            const urlMode = params.get('mode')
            const urlTab = params.get('tab')

            const savedLang = localStorage.getItem('nlc_language')
            const targetLang = (urlLang === 'ne' || urlLang === 'en')
                ? urlLang
                : (savedLang === 'ne' || savedLang === 'en' ? savedLang : null)

            const targetMode = (urlMode === 'otp' || urlTab === 'signup' || urlTab === 'register')
                ? 'otp'
                : (urlMode === 'password' || urlTab === 'signin' || urlTab === 'login' ? 'password' : null)

            queueMicrotask(() => {
                if (targetLang) setLanguage(targetLang)
                if (targetMode) setMode(targetMode)
            })
        }
    }, [])

    // Check if user is already logged in
    useEffect(() => {
        let isMounted = true
        fetch('/api/user/auth/me')
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!isMounted) return
                if (data?.authenticated) {
                    router.replace('/dashboard')
                } else {
                    setCheckingAuth(false)
                }
            })
            .catch(() => {
                if (isMounted) setCheckingAuth(false)
            })

        return () => {
            isMounted = false
        }
    }, [router])

    // Cooldown timer effect
    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setInterval(() => {
            setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(timer)
    }, [cooldown])

    const switchMode = (newMode: 'password' | 'otp') => {
        setMode(newMode)
        setErrorMsg(null)
        setSuccessMsg(null)
        if (newMode === 'otp') {
            setOtpStep('email')
        }
    }

    // Handle Request OTP (Sign up / Instant Code)
    const handleRequestOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setErrorMsg(null)
        setSuccessMsg(null)

        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            setErrorMsg(language === 'ne' ? 'कृपया मान्य इमेल ठेगाना प्रविष्ट गर्नुहोस्।' : 'Please enter a valid email address.')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/user/auth/otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail }),
            })
            const data = await res.json()

            if (!res.ok) {
                setErrorMsg(data.error || (language === 'ne' ? 'कोड पठाउन सकिएन।' : 'Failed to send verification code.'))
            } else {
                setOtpStep('code')
                setCooldown(60)
                setSuccessMsg(language === 'ne' ? '६-अङ्कको कोड तपाईंको इमेलमा पठाइयो!' : 'A 6-digit code has been sent to your email!')
                setTimeout(() => {
                    codeInputRefs.current[0]?.focus()
                }, 100)
            }
        } catch {
            setErrorMsg(language === 'ne' ? 'इन्टरनेट वा सर्भर समस्या। पुनः प्रयास गर्नुहोस्।' : 'Network error. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // Handle Verify OTP
    const handleVerifyOtp = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        setErrorMsg(null)
        setSuccessMsg(null)

        const code = otpCode.join('').trim()
        if (code.length !== 6) {
            setErrorMsg(language === 'ne' ? 'कृपया पूर्ण ६-अङ्कको कोड प्रविष्ट गर्नुहोस्।' : 'Please enter all 6 digits of the code.')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/user/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }),
            })
            const data = await res.json()

            if (!res.ok) {
                setErrorMsg(data.error || (language === 'ne' ? 'कोड मिलेन वा म्याद सकियो।' : 'Invalid or expired code.'))
            } else {
                setSuccessMsg(language === 'ne' ? 'सफलतापूर्वक प्रमाणीकरण भयो! ड्यासबोर्डमा जाँदैछ...' : 'Verified successfully! Redirecting to dashboard...')
                setTimeout(() => {
                    router.push('/dashboard')
                }, 400)
            }
        } catch {
            setErrorMsg(language === 'ne' ? 'सर्भर समस्या। पुनः प्रयास गर्नुहोस्।' : 'Server error. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // Handle Password Login
    const handlePasswordLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg(null)
        setSuccessMsg(null)

        const cleanEmail = email.trim().toLowerCase()
        if (!cleanEmail || !password) {
            setErrorMsg(language === 'ne' ? 'इमेल र पासवर्ड दुवै आवश्यक छन्।' : 'Both email and password are required.')
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/user/auth/login-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: cleanEmail, password }),
            })
            const data = await res.json()

            if (!res.ok) {
                setErrorMsg(data.error || (language === 'ne' ? 'लगइन असफल भयो।' : 'Login failed.'))
            } else {
                setSuccessMsg(language === 'ne' ? 'लगइन सफल! ड्यासबोर्ड खोल्दै...' : 'Login successful! Redirecting...')
                setTimeout(() => {
                    router.push('/dashboard')
                }, 400)
            }
        } catch {
            setErrorMsg(language === 'ne' ? 'सर्भर समस्या। पुनः प्रयास गर्नुहोस्।' : 'Network error. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // Handle single digit input change
    const handleOtpChange = (index: number, val: string) => {
        const char = val.replace(/\D/g, '').slice(-1)
        const updated = [...otpCode]
        updated[index] = char
        setOtpCode(updated)

        if (char && index < 5) {
            codeInputRefs.current[index + 1]?.focus()
        }

        // Auto verify when all 6 digits entered
        if (char && index === 5 && updated.every((d) => d.length === 1)) {
            setTimeout(() => {
                const fullCode = updated.join('')
                if (fullCode.length === 6) {
                    verifyWithCode(fullCode)
                }
            }, 50)
        }
    }

    const verifyWithCode = async (code: string) => {
        setErrorMsg(null)
        setSubmitting(true)
        try {
            const res = await fetch('/api/user/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim().toLowerCase(), otp: code }),
            })
            const data = await res.json()
            if (!res.ok) {
                setErrorMsg(data.error || 'Invalid code.')
            } else {
                setSuccessMsg(language === 'ne' ? 'सफलतापूर्वक प्रमाणीकरण भयो!' : 'Successfully verified! Loading dashboard...')
                setTimeout(() => router.push('/dashboard'), 400)
            }
        } catch {
            setErrorMsg('Network error.')
        } finally {
            setSubmitting(false)
        }
    }

    // Handle Paste into OTP inputs
    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (!pasted) return

        const updated = [...otpCode]
        for (let i = 0; i < 6; i++) {
            updated[i] = pasted[i] || ''
        }
        setOtpCode(updated)

        if (pasted.length === 6) {
            codeInputRefs.current[5]?.focus()
            verifyWithCode(pasted)
        } else {
            const nextEmpty = updated.findIndex((d) => !d)
            if (nextEmpty !== -1) {
                codeInputRefs.current[nextEmpty]?.focus()
            }
        }
    }

    // Handle Backspace navigation
    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
            codeInputRefs.current[index - 1]?.focus()
        }
    }

    if (checkingAuth) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--nepal-blue)] border-t-transparent" />
                    <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        {language === 'ne' ? 'जाँच गर्दैछ...' : 'Checking session...'}
                    </span>
                </div>
            </main>
        )
    }

    const isNe = language === 'ne'

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-3 py-6 sm:px-4 sm:py-10 text-[var(--text-primary)] transition-colors">
            <div className="w-full max-w-4xl lg:max-w-5xl space-y-3.5 sm:space-y-4">
                {/* Header Navigation & Language Switch */}
                <div className="flex items-center justify-between px-1">
                    <Link
                        href="/"
                        className="inline-flex min-h-[40px] items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        <span>{isNe ? 'गृहपृष्ठमा फर्कनुहोस्' : 'Back to Home'}</span>
                    </Link>

                    {/* Language Switch */}
                    <div className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] p-0.5 text-xs shadow-2xs">
                        <button
                            type="button"
                            onClick={() => setLanguage('en')}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                                language === 'en' ? 'bg-[var(--nepal-blue)] text-white' : 'text-[var(--text-secondary)]'
                            }`}
                        >
                            EN
                        </button>
                        <button
                            type="button"
                            onClick={() => setLanguage('ne')}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                                language === 'ne' ? 'bg-[var(--nepal-blue)] text-white' : 'text-[var(--text-secondary)]'
                            }`}
                        >
                            नेपाली
                        </button>
                    </div>
                </div>

                {/* Wide 2-Column Authentication Card (Matches media_1795181957762_eafbd416.jpg) */}
                <div className="rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] dev-glass-card shadow-xl sm:shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
                    {/* Left Panel: Desktop Showcase Only (Hidden on mobile to eliminate clutter) */}
                    <div className="hidden md:flex md:col-span-5 p-7 lg:p-10 bg-gradient-to-br from-[var(--nepal-blue)]/10 via-[var(--bg-secondary)]/40 to-transparent flex-col justify-between space-y-6">
                        <div>
                            {/* Logo & Platform Name */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-primary)] p-1.5 border border-[var(--border-default)] shadow-xs">
                                    <Image
                                        src="/License-Checker-Nepal-logo.png"
                                        alt="Nepal License Checker"
                                        width={36}
                                        height={36}
                                        className="rounded-lg object-contain"
                                        priority
                                    />
                                </div>
                                <div>
                                    <span className="text-sm font-extrabold tracking-tight text-[var(--text-primary)] block leading-tight">
                                        Nepal License Checker
                                    </span>
                                    <span className="text-[11px] font-semibold text-[var(--nepal-blue)] block">
                                        {isNe ? 'नागरिक खाता पोर्टल' : 'Citizen Portal'}
                                    </span>
                                </div>
                            </div>

                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--nepal-blue)]/20 bg-[var(--nepal-blue)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--nepal-blue)] mb-3">
                                {isNe ? 'पारिवारिक लाइसेन्स भल्ट' : 'Family License Vault'}
                            </span>

                            <h2 className="text-xl lg:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] leading-snug">
                                {isNe
                                    ? 'आफ्नो र परिवारका लाइसेन्सहरू एकै ठाउँमा सुरक्षित राख्नुहोस्'
                                    : 'Manage & track driving licenses for your entire family.'}
                            </h2>

                            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                                {isNe
                                    ? 'बुबा, आमा वा आफ्नै स्मार्ट कार्डको छपाइ अवस्था, सूचनाहरू र सोधपुछहरू सुरक्षित रूपमा अनुगमन गर्नुहोस्।'
                                    : 'Real-time print verification, automated status alerts, and inquiry tracking in one unified place.'}
                            </p>

                            {/* Key Highlights */}
                            <div className="mt-7 space-y-4 text-xs">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] mt-0.5">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="16" rx="3" />
                                            <circle cx="9" cy="10" r="2" />
                                            <line x1="15" y1="8" x2="17" y2="8" />
                                            <line x1="15" y1="12" x2="17" y2="12" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-[var(--text-primary)]">
                                            {isNe ? 'बहु-लाइसेन्स ट्र्याकिङ' : 'Multi-License Tracker'}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-secondary)]">
                                            {isNe ? 'परिवारका सदस्यहरूको नाममा कार्ड सेभ गर्नुहोस्।' : 'Save father, mother, or personal license numbers.'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-[var(--text-primary)]">
                                            {isNe ? 'छपाइ अलर्ट तथा सूचना' : 'Print Readiness Alerts'}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-secondary)]">
                                            {isNe ? 'कार्ड छापिएर कार्यालय पुग्दा तुरुन्तै जानकारी।' : 'Get notified as soon as DOTM finishes printing.'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 mt-0.5">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="font-bold text-[var(--text-primary)]">
                                            {isNe ? 'सोधपुछ तथा जवाफ इतिहास' : 'Unified Inquiries'}
                                        </div>
                                        <div className="text-[11px] text-[var(--text-secondary)]">
                                            {isNe ? 'पठाइएका प्रश्न र व्यवस्थापकका जवाफहरू प्रत्यक्ष हेर्नुहोस्।' : 'View all sent support messages and team replies.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Authentication Form */}
                    <div className="col-span-1 md:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
                        <div>
                            {/* Mobile Compact Branding Header (Only visible on small devices) */}
                            <div className="flex md:hidden items-center gap-2.5 mb-4 pb-3.5 border-b border-[var(--border-default)]">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-primary)] p-1 border border-[var(--border-default)] shadow-xs">
                                    <Image
                                        src="/License-Checker-Nepal-logo.png"
                                        alt="Nepal License Checker"
                                        width={28}
                                        height={28}
                                        className="rounded-md object-contain"
                                        priority
                                    />
                                </div>
                                <div>
                                    <span className="text-xs font-extrabold tracking-tight text-[var(--text-primary)] block leading-tight">
                                        Nepal License Checker
                                    </span>
                                    <span className="text-[10px] font-semibold text-[var(--nepal-blue)] block">
                                        {isNe ? 'नागरिक खाता' : 'Citizen Account'}
                                    </span>
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="mb-5 sm:mb-6">
                                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                                    {mode === 'password'
                                        ? (isNe ? 'आफ्नो खातामा लगइन गर्नुहोस्' : 'Sign in to your account')
                                        : (isNe ? 'नयाँ खाता खोल्नुहोस्' : 'Create an account')}
                                </h1>
                                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    {mode === 'password'
                                        ? (isNe ? 'आफ्नो ड्यासबोर्डमा पहुँच पाउन इमेल र पासवर्ड प्रविष्ट गर्नुहोस्।' : 'Enter your email and password to access your dashboard.')
                                        : (isNe ? 'सुरु गर्न आफ्नो इमेल प्रविष्ट गर्नुहोस्। ६-अङ्कको कोडबाट छिटो पहुँच पाउनुहोस्।' : 'Enter your email to get instant access with a 6-digit code.')}
                                </p>
                            </div>

                            {/* Segmented Auth Mode Switcher */}
                            <div className="grid grid-cols-2 rounded-xl bg-[var(--bg-secondary)] p-1 border border-[var(--border-default)] mb-5 sm:mb-6 text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => switchMode('password')}
                                    className={`rounded-lg py-2.5 sm:py-2 transition-all cursor-pointer ${
                                        mode === 'password'
                                            ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs font-bold'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    {isNe ? 'लगइन (Sign In)' : 'Sign In'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => switchMode('otp')}
                                    className={`rounded-lg py-2.5 sm:py-2 transition-all cursor-pointer ${
                                        mode === 'otp'
                                            ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs font-bold'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                >
                                    {isNe ? 'दर्ता (Sign Up)' : 'Create Account'}
                                </button>
                            </div>

                            {/* Feedback Messages */}
                            {errorMsg && (
                                <div className="mb-4 sm:mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-start gap-2">
                                    <svg className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {successMsg && (
                                <div className="mb-4 sm:mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                                    <svg className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>{successMsg}</span>
                                </div>
                            )}

                            {/* Tab 1: Password Login View */}
                            {mode === 'password' && (
                                <form onSubmit={handlePasswordLogin} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                                            {isNe ? 'इमेल ठेगाना' : 'Email Address'}
                                        </label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect width="20" height="16" x="2" y="4" rx="2" />
                                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                </svg>
                                            </div>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-10 pr-4 py-3 sm:py-2.5 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--nepal-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 transition"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                                {isNe ? 'पासवर्ड' : 'Password'}
                                            </label>
                                        </div>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                </svg>
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-10 pr-11 py-3 sm:py-2.5 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--nepal-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                                        <line x1="2" x2="22" y1="2" y2="22" />
                                                    </svg>
                                                ) : (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting || !email.trim() || !password}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] min-h-[46px] sm:min-h-[42px] py-3 sm:py-2.5 px-4 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                <span>{isNe ? 'लगइन गर्दै...' : 'Signing In...'}</span>
                                            </>
                                        ) : (
                                            <span>{isNe ? 'लगइन गर्नुहोस्' : 'Sign In'}</span>
                                        )}
                                    </button>

                                    {/* Link: Don't have an account? Create one */}
                                    <p className="text-center text-xs text-[var(--text-secondary)] mt-4 pt-3.5 border-t border-[var(--border-default)]/70">
                                        {isNe ? 'खाता छैन? ' : "Don't have an account? "}
                                        <button
                                            type="button"
                                            onClick={() => switchMode('otp')}
                                            className="font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                        >
                                            {isNe ? 'दर्ता गर्नुहोस्' : 'Create one'}
                                        </button>
                                    </p>
                                </form>
                            )}

                            {/* Tab 2: Create Account / OTP Access View */}
                            {mode === 'otp' && (
                                <div>
                                    {otpStep === 'email' ? (
                                        <form onSubmit={handleRequestOtp} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                                                    {isNe ? 'तपाईंको इमेल ठेगाना' : 'Your Email Address'}
                                                </label>
                                                <div className="relative">
                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <rect width="20" height="16" x="2" y="4" rx="2" />
                                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                        </svg>
                                                    </div>
                                                    <input
                                                        type="email"
                                                        required
                                                        autoFocus
                                                        value={email}
                                                        onChange={(e) => setEmail(e.target.value)}
                                                        placeholder="name@example.com"
                                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] pl-10 pr-4 py-3 sm:py-2.5 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:border-[var(--nepal-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 transition"
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={submitting || !email.trim()}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] min-h-[46px] sm:min-h-[42px] py-3 sm:py-2.5 px-4 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                        <span>{isNe ? 'कोड पठाउँदैछ...' : 'Sending Code...'}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="22" y1="2" x2="11" y2="13" />
                                                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                        </svg>
                                                        <span>{isNe ? '६-अङ्कको कोड पठाउनुहोस्' : 'Send 6-Digit Code'}</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Link: Already have an account? Sign in */}
                                            <p className="text-center text-xs text-[var(--text-secondary)] mt-4 pt-3.5 border-t border-[var(--border-default)]/70">
                                                {isNe ? 'पहिले नै खाता छ? ' : 'Already have an account? '}
                                                <button
                                                    type="button"
                                                    onClick={() => switchMode('password')}
                                                    className="font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                                >
                                                    {isNe ? 'लगइन गर्नुहोस्' : 'Sign in'}
                                                </button>
                                            </p>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleVerifyOtp} className="space-y-4 sm:space-y-5">
                                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 p-3 flex items-center justify-between text-xs">
                                                <div className="truncate pr-2">
                                                    <span className="text-[var(--text-secondary)] block text-[10px] uppercase font-bold">
                                                        {isNe ? 'कोड पठाइएको इमेल' : 'Code sent to'}
                                                    </span>
                                                    <span className="font-bold text-[var(--text-primary)] truncate block">{email}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOtpStep('email')
                                                        setErrorMsg(null)
                                                        setSuccessMsg(null)
                                                    }}
                                                    className="shrink-0 text-[11px] font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                                >
                                                    {isNe ? 'परिवर्तन' : 'Change'}
                                                </button>
                                            </div>

                                            {/* 6 Digit Input Boxes */}
                                            <div>
                                                <label className="block text-center text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2.5">
                                                    {isNe ? '६-अङ्कको कोड प्रविष्ट गर्नुहोस्' : 'Enter 6-Digit Code'}
                                                </label>
                                                <div className="flex justify-center gap-1.5 min-[380px]:gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                                                    {otpCode.map((digit, idx) => (
                                                        <input
                                                            key={idx}
                                                            ref={(el) => {
                                                                codeInputRefs.current[idx] = el
                                                            }}
                                                            type="text"
                                                            inputMode="numeric"
                                                            autoComplete="one-time-code"
                                                            maxLength={1}
                                                            value={digit}
                                                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                                                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                                            className="h-11 w-9.5 min-[380px]:h-12 min-[380px]:w-11 sm:h-13 sm:w-12 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] text-center font-mono text-lg sm:text-2xl font-extrabold text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 transition"
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={submitting || otpCode.some((d) => !d)}
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] min-h-[46px] sm:min-h-[42px] py-3 sm:py-2.5 px-4 text-sm font-bold text-white shadow-md transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                        <span>{isNe ? 'प्रमाणीकरण गर्दै...' : 'Verifying...'}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                                        </svg>
                                                        <span>{isNe ? 'प्रमाणीकरण गरी अघि बढ्नुहोस्' : 'Verify & Continue'}</span>
                                                    </>
                                                )}
                                            </button>

                                            {/* Resend Option */}
                                            <div className="text-center pt-1">
                                                {cooldown > 0 ? (
                                                    <span className="text-xs text-[var(--text-secondary)]">
                                                        {isNe
                                                            ? `नयाँ कोड पुनः पठाउन (${cooldown} सेकेन्ड बाँकी)`
                                                            : `Resend code in ${cooldown}s`}
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRequestOtp()}
                                                        disabled={submitting}
                                                        className="text-xs font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                                    >
                                                        {isNe ? 'नयाँ कोड पुनः पठाउनुहोस्' : "Didn't receive code? Resend Code"}
                                                    </button>
                                                )}
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Optional Notice Note - Centered across the full width below the card */}
                <div className="flex items-center justify-center gap-2 text-center text-xs text-[var(--text-secondary)] px-4">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--text-muted)]">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                        {isNe
                            ? 'खाता खोल्नु ऐच्छिक हो। तपाईं खाता बिना पनि गृहपृष्ठबाट लाइसेन्स जाँच गर्न सक्नुहुन्छ।'
                            : 'Account is optional. You can always check licenses as a guest on the home page.'}
                    </span>
                </div>
            </div>
        </main>
    )
}
