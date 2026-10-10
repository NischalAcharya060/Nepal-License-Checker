'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import toast, { Toaster } from 'react-hot-toast'
import { translations, type Language } from '@/lib/i18n'
import { formatLicenseNumber } from '@/utils/validation'
import { sanitizeInput } from '@/utils/sanitize'

interface SubscriptionData {
  licenseNumber: string
  maskedEmail: string
  subscriptionStatus: 'pending' | 'sent' | 'cancelled' | 'processing'
  createdAt: number
}

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en'
    const saved = window.localStorage.getItem('ui-language')
    return saved === 'ne' || saved === 'en' ? saved : 'en'
  })

  const [loading, setLoading] = useState(Boolean(token))
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Manual form state
  const [manualLicense, setManualLicense] = useState('')
  const [manualEmail, setManualEmail] = useState('')

  const copy = translations[language].unsubscribe

  useEffect(() => {
    if (!token) return

    let isMounted = true
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/notifications/status?token=${encodeURIComponent(token)}`)
        const result = await res.json()

        if (!isMounted) return

        if (res.ok && result.data) {
          setData(result.data)
          if (result.data.subscriptionStatus === 'cancelled') {
            setIsCancelled(true)
          }
        } else {
          setErrorMessage(result.error || copy.notFoundError)
        }
      } catch {
        if (isMounted) setErrorMessage('Failed to load notification details.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchStatus()
    return () => {
      isMounted = false
    }
  }, [token, copy.notFoundError])

  const handleCancelByToken = async () => {
    if (!token) return
    setIsCancelling(true)

    try {
      const res = await fetch('/api/notifications/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const result = await res.json()

      if (res.ok && (result.status === 'success' || result.status === 'already_cancelled')) {
        setIsCancelled(true)
        toast.success(result.message || copy.cancelledTitle)
      } else {
        toast.error(result.error || result.message || 'Failed to cancel')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleManualCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanLic = formatLicenseNumber(sanitizeInput(manualLicense).toUpperCase())
    const cleanMail = manualEmail.trim().toLowerCase()

    if (!cleanLic || !cleanMail) {
      toast.error(copy.invalidInputError)
      return
    }

    setIsCancelling(true)
    try {
      const res = await fetch('/api/notifications/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseNumber: cleanLic,
          email: cleanMail,
        }),
      })
      const result = await res.json()

      if (res.ok && result.status === 'success') {
        setIsCancelled(true)
        setData({
          licenseNumber: cleanLic,
          maskedEmail: cleanMail,
          subscriptionStatus: 'cancelled',
          createdAt: Date.now(),
        })
        toast.success(result.message || copy.cancelledTitle)
      } else {
        toast.error(result.error || result.message || copy.notFoundError)
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-14">
      {/* Language toggle */}
      <div className="mb-6 flex justify-end">
        <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`rounded-lg px-2.5 py-1 font-bold transition ${language === 'en' ? 'bg-[var(--nepal-blue)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ne')}
            className={`rounded-lg px-2.5 py-1 font-bold transition ${language === 'ne' ? 'bg-[var(--nepal-blue)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            नेपाली
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-[var(--nepal-blue)] to-[#001f52] px-6 py-6 text-white text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Image
              src="/License-Checker-Nepal-logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="object-contain"
            />
          </div>
          <h1 className="text-xl font-extrabold sm:text-2xl">{copy.pageTitle}</h1>
          <p className="mt-1 text-xs text-white/80 sm:text-sm">{copy.pageSubtitle}</p>
        </div>

        <div className="p-6 sm:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <svg className="h-8 w-8 animate-spin text-[var(--nepal-blue)]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">Loading notification status...</p>
            </div>
          ) : isCancelled ? (
            /* 1. Cancelled State */
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {copy.cancelledTitle}
                </h2>
                <p className="mt-1 text-xs leading-6 text-[var(--text-secondary)] sm:text-sm">
                  {copy.cancelledDescription.replace('{licenseNumber}', data?.licenseNumber || manualLicense || '')}
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-mid)]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>{copy.backHomeButton}</span>
                </Link>
              </div>
            </div>
          ) : token && data ? (
            /* 2. Token Found & Active State */
            <div className="space-y-5">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 sm:p-5">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-muted)]">
                  {copy.tokenLookupTitle}
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between border-b border-[var(--border-default)]/60 pb-2">
                    <span className="text-[var(--text-secondary)]">{copy.licenseLabel}:</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">{data.licenseNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-default)]/60 pb-2">
                    <span className="text-[var(--text-secondary)]">{copy.emailLabel}:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{data.maskedEmail}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-[var(--text-secondary)]">Status:</span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-[var(--nepal-blue)]">
                      <span className="h-2 w-2 rounded-full bg-[var(--nepal-blue)] animate-pulse" />
                      <span>Active (Waiting for DoTM data)</span>
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)]">
                {copy.tokenLookupDescription}
              </p>

              <button
                type="button"
                onClick={handleCancelByToken}
                disabled={isCancelling}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--error)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#b91c1c] disabled:opacity-60"
              >
                {isCancelling ? copy.cancellingButton : copy.cancelButton}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--nepal-blue)] hover:underline"
                >
                  ← {copy.backHomeButton}
                </Link>
              </div>
            </div>
          ) : (
            /* 3. Manual Entry Fallback */
            <div className="space-y-5">
              {errorMessage && (
                <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3.5 text-xs text-[var(--error)]">
                  {errorMessage}
                </div>
              )}

              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  {copy.manualTitle}
                </h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {copy.manualDescription}
                </p>
              </div>

              <form onSubmit={handleManualCancel} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {copy.licenseLabel}
                  </label>
                  <input
                    type="text"
                    value={manualLicense}
                    onChange={(e) => setManualLicense(formatLicenseNumber(e.target.value))}
                    placeholder="01-01-12345678"
                    maxLength={14}
                    required
                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 font-mono text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {copy.emailLabel}
                  </label>
                  <input
                    type="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCancelling}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--error)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#b91c1c] disabled:opacity-60"
                >
                  {isCancelling ? copy.cancellingButton : copy.manualCancelButton}
                </button>
              </form>

              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--nepal-blue)] hover:underline"
                >
                  ← {copy.backHomeButton}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <Toaster position="top-center" />
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-secondary)]">
            Loading...
          </div>
        }
      >
        <UnsubscribeContent />
      </Suspense>
    </main>
  )
}
