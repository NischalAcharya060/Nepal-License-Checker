'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import Image from 'next/image'
import { usePwa } from './PwaProvider'
import { InstallHelpModal } from './InstallAppButton'
import { translations } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'

interface PwaInstallPopupProps {
  language: Language
}

const DISMISS_STORAGE_KEY = 'pwa_popup_dismissed_until'
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const MOBILE_POPUP_DELAY_MS = 7500 // Show after user spends 7.5s (within 5-10s window) on the page
const emptySubscribe = () => () => {}

export default function PwaInstallPopup({ language }: PwaInstallPopupProps) {
  const { canInstall, isInstalled, install } = usePwa()
  const [isOpen, setIsOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  const copy = translations[language].pwa

  // Detect mobile & evaluate dismissal cooldown
  useEffect(() => {
    // Never show if running inside standalone PWA
    if (isInstalled) return

    // Only show on smaller devices (< 768px)
    const isMobileDevice =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))

    if (!isMobileDevice) return

    try {
      const dismissedUntil = window.localStorage.getItem(DISMISS_STORAGE_KEY)
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        return
      }
    } catch {
      // Ignore localStorage read errors
    }

    // Delay showing popup until user has spent 5-10 seconds on the page on smaller devices
    const timer = window.setTimeout(() => {
      setIsOpen(true)
    }, MOBILE_POPUP_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [isInstalled])

  const handleDismiss = () => {
    setIsOpen(false)
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() + DISMISS_DURATION_MS))
    } catch {
      // Ignore storage write errors
    }
  }

  const handleInstallClick = async () => {
    if (canInstall) {
      await install()
      setIsOpen(false)
      return
    }

    // If native prompt is unavailable (e.g. iOS Safari, Android in-app browser), show guided steps
    setIsHelpOpen(true)
  }

  if (!isMounted || isInstalled || !isOpen) {
    return (
      <>
        {isHelpOpen && (
          <InstallHelpModal copy={copy} onClose={() => setIsHelpOpen(false)} />
        )}
      </>
    )
  }

  return (
    <>
      {/* Floating Bottom Card for Smaller Devices */}
      <aside
        role="dialog"
        aria-modal="false"
        aria-label={copy.popupTitle}
        className="fixed bottom-3 inset-x-3 z-40 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 sm:hidden print:hidden"
      >
        <div className="relative overflow-hidden rounded-2xl border border-[var(--nepal-blue)]/40 bg-[var(--surface-primary)]/95 p-4 shadow-2xl backdrop-blur-md">
          {/* Subtle top accent gradient */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--nepal-blue)] via-blue-500 to-[var(--nepal-red)]" />

          {/* Close / Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={copy.notNowLabel}
            className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nepal-blue)]"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Header with App Logo & Title */}
          <div className="flex items-start gap-3 pr-8">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--border-default)] shadow-xs">
              <Image
                src="/android-chrome-192x192.png"
                alt="Nepal License Checker Logo"
                width={48}
                height={48}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--nepal-blue-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)]">
                {copy.popupSubtitle}
              </div>
              <h3 className="mt-1 text-sm font-extrabold text-[var(--text-primary)] leading-snug">
                {copy.popupTitle}
              </h3>
            </div>
          </div>

          {/* Pitch text */}
          <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {copy.popupDescription}
          </p>

          {/* Action buttons */}
          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue)]/90 active:scale-[0.98]"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 3v12" />
                <path d="m7 12 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
              <span>{copy.installButton}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-primary)] hover:text-[var(--text-primary)]"
            >
              {copy.notNowLabel}
            </button>
          </div>
        </div>
      </aside>

      {/* Guided Helper Modal (for iOS Safari or Android when prompt is non-programmatic) */}
      {isHelpOpen && (
        <InstallHelpModal
          copy={copy}
          onClose={() => {
            setIsHelpOpen(false)
            setIsOpen(false)
          }}
        />
      )}
    </>
  )
}
