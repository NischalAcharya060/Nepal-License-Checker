'use client'

import { useState, useEffect } from 'react'
import type { Language } from '@/lib/i18n'
import { FEEDBACK_CATEGORIES } from '@/lib/feedback'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  language?: Language
  initialLicenseNumber?: string
}

export default function FeedbackModal({
  isOpen,
  onClose,
  language = 'en',
  initialLicenseNumber = '',
}: FeedbackModalProps) {
  const isNe = language === 'ne'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [licenseNumber, setLicenseNumber] = useState(initialLicenseNumber)
  const [category, setCategory] = useState<string>('license_not_found')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  // Adjust state during render when modal opens or initial props change
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setIsSuccess(false)
      setErrorMessage('')
      if (initialLicenseNumber && !licenseNumber) {
        setLicenseNumber(initialLicenseNumber)
      }
    }
  }

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] text-base">
              💬
            </span>
            <div>
              <h3 id="feedback-modal-title" className="text-sm font-bold text-[var(--text-primary)] sm:text-base">
                {isNe ? 'सुझाव तथा समस्या रिपोर्ट' : 'Contact & Problem Report'}
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                {isNe ? 'हामीलाई आफ्नो समस्या वा सुझाव पठाउनुहोस्' : 'Facing an issue or have a suggestion? Let us know'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)] transition disabled:opacity-50"
            title="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success-bg)] text-2xl text-[var(--success)] shadow-sm">
                ✓
              </div>
              <h4 className="mt-4 text-base font-bold text-[var(--text-primary)] sm:text-lg">
                {isNe ? 'धन्यवाद! तपाईंको सन्देश प्राप्त भयो' : 'Thank You! Message Received'}
              </h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                {isNe
                  ? 'हाम्रो टोलीले तपाईंको गुनासो वा सुझाव अध्ययन गर्नेछ। आवश्यक परेमा हामी इमेलमार्फत सम्पर्क गर्नेछौं।'
                  : 'Your message has been submitted to the admin team. If needed, we will follow up with you via email.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-dark)]"
              >
                {isNe ? 'बन्द गर्नुहोस्' : 'Done & Close'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-xs text-[var(--error)] animate-shake">
                  <span className="font-bold text-sm">⚠️</span>
                  <span className="flex-1 font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Subject / Category Dropdown */}
              <div>
                <label htmlFor="fb-category" className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
                  {isNe ? 'समस्या वा सुझावको विषय (Category / Topic) *' : 'Subject / Problem Category *'}
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
                    {isNe ? 'तपाईंको नाम (Full Name) *' : 'Your Full Name *'}
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
                    {isNe ? 'इमेल ठेगाना (Email Address) *' : 'Email Address *'}
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
                    {isNe ? 'सवारी चालक अनुमति पत्र नम्बर (License No.)' : 'License Number'}
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    {isNe ? '(वैकल्पिक / Optional)' : '(Optional)'}
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
                  {isNe ? 'समस्या वा सुझावको विवरण (Message) *' : 'Describe the Problem or Suggestion *'}
                </label>
                <textarea
                  id="fb-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder={
                    isNe
                      ? 'तपाईंले सामना गर्नुभएको समस्या वा दिन चाहनुभएको सुझाव यहाँ विस्तृत रूपमा लेख्नुहोस्...'
                      : 'Please describe the problem you encountered or your suggestion in detail...'
                  }
                  required
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm resize-none"
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
                  className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] disabled:opacity-50"
                >
                  {isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-dark)] disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>{isNe ? 'पठाउँदै...' : 'Submitting...'}</span>
                    </>
                  ) : (
                    <>
                      <span>📨</span>
                      <span>{isNe ? 'सन्देश पठाउनुहोस्' : 'Send Message'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
