'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function MaintenanceLoginForm() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isCapsOn, setIsCapsOn] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const trackCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsOn(event.getModifierState?.('CapsLock') ?? false)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isSubmitting || !password.trim()) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/maintenance/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        window.location.replace('/')
        return
      }

      const data = await response.json().catch(() => null)
      setError(data?.error || 'Authentication failed. Please verify your password and try again.')
      setPassword('')
    } catch {
      setError('Network communication error. Please check your internet connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Security Chip */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2 text-[var(--text-secondary)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--nepal-blue)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--nepal-blue)]" />
          </span>
          <span className="font-semibold text-[var(--text-primary)]">Admin Session</span>
          <span className="text-[var(--text-muted)]">&middot;</span>
          <span className="text-[var(--text-muted)]">Encrypted Gateway</span>
        </div>
        <span className="rounded bg-[var(--surface-primary)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--text-secondary)] shadow-xs">
          256-BIT
        </span>
      </div>

      {/* Password Input Group */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="maintenance-password"
            className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
          >
            Access Password
            <span lang="ne" className="ml-1 text-[11px] font-medium text-[var(--text-muted)]">
              (मर्मत पासवर्ड)
            </span>
          </label>
          <span className="text-[11px] text-[var(--text-muted)]">
            Required
          </span>
        </div>

        <div
          className={`relative flex items-center rounded-xl border bg-[var(--surface-primary)] transition-all duration-200 ${
            error
              ? 'border-[var(--error-border)] ring-3 ring-[var(--error)]/10'
              : isFocused
              ? 'border-[var(--nepal-blue)] shadow-xs ring-3 ring-[var(--nepal-blue)]/15'
              : 'border-[var(--border-default)] hover:border-[var(--text-muted)]/50'
          }`}
        >
          {/* Leading Lock Icon */}
          <span
            className={`pointer-events-none pl-3.5 transition-colors duration-200 ${
              isFocused ? 'text-[var(--nepal-blue)]' : 'text-[var(--text-muted)]'
            }`}
            aria-hidden
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>

          {/* Input field */}
          <input
            id="maintenance-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            autoFocus
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              if (error) setError('')
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyUp={trackCapsLock}
            onKeyDown={trackCapsLock}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'maintenance-password-error' : undefined}
            placeholder="Enter maintenance password…"
            className={`w-full bg-transparent py-3 pl-3 pr-20 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none ${
              !showPassword && password ? 'font-mono tracking-wider' : ''
            }`}
          />

          {/* Action Buttons (Clear & Show/Hide) */}
          <div className="absolute right-2 flex items-center gap-1">
            {password.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPassword('')
                  setError('')
                }}
                title="Clear input"
                aria-label="Clear password"
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] active:scale-95"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              title={showPassword ? 'Hide password' : 'Show password'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] active:scale-95"
            >
              {showPassword ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Caps Lock Alert Banner */}
        {isCapsOn && (
          <div
            role="status"
            className="animate-slide-up flex items-center gap-2 rounded-lg border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--warning-text)] shadow-xs"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
            <span>Caps Lock is ON &mdash; passwords are case-sensitive</span>
          </div>
        )}
      </div>

      {/* Error Callout */}
      {error && (
        <div
          id="maintenance-password-error"
          role="alert"
          className="animate-shake animate-rise-in flex items-start gap-2.5 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3.5 text-xs text-[var(--error)] shadow-xs"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="min-w-0 flex-1 leading-relaxed">
            <p className="font-bold">Access Denied</p>
            <p className="mt-0.5 text-[11px] opacity-90">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError('')}
            className="rounded p-1 text-[var(--error)] opacity-70 transition hover:opacity-100"
            aria-label="Dismiss alert"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Primary Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || password.trim().length === 0}
        className="group relative inline-flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-[var(--nepal-blue)] to-[var(--nepal-blue-mid)] px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-[var(--nepal-blue)]/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {isSubmitting ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="animate-spin-smooth"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
            </svg>
            <span>Verifying credentials…</span>
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:scale-110"
              aria-hidden
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
            <span>Authenticate & Unlock</span>
          </>
        )}
      </button>

      {/* Keyboard Shortcut & Rate Limit Badge */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-[var(--text-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <kbd className="rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
            ↵ Enter
          </kbd>
          <span>to unlock</span>
        </span>

        <span className="flex items-center gap-1 text-[10px]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Rate-limited (8 attempts)
        </span>
      </div>

      {/* Trust Seal */}
      <div className="mt-4 flex items-center justify-center gap-2 border-t border-[var(--border-default)]/60 pt-4">
        <Image
          src="/License-Checker-Nepal-logo.png"
          alt=""
          width={18}
          height={18}
          className="opacity-60"
        />
        <p className="text-[11px] font-medium text-[var(--text-muted)]">
          Nepal License Checker &bull; DOTM Administrative Bypass
        </p>
      </div>
    </form>
  )
}
