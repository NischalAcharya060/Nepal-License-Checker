'use client'

import { useEffect, useState } from 'react'
import { usePwa } from './PwaProvider'
import { translations } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'

export default function OfflineBanner({ language }: { language: Language }) {
  const { isOffline } = usePwa()
  const [isDismissed, setIsDismissed] = useState(false)
  const copy = translations[language].pwa

  // Re-show the banner whenever the connection comes back.
  useEffect(() => {
    const onOnline = () => setIsDismissed(false)
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  if (!isOffline || isDismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))] print:hidden"
    >
      <div className="flex w-full max-w-2xl animate-rise-in items-start gap-3 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] px-4 py-2.5 shadow-lg">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-[var(--warning-text)]"
          aria-hidden
        >
          <path d="M1 1l22 22" />
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[var(--warning-text)]">{copy.offlineTitle}</p>
          <p className="text-[11px] leading-4 text-[var(--warning-text)]/90">
            {copy.offlineMessage} <span className="opacity-80">{copy.offlineCachedHint}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss offline notice"
          className="shrink-0 rounded-lg p-1 text-[var(--warning-text)] transition hover:bg-black/5 active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}