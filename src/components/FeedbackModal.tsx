// src/components/FeedbackModal.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSwipeDownToClose } from '@/hooks/useSwipeDownToClose'
import type { Language } from '@/lib/i18n'
import { FEEDBACK_CATEGORIES, FeedbackStatus } from '@/lib/feedback'
import { formatNepalDateTime } from '@/lib/cronHelper'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  language?: Language
  initialLicenseNumber?: string
  initialTab?: 'submit' | 'track'
}

interface ModalTrackItem {
  id: string
  subject: string
  categoryLabel: string
  categoryLabelNe?: string
  status: FeedbackStatus
  admin_notes?: string | null
  created_at: number
  updated_at: number
}

export default function FeedbackModal({
  isOpen,
  onClose,
  language = 'en',
  initialLicenseNumber = '',
  initialTab = 'submit',
}: FeedbackModalProps) {
  const isNe = language === 'ne'

  const [activeTab, setActiveTab] = useState<'submit' | 'track'>(initialTab)

  // Submit Form States
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [licenseNumber, setLicenseNumber] = useState(initialLicenseNumber)
  const [category, setCategory] = useState<string>('license_not_found')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)

  // Track Status States (Email or Reference ID)
  const [trackQuery, setTrackQuery] = useState('')
  const [isTracking, setIsTracking] = useState(false)
  const [trackError, setTrackError] = useState('')
  const [trackedItems, setTrackedItems] = useState<ModalTrackItem[]>([])
  const [hasTrackSearched, setHasTrackSearched] = useState(false)

  // Adjust state during render when modal opens or initial props change
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setIsSuccess(false)
      setErrorMessage('')
      setTrackError('')
      setActiveTab(initialTab)
      if (initialLicenseNumber && !licenseNumber) {
        setLicenseNumber(initialLicenseNumber)
      }
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting && !isTracking) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, isTracking, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setErrorMessage('')

    if (!name.trim()) {
      setErrorMessage(isNe ? 'कृपया आफ्नो पूरा नाम लेख्नुहोस्।' : 'Please enter your full name.')
      return
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage(isNe ? 'कृपया मान्य इमेल ठेगाना लेख्नुहोस्।' : 'Please enter a valid email address.')
      return
    }

    if (!message.trim() || message.trim().length < 5) {
      setErrorMessage(
        isNe
          ? 'कृपया समस्या वा सुझावको विवरण कम्तीमा ५ अक्षरमा लेख्नुहोस्।'
          : 'Please describe your problem or suggestion (at least 5 characters).'
      )
      return
    }

    setIsSubmitting(true)

    try {
      const selectedCat = FEEDBACK_CATEGORIES.find((c) => c.id === category)
      const subject = (isNe ? selectedCat?.labelNe : selectedCat?.label) || selectedCat?.label || category

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          licenseNumber: licenseNumber.trim(),
          category,
          subject,
          message: message.trim(),
        }),
      })

      const data = await res.json()

      if (res.ok && data.status === 'success') {
        setIsSuccess(true)
        setSubmittedId(data.id || null)
        setTrackQuery(data.id || email.trim())
        setMessage('')
      } else {
        setErrorMessage(data.error || (isNe ? 'पठाउन सकिएन। पुनः प्रयास गर्नुहोस्।' : 'Submission failed. Please try again.'))
      }
    } catch {
      setErrorMessage(
        isNe ? 'सर्भरसँग सम्पर्क हुन सकेन। कृपया पछि प्रयास गर्नुहोस्।' : 'Unable to connect to the server. Please check your internet.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = trackQuery.trim().replace(/^#/, '')
    if (!clean) {
      setTrackError(isNe ? 'कृपया इमेल वा रेफरेन्स नम्बर लेख्नुहोस्।' : 'Please enter an email address or Tracking Reference No.')
      return
    }

    setIsTracking(true)
    setTrackError('')

    try {
      const isEmail = clean.includes('@')
      const param = isEmail ? `email=${encodeURIComponent(clean)}` : `id=${encodeURIComponent(clean)}`
      const res = await fetch(`/api/feedback/status?${param}`)
      const data = await res.json()

      if (res.ok && data.status === 'success') {
        setTrackedItems(data.items || [])
        setHasTrackSearched(true)
      } else {
        setTrackError(data.error || (isNe ? 'अवस्था फेला पार्न सकिएन।' : 'Failed to retrieve inquiry status.'))
        setTrackedItems([])
      }
    } catch {
      setTrackError(isNe ? 'सम्पर्क हुन सकेन।' : 'Unable to connect to server.')
      setTrackedItems([])
    } finally {
      setIsTracking(false)
    }
  }

  const {
    isRendered,
    triggerClose,
    modalStyle,
    backdropStyle,
    handleProps,
  } = useSwipeDownToClose({
    isOpen,
    onClose,
  })

  if (!isRendered) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      style={backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isTracking) triggerClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div
        style={modalStyle}
        className="relative flex flex-col max-h-[83vh] sm:max-h-[88vh] w-full max-w-lg rounded-t-[28px] sm:rounded-3xl dev-glass-card shadow-2xl overflow-hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {/* Mobile handle indicator & Swipe Down zone */}
        <div
          className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none sm:hidden"
          {...handleProps}
        >
          <div className="w-12 h-1.5 bg-[var(--border-default)] hover:bg-[var(--text-muted)] rounded-full transition-colors" />
          <span className="text-[10px] text-[var(--text-muted)] mt-1 font-medium opacity-65 tracking-tight">
            {isNe ? 'बन्द गर्न तल तान्नुहोस्' : 'Swipe down to close'}
          </span>
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50 px-5 py-3.5 select-none"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <div>
              <h3 id="feedback-modal-title" className="text-sm font-bold text-[var(--text-primary)] sm:text-base">
                {isNe ? 'सहायता तथा स्थिति ट्र्याकर' : 'Contact & Status Support'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {isNe ? 'समस्या रिपोर्ट गर्नुहोस् वा आफ्नो स्थितिको जवाफ हेर्नुहोस्' : 'Submit inquiry or track existing replies'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={triggerClose}
            disabled={isSubmitting || isTracking}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl p-2 text-[var(--text-muted)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)] transition disabled:opacity-50 cursor-pointer"
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Segment Controls */}
        <div className="px-5 pt-3">
          <div className="flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('submit')}
              className={`flex-1 rounded-lg py-1.5 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'submit'
                  ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>✍️</span>
              <span>{isNe ? 'नयाँ सोधपुछ' : 'Submit Inquiry'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('track')}
              className={`flex-1 rounded-lg py-1.5 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'track'
                  ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>🔍</span>
              <span>{isNe ? 'अवस्था ट्र्याक' : 'Track Status'}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
          {activeTab === 'submit' ? (
            isSuccess ? (
              <div className="flex flex-col items-center justify-center py-5 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)] shadow-xs text-2xl">
                  ✓
                </div>
                <h4 className="mt-4 text-base font-bold text-[var(--text-primary)] sm:text-lg">
                  {isNe ? 'धन्यवाद! तपाईंको सन्देश दर्ता भयो' : 'Thank You! Message Registered'}
                </h4>
                <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                  {isNe
                    ? 'हाम्रो टोलीले समीक्षा गर्नेछ। तपाईंले आफ्नो इमेलमार्फत अवस्था तथा एड्मिनको जवाफ ट्र्याक गर्न सक्नुहुन्छ।'
                    : 'Your message has been registered. You can track the live status and admin reply using your email anytime.'}
                </p>

                {submittedId && (
                  <div className="mt-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-xs w-full max-w-xs text-left">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] block">Reference ID:</span>
                    <code className="font-mono font-bold text-[var(--nepal-blue)] text-xs">{submittedId}</code>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('track')
                      setIsSuccess(false)
                      const target = (submittedId || email).trim().replace(/^#/, '')
                      if (target) {
                        setTrackQuery(target)
                        const isEmail = target.includes('@')
                        const param = isEmail ? `email=${encodeURIComponent(target)}` : `id=${encodeURIComponent(target)}`
                        fetch(`/api/feedback/status?${param}`)
                          .then((r) => r.json())
                          .then((d) => {
                            if (d.status === 'success') {
                              setTrackedItems(d.items || [])
                              setHasTrackSearched(true)
                            }
                          })
                          .catch(() => {})
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[var(--nepal-blue-dark)] cursor-pointer"
                  >
                    <span>🔍</span>
                    <span>{isNe ? 'अवस्था हेर्नुहोस्' : 'Track Status Now'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={triggerClose}
                    className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                  >
                    {isNe ? 'बन्द गर्नुहोस्' : 'Close'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-xs text-[var(--error)] animate-shake">
                    <span>⚠️</span>
                    <span className="flex-1 font-medium">{errorMessage}</span>
                  </div>
                )}

                {/* Subject / Category Dropdown */}
                <div>
                  <label htmlFor="fb-category" className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                    {isNe ? 'समस्या वा सुझावको विषय *' : 'Subject / Problem Category *'}
                  </label>
                  <select
                    id="fb-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-xs font-semibold text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                  >
                    {FEEDBACK_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {isNe ? cat.labelNe : cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="fb-name" className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      {isNe ? 'तपाईंको नाम *' : 'Your Full Name *'}
                    </label>
                    <input
                      id="fb-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={isNe ? 'उदा: राम श्रेष्ठ' : 'e.g. John Doe'}
                      maxLength={100}
                      required
                      className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="fb-email" className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                      {isNe ? 'इमेल ठेगाना *' : 'Email Address *'}
                    </label>
                    <input
                      id="fb-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      maxLength={120}
                      required
                      className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                    />
                  </div>
                </div>

                {/* License Number (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="fb-license" className="text-xs font-bold text-[var(--text-primary)]">
                      {isNe ? 'लाइसेन्स नम्बर' : 'License Number'}
                    </label>
                    <span className="text-[10px] text-[var(--text-muted)] font-medium">
                      {isNe ? '(वैकल्पिक)' : '(Optional)'}
                    </span>
                  </div>
                  <input
                    id="fb-license"
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="01-06-00123456"
                    maxLength={40}
                    className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 font-mono text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="fb-message" className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    {isNe ? 'समस्या वा सुझावको विवरण *' : 'Describe the Problem or Suggestion *'}
                  </label>
                  <textarea
                    id="fb-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder={
                      isNe
                        ? 'तपाईंले सामना गर्नुभएको समस्या वा दिन चाहनुभएको सुझाव यहाँ लेख्नुहोस्...'
                        : 'Please describe the problem you encountered or your suggestion in detail...'
                    }
                    required
                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm resize-none leading-relaxed"
                  />
                  <div className="mt-1 text-right text-[10px] text-[var(--text-muted)]">
                    {message.length} / 2000
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-default)]/60">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] disabled:opacity-50 cursor-pointer"
                  >
                    {isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-dark)] disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>{isNe ? 'पठाउँदै...' : 'Submitting...'}</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        <span>{isNe ? 'सन्देश पठाउनुहोस्' : 'Send Message'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* TAB 2: TRACK STATUS IN MODAL */
            <div className="space-y-4">
              <form onSubmit={handleTrackSubmit} className="space-y-2.5">
                <label className="block text-xs font-bold text-[var(--text-primary)]">
                  {isNe ? 'इमेल ठेगाना वा ट्र्याकिङ रेफरेन्स नम्बर लेख्नुहोस्:' : 'Enter your submitted Email or Reference No:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    placeholder={isNe ? 'इमेल वा fb_173... लेख्नुहोस्' : 'name@example.com or fb_173...'}
                    required
                    className="h-10 flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-xs sm:text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                  />
                  <button
                    type="submit"
                    disabled={isTracking}
                    className="rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-dark)] disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isTracking ? (isNe ? 'खोज्दै...' : 'Checking...') : isNe ? 'जाँच गर्नुहोस्' : 'Check'}
                  </button>
                </div>
              </form>

              {trackError && (
                <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-xs text-[var(--error)]">
                  <span>⚠️ {trackError}</span>
                </div>
              )}

              {hasTrackSearched && (
                <div className="pt-2">
                  {trackedItems.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span>{isNe ? `कूल ${trackedItems.length} गुनासो/सोधपुछ फेला पर्यो` : `Found ${trackedItems.length} inquiry record(s)`}</span>
                        <Link
                          href={`/feedback?${trackQuery.includes('@') ? 'email' : 'ref'}=${encodeURIComponent(trackQuery.trim().replace(/^#/, ''))}`}
                          onClick={triggerClose}
                          className="font-bold text-[var(--nepal-blue)] hover:underline"
                        >
                          {isNe ? 'पूरा पृष्ठमा हेर्नुहोस् ↗' : 'Full Page Tracker ↗'}
                        </Link>
                      </div>

                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {trackedItems.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-3 text-xs"
                          >
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className="font-mono text-[10px] font-bold text-[var(--nepal-blue)]">
                                #{item.id}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                  {formatNepalDateTime(item.created_at, language, false)}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  item.status === 'resolved'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                    : item.status === 'in_progress'
                                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {item.status === 'resolved'
                                  ? (isNe ? '✓ समाधान भयो' : '✓ Resolved')
                                  : item.status === 'in_progress'
                                  ? (isNe ? 'प्रक्रियामा' : 'In Progress')
                                  : (isNe ? 'नयाँ दर्ता' : 'Pending')}
                              </span>
                            </div>
                          </div>

                            <p className="font-bold text-[var(--text-primary)] text-xs mb-1">
                              {item.subject}
                            </p>

                            {item.admin_notes ? (
                              <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-[11px] text-emerald-950 dark:text-emerald-100">
                                <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-0.5">
                                  🛡️ {isNe ? 'एड्मिनको जवाफ:' : 'Admin Reply:'}
                                </span>
                                <p className="whitespace-pre-wrap">{item.admin_notes}</p>
                              </div>
                            ) : (
                              <p className="mt-1 text-[10px] text-[var(--text-muted)] italic">
                                {isNe ? 'प्रतीक्षामा: एड्मिनले समीक्षा गर्दै हुनुहुन्छ।' : 'Awaiting review from support team.'}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-[var(--text-secondary)]">
                      <p>{isNe ? 'यो इमेल ठेगानामा कुनै रेकर्ड फेला परेन।' : 'No inquiries found for this email address.'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
