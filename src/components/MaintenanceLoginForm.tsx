'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

export default function MaintenanceLoginForm() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isCapsOn, setIsCapsOn] = useState(false)
  const [isShiftOn, setIsShiftOn] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset modifier states if window loses focus or key is released globally
  useEffect(() => {
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftOn(false)
      }
      if (e.key === 'CapsLock' && typeof e.getModifierState === 'function') {
        setIsCapsOn(e.getModifierState('CapsLock'))
      }
    }
    const handleGlobalBlur = () => {
      setIsShiftOn(false)
    }
    window.addEventListener('keyup', handleGlobalKeyUp)
    window.addEventListener('blur', handleGlobalBlur)
    return () => {
      window.removeEventListener('keyup', handleGlobalKeyUp)
      window.removeEventListener('blur', handleGlobalBlur)
    }
  }, [])

  // Focus & auto-select input on error
  useEffect(() => {
    if (error && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [error])

  // In-field modifier detector (runs on keydown, keyup, click, focus)
  const checkModifiers = useCallback((e: React.KeyboardEvent | React.MouseEvent | React.FocusEvent) => {
    if ('getModifierState' in e && typeof e.getModifierState === 'function') {
      setIsCapsOn(e.getModifierState('CapsLock'))
      if (e.type === 'keyup' && 'key' in e && (e as React.KeyboardEvent).key === 'Shift') {
        setIsShiftOn(false)
      } else {
        setIsShiftOn(Boolean(e.getModifierState('Shift') || ('shiftKey' in e && (e as React.KeyboardEvent | React.MouseEvent).shiftKey)))
      }
    }
  }, [])

  const getInputPaddingRight = () => {
    const hasClear = password.length > 0
    const badgeCount = (isCapsOn ? 1 : 0) + (isShiftOn ? 1 : 0)

    if (badgeCount === 2) {
      return hasClear ? 'pr-48' : 'pr-36'
    }
    if (badgeCount === 1) {
      return hasClear ? 'pr-36' : 'pr-24'
    }
    return hasClear ? 'pr-20' : 'pr-12'
  }

  const handleClear = () => {
    setPassword('')
    if (error) setError('')
    inputRef.current?.focus()
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
    } catch {
      setError('Unable to connect to the server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="maintenance-password"
          className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
        >
          Administrator Password
        </label>
        <div className="relative mt-1.5">
          <input
            ref={inputRef}
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
            onFocus={checkModifiers}
            onKeyUp={checkModifiers}
            onKeyDown={(e) => {
              checkModifiers(e)
              if (e.key === 'Escape') {
                handleClear()
              }
            }}
            onClick={checkModifiers}
            onBlur={() => {
              setIsShiftOn(false)
            }}
            placeholder="Enter administrator password..."
            className={`h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/70 px-3.5 ${getInputPaddingRight()} text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20`}
          />

          {/* Action Buttons (In-field Caps Lock Badge, Shift Badge, Clear, & Show/Hide) */}
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* In-field Caps Lock Badge */}
            {isCapsOn && (
              <div
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-amber-600 dark:text-amber-400 select-none"
                title="Caps Lock is active"
                aria-label="Caps Lock is active"
                role="status"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4L4 12h5v6h6v-6h5L12 4z" />
                  <path d="M4 20h16" />
                </svg>
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wider">Caps</span>
              </div>
            )}

            {/* In-field Shift Key Badge */}
            {isShiftOn && (
              <div
                className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 text-sky-600 dark:text-sky-400 select-none"
                title="Shift key is pressed"
                aria-label="Shift key is pressed"
                role="status"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4L4 12h5v8h6v-8h5L12 4z" />
                </svg>
                <span className="font-mono text-[9px] font-extrabold uppercase tracking-wider">Shift</span>
              </div>
            )}

            {/* Clear Password Button */}
            {password.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:text-[var(--text-primary)] cursor-pointer"
                title="Clear password (Esc)"
                aria-label="Clear password"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {/* Show / Hide Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:text-[var(--text-primary)] cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div
          id="maintenance-password-error"
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-xs font-semibold text-[var(--error)] animate-shake shadow-2xs"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !password.trim()}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-mid)] active:scale-98 disabled:cursor-not-allowed disabled:bg-[var(--text-muted)] cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <span>Authenticate & Unlock</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </>
        )}
      </button>
    </form>
  )
}
