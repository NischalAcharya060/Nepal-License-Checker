// src/app/feedback/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FEEDBACK_CATEGORIES } from '@/lib/feedback'

export default function FeedbackPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [category, setCategory] = useState<string>('license_not_found')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

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
                User Feedback &amp; Problem Support
              </span>
            </div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-[var(--text-primary)]">
            Contact &amp; Problem Report
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] max-w-lg mx-auto">
            Facing an issue searching your license, email alert, or have a suggestion to improve the platform? Send us a message and our team will review it.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 shadow-sm">
          {isSuccess ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--success-bg)] text-3xl text-[var(--success)] shadow-xs">
                ✓
              </div>
              <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
                Message Received!
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                Thank you for reaching out. We have logged your problem report / suggestion in our admin console. If necessary, we will get back to you via your provided email address.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-primary)]"
                >
                  Send Another Message
                </button>
                <Link
                  href="/"
                  className="rounded-xl bg-[var(--nepal-blue)] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-dark)]"
                >
                  Back to License Checker →
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
                    placeholder="e.g. John Doe"
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
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 text-xs sm:text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 resize-none"
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
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-dark)] disabled:opacity-50 active:scale-[0.99]"
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

        {/* Footer Back Link */}
        <div className="mt-6 text-center">
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
