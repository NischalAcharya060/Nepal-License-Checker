'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { formatNepalDateTime, formatTimeUntil } from '@/lib/cronHelper'
import type { NotificationCopy } from '@/lib/i18n'
import type { LicenseData } from '@/app/page'

interface LicenseNotificationCardProps {
  licenseNumber: string
  copy: NotificationCopy
  language?: 'en' | 'ne'
  nextScraperRun?: string | null
  onFoundExisting?: (license: LicenseData) => void
}

export default function LicenseNotificationCard({
  licenseNumber,
  copy,
  language = 'en',
  nextScraperRun,
  onFoundExisting,
}: LicenseNotificationCardProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscribedEmail, setSubscribedEmail] = useState('')
  const [unsubscribeToken, setUnsubscribeToken] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)

  // Format next sync date and relative time
  const formattedNextRun = nextScraperRun
    ? formatNepalDateTime(nextScraperRun, language)
    : ''
  const timeUntilNextRun = nextScraperRun
    ? formatTimeUntil(nextScraperRun, language)
    : ''

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      toast.error(copy.invalidEmailError)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseNumber,
          email: cleanEmail,
        }),
      })

      const data = await res.json()

      if (res.status === 429) {
        toast.error(data.error || copy.rateLimitError)
        return
      }

      if (!res.ok && data.error) {
        toast.error(data.error)
        return
      }

      if (data.status === 'already_printed') {
        toast.success(copy.alreadyPrintedNotice)
        if (data.data && onFoundExisting) {
          onFoundExisting(data.data)
        }
        return
      }

      if (data.status === 'already_subscribed') {
        setIsSubscribed(true)
        setSubscribedEmail(cleanEmail)
        if (data.unsubscribeToken) {
          setUnsubscribeToken(data.unsubscribeToken)
        }
        toast(copy.alreadySubscribedNotice, { icon: 'ℹ️' })
        return
      }

      // Success
      setIsSubscribed(true)
      setSubscribedEmail(cleanEmail)
      if (data.data?.unsubscribeToken) {
        setUnsubscribeToken(data.data.unsubscribeToken)
      }
      toast.success(copy.successTitle)
    } catch {
      toast.error(language === 'ne' ? 'अनुरोध असफल भयो। कृपया फेरि प्रयास गर्नुहोस्।' : 'Failed to register notification. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!unsubscribeToken && !subscribedEmail) return

    setIsCancelling(true)
    try {
      const res = await fetch('/api/notifications/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: unsubscribeToken || undefined,
          licenseNumber: !unsubscribeToken ? licenseNumber : undefined,
          email: !unsubscribeToken ? subscribedEmail : undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.status === 'success') {
        setIsCancelled(true)
        setIsSubscribed(false)
        toast.success(copy.cancelledSuccessNotice)
      } else {
        toast.error(data.error || data.message || 'Failed to cancel')
      }
    } catch {
      toast.error('Failed to cancel notification.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--nepal-blue)]/30 bg-gradient-to-br from-[var(--surface-primary)] via-[var(--surface-primary)] to-[var(--nepal-blue-soft)]/20 p-4 sm:p-5 shadow-sm transition">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--nepal-blue)]/10 blur-2xl" />

      {/* Header section with notification bell */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white shadow-sm shadow-[var(--nepal-blue)]/20">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {copy.cardTitle}
            </h3>
            <span className="rounded-md bg-[var(--nepal-blue-soft)] px-2 py-0.5 font-mono text-[11px] font-bold text-[var(--nepal-blue)]">
              {licenseNumber}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm">
            {copy.cardDescription}
          </p>
        </div>
      </div>

      {/* Next Scheduled Scrape Date/Time Badge (Requirement 7) */}
      {formattedNextRun && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--nepal-blue)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{copy.nextScrapeLabel}</span>
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            {formattedNextRun}
          </span>
          {timeUntilNextRun && (
            <span className="rounded-full bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--nepal-blue)]">
              {timeUntilNextRun}
            </span>
          )}
        </div>
      )}

      {/* Main interactive state: Subscribed vs Form vs Cancelled */}
      <div className="mt-4">
        {isSubscribed ? (
          <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-3.5 sm:p-4">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[var(--success)]">
                  {copy.successTitle}
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  {copy.successDescription
                    .replace('{licenseNumber}', licenseNumber)
                    .replace('{email}', subscribedEmail)}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--error)] hover:underline disabled:opacity-50"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>{isCancelling ? (language === 'ne' ? 'रद्द हुँदैछ...' : 'Cancelling...') : copy.cancelAlertLink}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : isCancelled ? (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 text-center text-xs text-[var(--text-secondary)]">
            <span className="font-semibold">{copy.cancelledSuccessNotice}</span>
            <button
              type="button"
              onClick={() => {
                setIsCancelled(false)
                setEmail('')
              }}
              className="ml-2 font-bold text-[var(--nepal-blue)] hover:underline"
            >
              {language === 'ne' ? 'पुनः दर्ता गर्नुहोस्' : 'Register again'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={copy.emailPlaceholder}
                  disabled={isSubmitting}
                  required
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] py-2.5 pl-10 pr-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/20 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !email.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-mid)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>{copy.submittingButton}</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span>{copy.submitButton}</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] leading-4 text-[var(--text-muted)]">
              {copy.privacyNote}
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
