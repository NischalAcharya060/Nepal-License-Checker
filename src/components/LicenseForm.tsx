'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { validateLicenseNumber } from '@/utils/validation'
import type { LicenseFormCopy } from '@/lib/i18n'

interface LicenseFormProps {
    onSubmit: (licenseNumber: string) => Promise<void>
    onReset: () => void
    loading: boolean
    copy: LicenseFormCopy
}

export default function LicenseForm({ onSubmit, onReset, loading, copy }: LicenseFormProps) {
    const [licenseNumber, setLicenseNumber] = useState('')
    const [error, setError] = useState('')
    const [focused, setFocused] = useState(false)
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const loadingInterval = useRef<ReturnType<typeof setInterval> | null>(null)

    // Cycle through loading messages
    const startLoadingMessages = useCallback(() => {
        setLoadingMsgIdx(0)
        const totalMessages = copy.loadingMessages.length || 1
        loadingInterval.current = setInterval(() => {
            setLoadingMsgIdx(prev => (prev + 1) % totalMessages)
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

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow digits, auto-insert hyphens
        let raw = e.target.value.replace(/[^0-9]/g, '')
        if (raw.length > 12) raw = raw.slice(0, 12)

        let formatted = raw
        if (raw.length > 4) {
            formatted = raw.slice(0, 2) + '-' + raw.slice(2, 4) + '-' + raw.slice(4)
        } else if (raw.length > 2) {
            formatted = raw.slice(0, 2) + '-' + raw.slice(2)
        }

        setLicenseNumber(formatted)
        setError('')
        onReset()

        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
            if (formatted.length === 14 && !validateLicenseNumber(formatted)) {
                setError(copy.errors.invalidShort)
            }
        }, 400)
    }, [copy.errors.invalidShort, onReset])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!licenseNumber) { setError(copy.errors.required); return }
        if (!validateLicenseNumber(licenseNumber)) { setError(copy.errors.invalidFull); return }
        setError('')
        startLoadingMessages()
        await onSubmit(licenseNumber)
        stopLoadingMessages()
    }

    const isValid = validateLicenseNumber(licenseNumber)
    const progress = Math.min((licenseNumber.replace(/-/g, '').length / 12) * 100, 100)

    return (
        <div className="hover-lift animate-rise-in rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-sm sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-3">
                <label htmlFor="license-number" className="block text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                    {copy.label}
                </label>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <div className="relative flex-1">
                        <div className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focused ? 'text-[var(--nepal-blue)]' : 'text-[var(--text-muted)]'}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                            </svg>
                        </div>
                        <input
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
                            className={`h-12 w-full rounded-xl border px-11 pr-10 font-mono text-[15px] font-semibold tracking-[0.08em] outline-none transition-all duration-200 sm:h-[52px] sm:text-[16px] ${
                                error
                                    ? 'border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error)]'
                                    : focused
                                      ? 'border-[var(--nepal-blue)] bg-[var(--surface-primary)] shadow-[0_0_0_3px_rgba(0,56,147,0.12)]'
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
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)]"
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
                        className="inline-flex h-12 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-4 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--nepal-blue-mid)] hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:bg-[var(--text-muted)] disabled:shadow-none sm:h-[52px]"
                    >
                        {loading ? (
                            <>
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                {copy.checkingLabel}
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                {copy.submitLabel}
                            </>
                        )}
                    </button>
                </div>

                {licenseNumber && !loading && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--nepal-blue-soft)]">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{
                                width: `${progress}%`,
                                background: isValid ? 'var(--success)' : error ? 'var(--error)' : 'var(--nepal-blue)',
                            }}
                        />
                    </div>
                )}

                {error ? (
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--error)]">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </p>
                ) : loading ? (
                    <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)]">
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
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
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>{copy.formatLabel}</span>
                        <code className="rounded bg-[var(--nepal-blue-soft)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
                            XX-XX-XXXXXXXX
                        </code>
                        <span>· {copy.formatHint}</span>
                    </p>
                )}
            </form>
        </div>
    )
}
