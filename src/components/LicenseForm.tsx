'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { validateLicenseNumber, formatLicenseNumber } from '@/utils/validation'
import { devanagariToAsciiDigits } from '@/utils/sanitize'
import { getTransportOfficeByLicense } from '@/lib/offices'
import type { LicenseFormCopy } from '@/lib/i18n'

interface LicenseFormProps {
  onSubmit: (licenseNumber: string) => Promise<void>
  onReset: () => void
  loading: boolean
  copy: LicenseFormCopy
  language?: 'en' | 'ne'
  externalNumber?: string
}

const RECENT_SEARCHES_KEY = 'nepal_license_recent_history_v1'

export default function LicenseForm({
  onSubmit,
  onReset,
  loading,
  copy,
  language = 'en',
  externalNumber,
}: LicenseFormProps) {
  const [licenseNumber, setLicenseNumber] = useState(() => {
    return externalNumber ? formatLicenseNumber(externalNumber) : ''
  })
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 5)
        }
      }
    } catch {
      // LocalStorage access might fail in privacy modes
    }
    return []
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const initialAutoSubmitted = useRef(false)

  // Auto-submit initial valid external number once on mount
  useEffect(() => {
    if (!initialAutoSubmitted.current && externalNumber) {
      const formatted = formatLicenseNumber(externalNumber)
      if (validateLicenseNumber(formatted)) {
        initialAutoSubmitted.current = true
        onSubmit(formatted)
      }
    }
  }, [externalNumber, onSubmit])

  // Cycle through loading messages
  const startLoadingMessages = useCallback(() => {
    setLoadingMsgIdx(0)
    const totalMessages = copy.loadingMessages.length || 1
    loadingInterval.current = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % totalMessages)
    }, 1800)
  }, [copy.loadingMessages.length])

  const stopLoadingMessages = useCallback(() => {
    if (loadingInterval.current) {
      clearInterval(loadingInterval.current)
      loadingInterval.current = null
    }
  }, [])

  useEffect(() => {
    if (!loading) stopLoadingMessages()
  }, [loading, stopLoadingMessages])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      if (loadingInterval.current) clearInterval(loadingInterval.current)
    }
  }, [])

  // Press "/" to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Support Devanagari numerals conversion automatically
      const rawInput = devanagariToAsciiDigits(e.target.value)
      const formatted = formatLicenseNumber(rawInput)

      setLicenseNumber(formatted)
      setError('')
      onReset()

      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => {
        if (formatted.length === 14 && !validateLicenseNumber(formatted)) {
          setError(copy.errors.invalidShort)
        }
      }, 350)
    },
    [copy.errors.invalidShort, onReset]
  )

  const saveRecentSearch = (num: string) => {
    try {
      const updated = [num, ...recentSearches.filter((n) => n !== num)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    } catch {
      // Ignore storage errors
    }
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {
      // Ignore
    }
  }

  const handleSelectRecent = (num: string) => {
    setLicenseNumber(num)
    setError('')
    onSubmit(num)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!licenseNumber) {
      setError(copy.errors.required)
      return
    }
    if (!validateLicenseNumber(licenseNumber)) {
      setError(copy.errors.invalidFull)
      return
    }
    setError('')
    saveRecentSearch(licenseNumber)
    startLoadingMessages()
    await onSubmit(licenseNumber)
    stopLoadingMessages()
  }

  const isValid = validateLicenseNumber(licenseNumber)
  const progress = Math.min((licenseNumber.replace(/-/g, '').length / 12) * 100, 100)
  const detectedOffice = licenseNumber.length >= 2 ? getTransportOfficeByLicense(licenseNumber) : null

  return (
    <div className="hover-lift animate-rise-in rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm sm:p-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="license-number" className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {copy.label}
          </label>
          <span className="hidden items-center gap-1 rounded border border-[var(--border-default)] bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] sm:inline-flex">
            <span>Press</span>
            <kbd className="font-mono font-bold text-[var(--text-secondary)]">/</kbd>
            <span>to focus</span>
          </span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="relative flex-1">
            <div
              className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                focused ? 'text-[var(--nepal-blue)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <input
              ref={inputRef}
              id="license-number"
              type="text"
              value={licenseNumber}
              onChange={handleInputChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={copy.placeholder}
              disabled={loading}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              maxLength={14}
              inputMode="numeric"
              aria-invalid={!!error}
              className={`h-12 w-full rounded-xl border px-11 pr-10 font-mono text-[16px] font-semibold tracking-[0.08em] outline-none transition-all duration-200 sm:h-[52px] sm:text-[17px] ${
                error
                  ? 'border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error)] shadow-[0_0_0_3px_rgba(220,20,60,0.12)]'
                  : focused
                  ? 'border-[var(--nepal-blue)] bg-[var(--surface-primary)] shadow-[0_0_0_3px_rgba(0,56,147,0.14)]'
                  : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
              } ${loading ? 'opacity-70' : ''}`}
            />
            {licenseNumber && !loading && (
              <button
                type="button"
                onClick={() => {
                  setLicenseNumber('')
                  setError('')
                  onReset()
                  inputRef.current?.focus()
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
                aria-label={copy.clearLabel}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !!error || !licenseNumber}
            className="inline-flex h-12 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--nepal-blue-mid)] hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[var(--text-muted)] disabled:shadow-none sm:h-[52px]"
          >
            {loading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span>{copy.checkingLabel}</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>{copy.submitLabel}</span>
              </>
            )}
          </button>
        </div>

        {/* Input Progress indicator */}
        {licenseNumber && !loading && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--nepal-blue-soft)]">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${progress}%`,
                background: isValid ? 'var(--success)' : error ? 'var(--error)' : 'var(--nepal-blue)',
              }}
            />
          </div>
        )}

        {/* Detected Transport Office preview chip */}
        {detectedOffice && !error && (
          <div className="flex animate-fade-in items-center gap-2 rounded-lg border border-[var(--nepal-blue)]/20 bg-[var(--nepal-blue-soft)]/60 px-3 py-1.5 text-xs text-[var(--nepal-blue)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M3 21h18" />
              <path d="M5 21V7l8-4v18" />
              <path d="M19 21V11l-6-4" />
              <line x1="9" y1="9" x2="9" y2="9.01" />
              <line x1="9" y1="13" x2="9" y2="13.01" />
              <line x1="9" y1="17" x2="9" y2="17.01" />
            </svg>
            <span className="font-semibold">{copy.detectedOfficeLabel}</span>
            <span className="font-medium text-[var(--text-primary)]">
              {language === 'ne' ? detectedOffice.nameNe : detectedOffice.nameEn} ({language === 'ne' ? detectedOffice.locationNe : detectedOffice.locationEn})
            </span>
          </div>
        )}

        {/* Errors, Loading Messages & Format Hints */}
        {error ? (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--error)] animate-fade-in">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        ) : loading ? (
          <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] animate-fade-in">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[var(--nepal-blue)]"
                  style={{ animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
            <span className="font-medium">{copy.loadingMessages[loadingMsgIdx] ?? copy.loadingMessages[0]}</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{copy.formatLabel}</span>
              <code className="rounded bg-[var(--nepal-blue-soft)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--nepal-blue)]">
                XX-XX-XXXXXXXX
              </code>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">{copy.pasteHint}</span>
          </div>
        )}

        {/* Recent Searches chips */}
        {recentSearches.length > 0 && !loading && (
          <div className="mt-3 border-t border-[var(--border-default)]/60 pt-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
              <span className="flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {copy.recentSearchesLabel}
              </span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="text-[10px] text-[var(--text-muted)] transition hover:text-[var(--nepal-red)]"
              >
                {copy.clearRecentLabel}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSelectRecent(num)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1 font-mono text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)]"
                >
                  <span>{num}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
