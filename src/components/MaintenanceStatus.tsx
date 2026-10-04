'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Phase = 'checking' | 'down' | 'restored'

const POLL_INTERVAL_SECONDS = 120 // 2 minutes

function formatCurrentTime() {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date())
  } catch {
    return 'Just now'
  }
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) {
    return `${m}m ${s < 10 ? '0' : ''}${s}s`
  }
  return `${s}s`
}

export default function MaintenanceStatus() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [isManualChecking, setIsManualChecking] = useState(false)
  const [countdown, setCountdown] = useState(POLL_INTERVAL_SECONDS)
  const [lastCheckedTime, setLastCheckedTime] = useState<string | null>(null)
  const [redirectCountdown, setRedirectCountdown] = useState(4)

  const isCheckingRef = useRef(false)

  const runCheck = useCallback(async () => {
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    try {
      const res = await fetch('/api/maintenance/status', { cache: 'no-store' })
      const body = await res.json().catch(() => null)
      const isOnline = Boolean(body?.data?.ok)

      setPhase(isOnline ? 'restored' : 'down')
      setLastCheckedTime(formatCurrentTime())
      setCountdown(POLL_INTERVAL_SECONDS)
    } catch {
      setPhase('down')
      setLastCheckedTime(formatCurrentTime())
      setCountdown(POLL_INTERVAL_SECONDS)
    } finally {
      isCheckingRef.current = false
      setIsManualChecking(false)
    }
  }, [])

  const handleManualCheck = () => {
    setIsManualChecking(true)
    setPhase('checking')
    void runCheck()
  }

  // Polling every 2 minutes with live seconds countdown
  useEffect(() => {
    if (phase === 'restored') return

    const initialTimeout = setTimeout(() => {
      void runCheck()
    }, 0)

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          void runCheck()
          return POLL_INTERVAL_SECONDS
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(timer)
    }
  }, [phase, runCheck])

  // Auto-redirect countdown when service is restored
  useEffect(() => {
    if (phase !== 'restored') return

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          window.location.replace('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [phase])

  // Phase: Restored / Back Online
  if (phase === 'restored') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="animate-rise-in rounded-2xl border border-[var(--success-border)] bg-gradient-to-r from-[var(--success-bg)] to-[var(--surface-primary)] p-3.5 text-left shadow-md shadow-[var(--success)]/10"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--success)] text-white shadow-xs">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs text-[var(--text-primary)]">
                  Service Restored!
                </span>
                <span lang="ne" className="text-xs text-[var(--success)] font-bold">
                  (सेवा सक्रिय)
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                Redirecting in {redirectCountdown}s&hellip;
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.location.replace('/')}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[var(--success)] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:brightness-110 active:scale-95"
          >
            <span>Open App</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Phase: Down or Checking
  const progressPercent = ((POLL_INTERVAL_SECONDS - countdown) / POLL_INTERVAL_SECONDS) * 100
  const isBusy = phase === 'checking' || isManualChecking

  return (
    <div className="space-y-2.5 text-left">
      {/* Integrated Health & Auto-Refresh Card */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-2">
          {/* Status Pulse */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--warning-text)] opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--warning-text)]" />
            </span>
            <span className="truncate text-xs font-bold text-[var(--text-primary)]">
              {isBusy ? 'Checking database connection…' : 'DOTM Gateway Syncing'}
            </span>
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isBusy}
            title="Check status immediately"
            className="group shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-2xs transition hover:border-[var(--nepal-blue)] hover:bg-[var(--bg-secondary)]/60 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`${isBusy ? 'animate-spin-smooth text-[var(--nepal-blue)]' : 'text-[var(--text-muted)] transition-transform duration-300 group-hover:rotate-180'}`}
              aria-hidden
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>{isBusy ? 'Testing…' : 'Check Now'}</span>
          </button>
        </div>

        {/* Progress Bar & Countdown */}
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
            <span className="font-medium">Auto-checks every 2 minutes</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">
              next in {formatCountdown(countdown)}
            </span>
          </div>

          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border-default)]/60"
            role="progressbar"
            aria-valuenow={countdown}
            aria-valuemin={0}
            aria-valuemax={POLL_INTERVAL_SECONDS}
            aria-label="Automatic 2-minute check progress"
          >
            <div
              className="h-full bg-gradient-to-r from-[var(--nepal-blue)] to-[var(--nepal-blue-mid)] transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Diagnostic Micro-chips */}
        <div className="mt-2 flex items-center justify-between pt-1 text-[11px] text-[var(--text-secondary)]">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--nepal-blue)]" />
            Database Mirror: Standby
          </span>
          <span className="font-medium">{lastCheckedTime ? `Tested at ${lastCheckedTime}` : 'Connecting…'}</span>
        </div>
      </div>
    </div>
  )
}
