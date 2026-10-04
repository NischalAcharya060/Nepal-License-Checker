'use client'

import { useEffect, useState } from 'react'
import { usePwa } from './PwaProvider'
import { translations } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'

interface InstallAppButtonProps {
  language: Language
  /** `pill` = compact navbar button, `tile` = full-width mobile-drawer row. */
  variant?: 'pill' | 'tile'
}

export default function InstallAppButton({ language, variant = 'pill' }: InstallAppButtonProps) {
  const { canInstall, isInstalled, needsIosHelp, install } = usePwa()
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const copy = translations[language].pwa

  useEffect(() => {
    if (!isHelpOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsHelpOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isHelpOpen])

  const isIosFlow = !canInstall && needsIosHelp

  if (isInstalled || (!canInstall && !isIosFlow)) return null

  const handleClick = () => {
    if (canInstall) {
      void install()
      return
    }
    setIsHelpOpen(true)
  }

  const label = canInstall ? copy.installButton : copy.installAriaLabel

  if (variant === 'tile') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue-soft)] px-3.5 py-2.5 text-left transition hover:border-[var(--nepal-blue)] active:scale-[0.99]"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nepal-blue)] text-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v12" />
                <path d="m7 12 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            </span>
            <span className="flex flex-col">
              <span className="text-xs font-bold text-[var(--text-primary)]">{copy.installTitle}</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{copy.offlineMessage}</span>
            </span>
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]" aria-hidden>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {isHelpOpen && (
          <InstallHelpModal copy={copy} onClose={() => setIsHelpOpen(false)} />
        )}
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        title={label}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] transition hover:bg-[var(--nepal-blue)] hover:text-white active:scale-95"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12" />
          <path d="m7 12 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      </button>

      {isHelpOpen && (
        <InstallHelpModal copy={copy} onClose={() => setIsHelpOpen(false)} />
      )}
    </>
  )
}

type InstallHelpModalProps = {
  copy: (typeof translations)['en']['pwa']
  onClose: () => void
}

function InstallHelpModal({ copy, onClose }: InstallHelpModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in print:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-2xl animate-rise-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-blue-soft)] to-transparent p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white shadow-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v12" />
                <path d="m7 12 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            </span>
            <div>
              <h2 id="install-modal-title" className="text-base font-extrabold text-[var(--text-primary)] sm:text-lg">
                {copy.installTitle}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{copy.installBody}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            aria-label={copy.gotItLabel}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)] text-[11px] font-bold text-white">
              1
            </span>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">{copy.iosStep1}</p>
          </div>

          <div className="flex gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)] text-[11px] font-bold text-white">
              2
            </span>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">{copy.iosStep2}</p>
          </div>

          <p className="rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] p-3 text-[11px] leading-5 text-[var(--info-text)]">
            ℹ️ {copy.iosNote}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-default)] p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 active:scale-95"
          >
            {copy.gotItLabel}
          </button>
        </div>
      </div>
    </div>
  )
}