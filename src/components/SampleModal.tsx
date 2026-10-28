'use client'

import React from 'react'
import Image from 'next/image'
import { useSwipeDownToClose } from '@/hooks/useSwipeDownToClose'
import type { Language } from '@/lib/i18n'

interface SampleModalProps {
  isOpen: boolean
  onClose: () => void
  language: Language
}

export default function SampleModal({ isOpen, onClose, language }: SampleModalProps) {
  const {
    isRendered,
    triggerClose,
    modalStyle,
    backdropStyle,
    handleProps,
    containerProps,
  } = useSwipeDownToClose({
    isOpen,
    onClose,
  })

  if (!isRendered) return null

  const isNe = language === 'ne'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-4 backdrop-blur-md transition-opacity duration-300"
      style={backdropStyle}
      onClick={triggerClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="License format guide"
        style={modalStyle}
        {...containerProps}
        className="relative w-full max-w-xl overflow-hidden rounded-t-[28px] sm:rounded-3xl dev-glass-card shadow-2xl border border-[var(--border-default)] pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Mobile handle indicator & Swipe Down zone */}
        <div
          className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none sm:hidden"
          {...handleProps}
        >
          <div className="w-12 h-1.5 bg-[var(--border-default)] hover:bg-[var(--text-muted)] rounded-full transition-colors" />
          <span className="text-[10px] text-[var(--text-muted)] mt-1 font-medium opacity-65 tracking-tight">
            {isNe ? 'बन्द गर्न तल तान्नुहोस्' : 'Swipe down to close'}
          </span>
        </div>

        <button
          type="button"
          aria-label="Close guide"
          onClick={triggerClose}
          className="absolute right-3.5 top-3.5 z-10 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-all hover:bg-[var(--nepal-red)] hover:scale-105 active:scale-95 shadow-md cursor-pointer"
        >
          <svg
            width="20"
            height="20"
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
            {isNe ? 'ढाँचा निर्देशिका' : 'Format Guide'}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
            {isNe
              ? 'तपाईंको अनुमति पत्र नम्बर अस्थायी रसिद वा पुरानो स्मार्ट कार्डमा फेला पार्न सक्नुहुन्छ।'
              : 'You can find your license number on your temporary receipt or your old smart card.'}
          </p>
        </div>
      </div>
    </div>
  )
}
