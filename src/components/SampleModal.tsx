'use client'

import Image from 'next/image'
import type { Language } from '@/lib/i18n'

interface SampleModalProps {
  isOpen: boolean
  onClose: () => void
  language: Language
}

export default function SampleModal({ isOpen, onClose, language }: SampleModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="License format guide"
        className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-[var(--surface-primary)] shadow-2xl animate-rise-in border border-[var(--border-default)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close guide"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-[var(--nepal-red)] hover:scale-105 active:scale-95 shadow-md"
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
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="p-3 bg-[var(--bg-secondary)]/50">
          <Image
            src="/license-sample2.png"
            alt="License format guide"
            width={1200}
            height={760}
            className="h-auto w-full rounded-2xl object-cover shadow-xs border border-[var(--border-default)]"
            priority
          />
        </div>
        <div className="p-5 text-center">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-[var(--text-primary)]">
            {language === 'ne' ? 'ढाँचा निर्देशिका' : 'Format Guide'}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
            {language === 'ne'
              ? 'तपाईंको अनुमति पत्र नम्बर अस्थायी रसिद वा पुरानो स्मार्ट कार्डमा फेला पार्न सक्नुहुन्छ।'
              : 'You can find your license number on your temporary receipt or your old smart card.'}
          </p>
        </div>
      </div>
    </div>
  )
}
