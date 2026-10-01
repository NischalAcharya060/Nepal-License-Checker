'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { SmsGuideCopy } from '@/lib/i18n'

interface SmsModalProps {
  isOpen: boolean
  onClose: () => void
  copy: SmsGuideCopy
  language: 'en' | 'ne'
}

export default function SmsModal({ isOpen, onClose, copy, language }: SmsModalProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const sampleFormat = 'LC 12345678'

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleFormat).then(() => {
      setCopied(true)
      toast.success(language === 'ne' ? 'ढाँचा प्रतिलिपि गरियो!' : 'Format copied!')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sms-modal-title"
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-2xl animate-rise-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-blue-soft)] to-transparent p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white text-lg font-bold">
              📱
            </span>
            <div>
              <h2 id="sms-modal-title" className="text-base font-extrabold text-[var(--text-primary)] sm:text-lg">
                {copy.title}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">{copy.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
            aria-label={copy.closeLabel}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="text-xs font-bold text-[var(--text-primary)]">{copy.step1Title}</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.step1Desc}</p>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="text-xs font-bold text-[var(--text-primary)]">{copy.step2Title}</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.step2Desc}</p>

            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-[var(--nepal-blue)]/30 bg-[var(--surface-primary)] px-3 py-2 font-mono text-sm font-bold text-[var(--nepal-blue)]">
              <span>{sampleFormat}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-sans font-semibold text-[var(--nepal-blue)] hover:underline"
              >
                {copied ? (language === 'ne' ? 'प्रतिलिपि गरियो' : 'Copied!') : (language === 'ne' ? 'प्रतिलिपि' : 'Copy')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
            <div className="text-xs font-bold text-[var(--text-primary)]">{copy.step3Title}</div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.step3Desc}</p>
          </div>

          <div className="rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] p-3 text-[11px] leading-5 text-[var(--info-text)]">
            ℹ️ {copy.carrierNote}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)]"
          >
            {copy.closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
