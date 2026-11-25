'use client'

import { useState, useRef, useEffect, useSyncExternalStore } from 'react'
import toast from 'react-hot-toast'
import { formatNepalDateTime, formatTimeUntil } from '@/lib/cronHelper'
import type { NotificationCopy } from '@/lib/i18n'
import type { LicenseData } from '@/app/page'
import {
  isPushSupported,
  subscribeUserToPush,
  unsubscribeUserFromPush,
  getCurrentPushSubscription,
  sendTestPushToSelf,
} from '@/lib/pushClient'

const DOMAIN_TYPOS: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.co': 'gmail.com',
  'gmail.co': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'iclod.com': 'icloud.com',
}

function checkDomainTypo(inputEmail: string): string | null {
  const parts = inputEmail.split('@')
  if (parts.length !== 2) return null
  const [user, domain] = parts
  const lowerDomain = domain.toLowerCase()
  if (DOMAIN_TYPOS[lowerDomain]) {
    return `${user}@${DOMAIN_TYPOS[lowerDomain]}`
  }
  return null
}

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
  const [isConfirming, setIsConfirming] = useState(false)
  const [suggestedFix, setSuggestedFix] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscribedEmail, setSubscribedEmail] = useState('')
  const [unsubscribeToken, setUnsubscribeToken] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)

  // Web Push notification states
  const pushSupported = useSyncExternalStore(
    () => () => {},
    () => isPushSupported(),
    () => false
  )
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [isPushLoading, setIsPushLoading] = useState(false)
  const [isTestingPush, setIsTestingPush] = useState(false)

  useEffect(() => {
    if (!pushSupported) return
    let active = true
    getCurrentPushSubscription().then((sub) => {
      if (active) {
        setIsPushSubscribed(!!sub)
      }
    })
    return () => {
      active = false
    }
  }, [pushSupported])

  const handleSubscribePush = async () => {
    setIsPushLoading(true)
    try {
      const res = await subscribeUserToPush({ licenseNumber, sendWelcome: true })
      if (res.success) {
        setIsPushSubscribed(true)
        toast.success(
          language === 'ne'
            ? 'यो डिभाइसमा वेब नोटिफिकेसन सक्रिय भयो! लाइसेन्स छापिएपछि तपाईंलाई अलर्ट आउनेछ।'
            : 'Web push notifications enabled! You will be alerted on this device once your license is printed.'
        )
      } else {
        toast.error(
          res.error ||
            (language === 'ne'
              ? 'नोटिफिकेसन सक्रिय गर्न सकिएन।'
              : 'Could not enable push notifications.')
        )
      }
    } catch {
      toast.error(
        language === 'ne'
          ? 'नोटिफिकेसन सक्रिय गर्न सकिएन।'
          : 'Failed to enable push notifications.'
      )
    } finally {
      setIsPushLoading(false)
    }
  }

  const handleUnsubscribePush = async () => {
    setIsPushLoading(true)
    try {
      const res = await unsubscribeUserFromPush({ licenseNumber })
      if (res.success) {
        setIsPushSubscribed(false)
        toast.success(
          language === 'ne' ? 'पुश नोटिफिकेसन बन्द गरियो।' : 'Push notifications disabled.'
        )
      }
    } catch {
      toast.error('Failed to disable push notifications.')
    } finally {
      setIsPushLoading(false)
    }
  }

  const handleTestPush = async () => {
    setIsTestingPush(true)
    try {
      const res = await sendTestPushToSelf()
      if (res.success) {
        toast.success(
          language === 'ne'
            ? 'परीक्षण नोटिफिकेसन पठाइयो!'
            : 'Test notification sent to your device!'
        )
      } else {
        toast.error(res.error || 'Failed to send test push')
      }
    } catch {
      toast.error('Failed to send test push')
    } finally {
      setIsTestingPush(false)
    }
  }

  const inputRef = useRef<HTMLInputElement>(null)

  // Format next sync date and relative time
  const formattedNextRun = nextScraperRun
    ? formatNepalDateTime(nextScraperRun, language)
    : ''
  const timeUntilNextRun = nextScraperRun
    ? formatTimeUntil(nextScraperRun, language)
    : ''

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

  // Step 1: User submits the email input -> Validate & present double-check confirmation
  const handleInitiateSubscription = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      toast.error(copy.invalidEmailError)
      return
    }

    const typo = checkDomainTypo(cleanEmail)
    setSuggestedFix(typo)
    setIsConfirming(true)
  }

  // Quick fix for suggested typo
  const applySuggestedTypo = () => {
    if (suggestedFix) {
      setEmail(suggestedFix)
      setSuggestedFix(null)
    }
  }

  // Cancel confirmation and return to editing
  const handleEditEmail = () => {
    setIsConfirming(false)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  // Step 2: User confirms "Yes, this is my correct email" -> Execute Subscription
  const handleConfirmSubscription = async () => {
    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      toast.error(copy.invalidEmailError)
      setIsConfirming(false)
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
        setIsConfirming(false)
        setIsSubscribed(true)
        setSubscribedEmail(cleanEmail)
        if (data.unsubscribeToken) {
          setUnsubscribeToken(data.unsubscribeToken)
        }
        toast(copy.alreadySubscribedNotice, { icon: 'ℹ️' })
        return
      }

      // Success
      setIsConfirming(false)
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
        setIsConfirming(false)
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

      {/* Next Scheduled Scrape Date/Time Badge */}
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

      {/* Web Push Notification Section (Instant alerts directly to this device) */}
      {pushSupported && (
        <div className="mt-3.5 rounded-xl border border-[var(--nepal-blue)]/30 bg-[var(--surface-primary)] p-3.5 sm:p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <div
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                  isPushSubscribed
                    ? 'bg-[var(--success)] text-white shadow-xs'
                    : 'bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)]'
                }`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] sm:text-sm">
                    {language === 'ne'
                      ? 'यो डिभाइसमा तुरुन्त सूचना (Web Push)'
                      : 'Instant Device Push Notification'}
                  </h4>
                  {isPushSubscribed && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                      {language === 'ne' ? 'सक्रिय' : 'Active'}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-secondary)] sm:text-xs">
                  {isPushSubscribed
                    ? language === 'ne'
                      ? 'तपाईंको डिभाइसमा पुश नोटिफिकेसन सक्रिय छ। लाइसेन्स छापिएपछि सिधै स्क्रिनमा अलर्ट आउनेछ।'
                      : 'Push notifications are active. You will get a notification on this device once printed.'
                    : language === 'ne'
                    ? 'इमेल नराखी सिधै आफ्नो फोन वा ल्यापटपमा नोटिफिकेसन पाउनुहोस्।'
                    : 'Get alerted on this phone or browser the moment your card is printed — no email needed.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
              {isPushSubscribed ? (
                <>
                  <button
                    type="button"
                    onClick={handleTestPush}
                    disabled={isTestingPush}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                  >
                    {isTestingPush ? (
                      <span>{language === 'ne' ? 'पठाउँदै...' : 'Sending...'}</span>
                    ) : (
                      <>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m22 2-7 20-4-9-9-4Z" />
                          <path d="M22 2 11 13" />
                        </svg>
                        <span>{language === 'ne' ? 'परीक्षण पठाउनुहोस्' : 'Test Alert'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleUnsubscribePush}
                    disabled={isPushLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] transition hover:text-[var(--error)]"
                  >
                    <span>{language === 'ne' ? 'बन्द गर्नुहोस्' : 'Disable'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleSubscribePush}
                  disabled={isPushLoading}
                  className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue)]/90 active:scale-95 disabled:opacity-60"
                >
                  {isPushLoading ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>{language === 'ne' ? 'सक्रिय गर्दै...' : 'Enabling...'}</span>
                    </>
                  ) : (
                    <>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                      <span>{language === 'ne' ? 'पुश सूचना अन गर्नुहोस्' : 'Enable Device Push'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Divider between Web Push and Email */}
      {pushSupported && !isSubscribed && !isConfirming && (
        <div className="relative my-3.5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-default)]" />
          </div>
          <div className="relative bg-[var(--surface-primary)] px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {language === 'ne' ? 'अथवा इमेल मार्फत' : 'Or via Email'}
          </div>
        </div>
      )}

      {/* Main interactive state: Subscribed vs Double-Check Confirmation vs Initial Form vs Cancelled */}
      <div className={pushSupported && !isSubscribed && !isConfirming ? 'mt-1' : 'mt-4'}>
        {isSubscribed ? (
          <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-3.5 sm:p-4 animate-in fade-in duration-200">
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
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 text-center text-xs text-[var(--text-secondary)] animate-in fade-in duration-200">
            <span className="font-semibold">{copy.cancelledSuccessNotice}</span>
            <button
              type="button"
              onClick={() => {
                setIsCancelled(false)
                setIsConfirming(false)
                setEmail('')
              }}
              className="ml-2 font-bold text-[var(--nepal-blue)] hover:underline"
            >
              {language === 'ne' ? 'पुनः दर्ता गर्नुहोस्' : 'Register again'}
            </button>
          </div>
        ) : isConfirming ? (
          /* Step 2: Double-Check Confirmation Step */
          <div className="rounded-xl border-2 border-[var(--nepal-blue)]/40 bg-[var(--surface-primary)] p-4 shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-200">
            {/* Header / Attention */}
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--nepal-blue)]/15 text-[var(--nepal-blue)]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                {copy.confirmEmailTitle}
              </h4>
              <span className="ml-auto rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {language === 'ne' ? 'पुष्टि गर्नुहोस्' : 'Verify'}
              </span>
            </div>

            <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
              {copy.confirmEmailSubtitle}
            </p>

            {/* Email Highlight Box */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <svg className="h-4 w-4 flex-shrink-0 text-[var(--nepal-blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="truncate font-mono text-sm font-bold text-[var(--text-primary)] select-all">
                  {email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleEditEmail}
                disabled={isSubmitting}
                className="ml-2 flex-shrink-0 text-xs font-semibold text-[var(--nepal-blue)] hover:underline"
              >
                {copy.confirmEmailEditButton}
              </button>
            </div>

            {/* Typo Suggestion Box (e.g. gamil.com -> gmail.com) */}
            {suggestedFix && (
              <div className="mt-2.5 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{copy.typoSuggestionPrefix} </span>
                  <span className="font-mono font-bold underline">{suggestedFix}</span>?
                </div>
                <button
                  type="button"
                  onClick={applySuggestedTypo}
                  className="ml-2 flex-shrink-0 rounded-md bg-amber-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-amber-700"
                >
                  {copy.typoSuggestionButton} {suggestedFix.split('@')[1]}
                </button>
              </div>
            )}

            {/* Confirmation Question & Action Buttons */}
            <div className="mt-4 border-t border-[var(--border-default)] pt-3">
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {copy.confirmEmailQuestion}
              </p>

              {copy.storageHint && (
                <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)]">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-[var(--nepal-blue)]">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span className="leading-tight">{copy.storageHint}</span>
                </div>
              )}

              <div className="mt-2.5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleEditEmail}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition disabled:opacity-50"
                >
                  {copy.confirmEmailEditButton}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSubscription}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-mid)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>{copy.submittingButton}</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{copy.confirmEmailYesButton}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 1: Initial Email Input Form */
          <form onSubmit={handleInitiateSubscription} className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span>{copy.submitButton}</span>
              </button>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[11px] leading-4 text-[var(--text-muted)]">
                {copy.privacyNote}
              </p>
              {copy.storageHint && (
                <p className="flex items-center gap-1.5 text-[10.5px] leading-4 text-[var(--text-muted)] opacity-85">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-amber-500/80">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{copy.storageHint}</span>
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

