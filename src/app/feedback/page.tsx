// src/app/feedback/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FEEDBACK_CATEGORIES, FeedbackStatus } from '@/lib/feedback'
import { formatNepalDateTime } from '@/lib/cronHelper'

interface TrackedInquiryItem {
  id: string
  name: string
  email: string
  license_number?: string | null
  category: string
  categoryLabel: string
  categoryLabelNe?: string
  isProblem?: boolean
  subject: string
  message: string
  status: FeedbackStatus
  admin_notes?: string | null
  created_at: number
  updated_at: number
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  const diffMonth = Math.floor(diffDay / 30)
  return `${diffMonth}mo ago`
}

function FeedbackContent() {
  const searchParams = useSearchParams()

  const urlEmail = searchParams.get('email') || ''
  const urlRef = searchParams.get('ref') || searchParams.get('id') || ''
  const urlTrack = searchParams.get('track') || ''
  const urlTab = searchParams.get('tab')

  const initialQuery = urlRef || urlEmail || urlTrack || ''

  const [activeTab, setActiveTab] = useState<'submit' | 'track'>(
    urlTab === 'track' || initialQuery ? 'track' : 'submit'
  )

  // Submit Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [category, setCategory] = useState<string>('license_not_found')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; email: string } | null>(null)

  // Track Status State (Accepts Email OR Reference ID)
  const [trackQuery, setTrackQuery] = useState(initialQuery)
  const [isSearching, setIsSearching] = useState(false)
  const [trackError, setTrackError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [inquiries, setInquiries] = useState<TrackedInquiryItem[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleFetchStatus = async (searchTerm: string) => {
    const clean = searchTerm.trim().replace(/^#/, '')
    if (!clean) {
      setTrackError('Please enter your submitted email address or Reference No (e.g. fb_...).')
      return
    }

    setIsSearching(true)
    setTrackError('')

    try {
      const isEmailSearch = clean.includes('@')
      const param = isEmailSearch ? `email=${encodeURIComponent(clean)}` : `id=${encodeURIComponent(clean)}`
      const url = `/api/feedback/status?${param}`
      const res = await fetch(url)
      const data = await res.json()

      if (res.ok && data.status === 'success') {
        setInquiries(data.items || [])
        setHasSearched(true)
      } else {
        setTrackError(data.error || 'Failed to retrieve inquiry status.')
        setInquiries([])
      }
    } catch {
      setTrackError('Unable to connect to server. Please check your internet connection.')
      setInquiries([])
    } finally {
      setIsSearching(false)
    }
  }

  // Auto-search if query param provided in URL
  useEffect(() => {
    const target = (urlRef || urlEmail || urlTrack).trim().replace(/^#/, '')
    if (!target) return
    let isSubscribed = true

    const isEmailSearch = target.includes('@')
    const param = isEmailSearch ? `email=${encodeURIComponent(target)}` : `id=${encodeURIComponent(target)}`

    fetch(`/api/feedback/status?${param}`)
      .then((res) => res.json())
      .then((data) => {
        if (isSubscribed && data.status === 'success') {
          setInquiries(data.items || [])
          setHasSearched(true)
        }
      })
      .catch(() => {})

    return () => {
      isSubscribed = false
    }
  }, [urlEmail, urlRef, urlTrack])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setErrorMessage('')

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.')
      return
    }

    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address.')
      return
    }

    if (!message.trim() || message.trim().length < 5) {
      setErrorMessage('Please describe your problem or suggestion (at least 5 characters).')
      return
    }

    setIsSubmitting(true)

    try {
      const selectedCat = FEEDBACK_CATEGORIES.find((c) => c.id === category)
      const subject = selectedCat?.label || category

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
        setSubmittedTicket({
          id: data.id,
          email: email.trim(),
        })
        setName('')
        setEmail('')
        setLicenseNumber('')
        setMessage('')
      } else {
        setErrorMessage(data.error || 'Submission failed. Please try again.')
      }
    } catch {
      setErrorMessage('Unable to connect to the server. Please check your internet connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filteredInquiries = inquiries.filter((item) => {
    if (statusFilter === 'all') return true
    return item.status === statusFilter
  })

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 sm:px-6 sm:py-12 text-[var(--text-primary)]">
      <div className="mx-auto max-w-2xl">
        {/* Top Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <Image
              src="/License-Checker-Nepal-logo.png"
              alt="Nepal License Checker"
              width={48}
              height={48}
              className="h-12 w-12 object-contain transition group-hover:scale-105"
            />
            <div className="text-left">
              <span className="block text-base font-black tracking-tight text-[var(--text-primary)]">
                Nepal License Checker
              </span>
              <span className="block text-xs font-semibold text-[var(--text-muted)]">
                User Support &amp; Status Tracker
              </span>
            </div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-[var(--text-primary)]">
            Contact &amp; Problem Support
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
            Submit a problem report or track real-time inquiry progress using your <strong>Email Address</strong> or <strong>Tracking Reference No</strong>.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>✍️</span>
            <span>Submit Inquiry / Report</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('track')
              if (trackQuery && !hasSearched) {
                handleFetchStatus(trackQuery)
              }
            }}
            className={`flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'track'
                ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>🔍</span>
            <span>Track Status (Email / Ref No)</span>
          </button>
        </div>

        {/* TAB 1: SUBMIT INQUIRY */}
        {activeTab === 'submit' && (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 shadow-sm">
            {isSuccess ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-bg)] text-3xl text-[var(--success)] shadow-xs">
                  ✓
                </div>
                <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
                  Message Received!
                </h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                  Thank you for reaching out. We have registered your inquiry in our admin support system. You can track its live progress and read replies at any time using your Reference ID or email.
                </p>

                {submittedTicket && (
                  <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 max-w-md mx-auto text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                      Your Tracking Reference ID:
                    </span>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <code className="font-mono text-sm font-bold text-[var(--nepal-blue)]">
                        {submittedTicket.id}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(submittedTicket.id, 'submitted-id')}
                        className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {copiedId === 'submitted-id' ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                      Confirmation email also sent to <span className="font-semibold text-[var(--text-primary)]">{submittedTicket.email}</span>.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {submittedTicket && (
                    <button
                      type="button"
                      onClick={() => {
                        setTrackQuery(submittedTicket.id)
                        setActiveTab('track')
                        handleFetchStatus(submittedTicket.id)
                      }}
                      className="rounded-xl bg-[var(--nepal-blue)] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-dark)] cursor-pointer"
                    >
                      🔍 Track with Reference ID →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSuccess(false)
                      setSubmittedTicket(null)
                    }}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-primary)] cursor-pointer"
                  >
                    Submit Another Message
                  </button>
                  <Link
                    href="/"
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                  >
                    Back to License Search
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3.5 text-xs text-[var(--error)]">
                    <span>⚠️</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Category / Subject Dropdown */}
                <div>
                  <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Subject / Category *
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-xs sm:text-sm font-semibold text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                  >
                    {FEEDBACK_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label} ({cat.labelNe})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name & Email */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                      Your Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ram Bahadur"
                      required
                      maxLength={100}
                      className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 text-xs sm:text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      maxLength={120}
                      className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 text-xs sm:text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                    />
                  </div>
                </div>

                {/* License Number (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="license" className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      License Number (Optional)
                    </label>
                    <span className="text-[11px] text-[var(--text-muted)] font-normal">
                      Provide if query is about a specific record
                    </span>
                  </div>
                  <input
                    id="license"
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. 01-06-00892345"
                    maxLength={40}
                    className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 font-mono text-xs sm:text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Problem Description / Message *
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                    maxLength={2000}
                    placeholder="Describe your issue or suggestion in detail..."
                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 text-xs sm:text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 resize-none leading-relaxed"
                  />
                  <div className="mt-1 text-right text-[10px] text-[var(--text-muted)]">
                    {message.length} / 2000 characters
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-dark)] disabled:opacity-50 active:scale-[0.99] cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Sending Your Message...</span>
                      </>
                    ) : (
                      <>
                        <span>📨</span>
                        <span>Submit Feedback / Problem Report</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: TRACK STATUS BY EMAIL OR REFERENCE NO */}
        {activeTab === 'track' && (
          <div className="space-y-6">
            {/* Lookup Card */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-7 shadow-sm">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xl">🔍</span>
                <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Track Your Contact &amp; Problem Inquiries
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] mb-4">
                Enter your submitted <strong>Email Address</strong> or <strong>Tracking Reference No</strong> (e.g. <code>fb_1731...</code>) to see current status and official admin replies.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleFetchStatus(trackQuery)
                }}
                className="flex flex-col sm:flex-row gap-2.5"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    placeholder="Enter email address OR Reference ID (e.g. fb_...)..."
                    required
                    className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 text-xs sm:text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-6 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-dark)] disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {isSearching ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <span>Check Status</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>

              {trackError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-xs text-[var(--error)]">
                  <span>⚠️</span>
                  <span>{trackError}</span>
                </div>
              )}
            </div>

            {/* Results Section */}
            {hasSearched && (
              <div>
                {inquiries.length > 0 ? (
                  <div className="space-y-4">
                    {/* Header Filter Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          Found {inquiries.length} inquiry record{inquiries.length > 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] block sm:inline sm:ml-1">
                          for <strong className="text-[var(--text-secondary)] font-mono">{trackQuery}</strong>
                        </span>
                      </div>

                      {/* Filter Pills */}
                      <div className="inline-flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1 text-xs">
                        {(['all', 'new', 'in_progress', 'resolved'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer capitalize ${
                              statusFilter === st
                                ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs font-bold'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            {st === 'in_progress' ? 'In Progress' : st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Inquiry Cards List */}
                    <div className="space-y-4">
                      {filteredInquiries.map((item) => {
                        const isResolved = item.status === 'resolved'
                        const isInProgress = item.status === 'in_progress'

                        return (
                          <div
                            key={item.id}
                            id={`inquiry-${item.id}`}
                            className={`rounded-2xl border bg-[var(--surface-primary)] p-5 sm:p-6 shadow-xs transition ${
                              trackQuery.replace(/^#/, '') === item.id
                                ? 'border-[var(--nepal-blue)] ring-2 ring-[var(--nepal-blue)]/20'
                                : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
                            }`}
                          >
                            {/* Card Top: Ticket ID + Status Badge + Time */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-default)]/60 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10 px-2.5 py-1 rounded-lg">
                                  #{item.id}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(item.id, item.id)}
                                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                  title="Copy Ticket ID"
                                >
                                  {copiedId === item.id ? '✓ Copied' : 'Copy ID'}
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Status Badge */}
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-bold ${
                                    isResolved
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                      : isInProgress
                                      ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                      : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  {isResolved ? (
                                    <>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12" />
                                      </svg>
                                      <span>Resolved &amp; Answered</span>
                                    </>
                                  ) : isInProgress ? (
                                    <>
                                      <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                      <span>In Progress</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                      <span>Pending Review</span>
                                    </>
                                  )}
                                </span>

                                <span
                                  className="text-[11px] font-mono text-[var(--text-muted)]"
                                  title={`${formatNepalDateTime(item.created_at, 'en', true)} (NPT)`}
                                >
                                  {formatRelativeTime(item.created_at)}
                                </span>
                              </div>
                            </div>

                            {/* Subject & Category */}
                            <div className="mt-3">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider rounded-md bg-[var(--bg-secondary)] px-2 py-0.5 text-[var(--text-secondary)] border border-[var(--border-default)]">
                                  {item.categoryLabel || item.category}
                                </span>
                                {item.license_number && (
                                  <span className="font-mono text-[11px] font-bold text-[var(--nepal-blue)] bg-[var(--nepal-blue)]/5 px-2 py-0.5 rounded-md border border-[var(--nepal-blue)]/20">
                                    Lic: {item.license_number}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                                {item.subject}
                              </h3>
                            </div>

                            {/* User Message */}
                            <div className="mt-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                              <span className="font-bold text-[10px] uppercase text-[var(--text-muted)] block mb-1">
                                Your Message:
                              </span>
                              <p className="whitespace-pre-wrap">{item.message}</p>
                            </div>

                            {/* Official Admin Response Box */}
                            <div className="mt-4">
                              {item.admin_notes ? (
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-sm">🛡️</span>
                                      <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs sm:text-[13px]">
                                        Official Response from Support Team
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                                      {formatNepalDateTime(item.updated_at, 'en', false)} (NPT)
                                    </span>
                                  </div>
                                  <div className="whitespace-pre-wrap text-emerald-950 dark:text-emerald-100 leading-relaxed font-sans text-xs sm:text-[13px] bg-[var(--surface-primary)]/80 p-3 rounded-lg border border-emerald-500/20">
                                    {item.admin_notes}
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs flex items-start gap-2.5">
                                  <span className="text-base shrink-0 mt-0.5">⏳</span>
                                  <div>
                                    <span className="font-bold text-amber-800 dark:text-amber-300 block">
                                      Awaiting Admin Review
                                    </span>
                                    <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                      We have received your inquiry. Our support team will review the issue and post an official response here. You will also receive an update in your email.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-8 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-2xl">
                      📭
                    </div>
                    <h3 className="mt-3 text-base font-bold text-[var(--text-primary)]">
                      No inquiries found
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm mx-auto">
                      We couldn&apos;t find any contact or problem reports matching <strong className="text-[var(--text-primary)] font-mono">{trackQuery}</strong>.
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Please check the reference number or email address spelling and try again.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (trackQuery.includes('@')) {
                          setEmail(trackQuery)
                        }
                        setActiveTab('submit')
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--nepal-blue-dark)] cursor-pointer"
                    >
                      <span>✍️ Submit Inquiry Now →</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--nepal-blue)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Back to License Search Portal</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-12 flex items-center justify-center text-[var(--text-muted)] text-xs">
          Loading Support &amp; Status Portal...
        </div>
      }
    >
      <FeedbackContent />
    </Suspense>
  )
}
