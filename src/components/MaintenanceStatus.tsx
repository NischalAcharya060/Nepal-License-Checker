'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Phase = 'checking' | 'down' | 'restored'

const POLL_INTERVAL_MS = 20000

export default function MaintenanceStatus() {
  const [phase, setPhase] = useState<Phase>('checking')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/meta', { cache: 'no-store' })
      setPhase(res.ok ? 'restored' : 'down')
    } catch {
      setPhase('down')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      await check()
      if (cancelled) return
      timerRef.current = setTimeout(tick, POLL_INTERVAL_MS)
    }

    tick()

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [check])

  const restored = phase === 'restored'

  return (
    <div className="space-y-4">
      {restored && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 shrink-0 text-[var(--success)]"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--success)]">
              The service is back online.
              <span lang="ne" className="ml-1 font-medium">सेवा पुनः सक्रिय भयो।</span>
            </p>
            <Link href="/" className="mt-1 inline-block text-xs font-semibold text-[var(--success)] underline">
              Continue to the search tool &rarr;
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => void check()}
          disabled={restored}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99] disabled:cursor-default disabled:opacity-60"
        >
          {phase === 'checking' ? 'Checking status…' : 'Check again'}
        </button>

        <a
          href="https://dotm.gov.np/category/details-of-printed-licenses/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-5 py-3 text-sm font-bold text-[var(--text-primary)] transition hover:brightness-95 active:scale-[0.99]"
        >
          View official DOTM list
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
            <path d="M7 17 17 7" />
            <path d="M7 7h10v10" />
          </svg>
        </a>
      </div>

      <p className="text-xs text-[var(--text-muted)]" aria-live="polite">
        {restored
          ? 'The database connection is responding normally again.'
          : 'Still unavailable. This page checks automatically every 20 seconds.'}
      </p>
    </div>
  )
}
