'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { useSwipeDownToClose } from '@/hooks/useSwipeDownToClose'
import type { Language } from '@/lib/i18n'

interface SponsorModalProps {
  isOpen: boolean
  onClose: () => void
  language?: Language
}

type WalletType = 'esewa' | 'khalti'

const WALLET_ASSET_VERSION = 'v=20261118-2'

export default function SponsorModal({
  isOpen,
  onClose,
  language = 'en',
}: SponsorModalProps) {
  const [selectedWallet, setSelectedWallet] = useState<WalletType>('esewa')
  const [isDownloading, setIsDownloading] = useState(false)

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

  const wallets = {
    esewa: {
      id: 'esewa',
      name: 'eSewa',
      subtitle: isNe ? 'ईसेवा डिजिटल वालेट' : 'eSewa Digital Wallet',
      image: `/wallet/Esewa_QR.jpg?${WALLET_ASSET_VERSION}`,
      downloadName: 'Esewa-QR-NepalLicenseChecker.jpg',
      themeColor: '#60bb46',
      badgeBg: 'bg-[#60bb46]/10 text-[#60bb46] border-[#60bb46]/30',
      activeTabClass:
        'bg-[#60bb46] text-white shadow-sm font-bold',
      accentBorder: 'border-[#60bb46]/40',
      accentGlow: 'shadow-[0_0_24px_rgba(96,187,70,0.15)]',
      instructions: isNe
        ? 'eSewa एप खोल्नुहोस् > QR Scan थिच्नुहोस् > "Scan from Gallery" छान्नुहोस्।'
        : 'Open eSewa app > Tap QR Scan > Select "Scan from Gallery".',
    },
    khalti: {
      id: 'khalti',
      name: 'Khalti',
      subtitle: isNe ? 'खल्ती डिजिटल वालेट' : 'Khalti Digital Wallet',
      image: `/wallet/Khaliti_QR.png?${WALLET_ASSET_VERSION}`,
      downloadName: 'Khalti-QR-NepalLicenseChecker.png',
      themeColor: '#5c2d91',
      badgeBg: 'bg-[#5c2d91]/10 text-[#7a3db8] dark:text-[#a875e2] border-[#5c2d91]/30',
      activeTabClass:
        'bg-[#5c2d91] text-white shadow-sm font-bold',
      accentBorder: 'border-[#5c2d91]/40',
      accentGlow: 'shadow-[0_0_24px_rgba(92,45,145,0.18)]',
      instructions: isNe
        ? 'Khalti एप खोल्नुहोस् > QR Scan थिच्नुहोस् > "Gallery" बाट यो QR छान्नुहोस्।'
        : 'Open Khalti app > Tap QR Scan > Select this QR from your Gallery.',
    },
  }

  const currentWallet = wallets[selectedWallet]

  const handleDownloadQR = async () => {
    setIsDownloading(true)
    try {
      const response = await fetch(currentWallet.image, { cache: 'reload' })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = currentWallet.downloadName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(
        isNe
          ? `${currentWallet.name} QR ग्यालरीमा सेभ भयो! एप खोलेर Scan from Gallery गर्नुहोस्।`
          : `${currentWallet.name} QR saved! Open your wallet app and scan from gallery.`
      )
    } catch {
      // Fallback direct download link
      const a = document.createElement('a')
      a.href = currentWallet.image
      a.download = currentWallet.downloadName
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success(
        isNe
          ? 'QR तस्बिर डाउनलोड भयो।'
          : 'QR image opened / downloaded.'
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?view=sponsor` : ''
    if (navigator.share) {
      try {
        await navigator.share({
          title: isNe ? 'नेपाल लाइसेन्स जाँच - परियोजना सहयोग' : 'Support Nepal License Checker',
          text: isNe
            ? 'नेपाल लाइसेन्स जाँच पोर्टललाई निःशुल्क र विज्ञापनरहित राखिराख्न स्वेच्छिक सहयोग गर्नुहोस्।'
            : 'Support Nepal License Checker to keep this civic platform free and ad-free.',
          url,
        })
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(url)
      toast.success(isNe ? 'लिङ्क कपी गरियो!' : 'Link copied to clipboard!')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md transition-opacity duration-300"
      style={backdropStyle}
      onClick={triggerClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-modal-title"
    >
      <div
        style={modalStyle}
        {...containerProps}
        className="relative flex max-h-[92vh] sm:max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] sm:rounded-3xl dev-glass-card shadow-2xl border border-[var(--border-default)] animate-rise-in pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Swipe-to-Close Drag Indicator */}
        <div
          className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none sm:hidden"
          {...handleProps}
        >
          <div className="w-12 h-1.5 bg-[var(--border-default)] hover:bg-[var(--text-muted)] rounded-full transition-colors" />
          <span className="text-[10px] text-[var(--text-muted)] mt-1 font-medium opacity-65 tracking-tight">
            {isNe ? 'बन्द गर्न तल तान्नुहोस्' : 'Swipe down to close'}
          </span>
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)]/70 px-5 py-3.5 sm:px-6 sm:py-4 bg-[var(--bg-secondary)]/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-xs">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <h2
                id="sponsor-modal-title"
                className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)] leading-tight"
              >
                {isNe ? 'परियोजनालाई सहयोग गर्नुहोस्' : 'Support this Project'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] font-medium">
                {isNe
                  ? 'निःशुल्क नागरिक सेवालाई निरन्तरता दिन स्वेच्छिक सहयोग'
                  : 'Voluntary civic contribution via Digital Wallet'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={triggerClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)]/50 transition cursor-pointer border border-[var(--border-default)] shrink-0"
            aria-label={isNe ? 'बन्द गर्नुहोस्' : 'Close'}
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
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
          {/* Transparency & Civic Mission Note */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 sm:p-4 text-xs leading-relaxed text-[var(--text-secondary)] shadow-2xs">
            <div className="flex items-center gap-2 mb-1.5 font-bold text-[var(--text-primary)]">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {isNe
                  ? '१००% विज्ञापनरहित तथा खुला-स्रोत नागरिक सेवा'
                  : '100% Free, Ad-Free & Open-Source Civic Platform'}
              </span>
            </div>
            <p>
              {isNe
                ? 'यो पोर्टल कुनै सरकारी अनुदान बिना स्वतन्त्र रूपमा सञ्चालित छ। तपाईँको सानो स्वेच्छिक सहयोग (रु. १०, २५, ५०, १०० वा आफ्नो इच्छा अनुसार) सिधै दैनिक क्लाउड सर्भर, डेटाबेस सिङ्क तथा डोमेन नवीकरणमा खर्च हुनेछ।'
                : 'Nepal License Checker runs independently with zero ads. Your voluntary contributions (NPR 10, 25, 50, 100 or whatever you wish) directly fund automated scraper cloud servers, database queries, and domain upkeep.'}
            </p>
          </div>

          {/* Wallet Switcher Tabs (eSewa & Khalti) */}
          <div className="flex items-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1 gap-1">
            <button
              type="button"
              onClick={() => setSelectedWallet('esewa')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedWallet === 'esewa'
                  ? wallets.esewa.activeTabClass
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]/60'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  selectedWallet === 'esewa' ? 'bg-white' : 'bg-[#60bb46]'
                }`}
              />
              <span>eSewa</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedWallet('khalti')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                selectedWallet === 'khalti'
                  ? wallets.khalti.activeTabClass
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-primary)]/60'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  selectedWallet === 'khalti' ? 'bg-white' : 'bg-[#5c2d91]'
                }`}
              />
              <span>Khalti</span>
            </button>
          </div>

          {/* Selected Wallet Card & QR Frame */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 bg-[var(--surface-primary)] transition-all flex flex-col items-center ${currentWallet.accentBorder} ${currentWallet.accentGlow}`}
          >
            {/* Wallet Header Badge */}
            <div className="flex items-center justify-between w-full mb-3 pb-2.5 border-b border-[var(--border-default)]/60">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentWallet.badgeBg}`}
                >
                  {currentWallet.name}
                </span>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  {currentWallet.subtitle}
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                {isNe ? 'कुनै पनि रकम' : 'Any Amount'}
              </span>
            </div>

            {/* QR Code Container - Pure White Frame for Easy Camera & Gallery Scanning */}
            <div className="relative w-full max-w-[280px] sm:max-w-[300px] aspect-square rounded-2xl bg-white p-2.5 shadow-md border border-neutral-200 overflow-hidden group">
              <div className="relative w-full h-full">
                <Image
                  src={currentWallet.image}
                  alt={`${currentWallet.name} QR Code for donation`}
                  fill
                  unoptimized
                  className="object-contain rounded-xl"
                  sizes="(max-width: 640px) 280px, 300px"
                  priority
                />
              </div>
            </div>

            {/* Mobile-Friendly Instruction */}
            <p className="mt-3 text-center text-[11px] text-[var(--text-secondary)] leading-relaxed max-w-xs">
              <span className="font-semibold text-[var(--text-primary)]">
                {isNe ? 'मोबाइलबाट भुक्तानी गर्न: ' : 'On mobile: '}
              </span>
              {currentWallet.instructions}
            </p>

            {/* Action Buttons: Download QR & Share */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 w-full">
              <button
                type="button"
                onClick={handleDownloadQR}
                disabled={isDownloading}
                className="flex-1 min-w-[170px] inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold text-white transition active:scale-95 shadow-sm cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: currentWallet.themeColor }}
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
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>
                  {isDownloading
                    ? isNe
                      ? 'डाउनलोड हुँदैछ...'
                      : 'Saving QR...'
                    : isNe
                      ? `${currentWallet.name} QR सेभ गर्नुहोस्`
                      : `Save ${currentWallet.name} QR`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] hover:bg-[var(--bg-secondary)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition active:scale-95 shadow-2xs cursor-pointer"
                title={isNe ? 'लिङ्क सेयर गर्नुहोस्' : 'Share Sponsor Link'}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>{isNe ? 'सेयर' : 'Share'}</span>
              </button>
            </div>
          </div>

          {/* 4 Quick Steps Helper Grid */}
          <div className="rounded-2xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/60 p-3 sm:p-3.5">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--nepal-blue)]"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>{isNe ? 'सहयोग गर्ने सरल विधि' : 'Easy 3-Step Process'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-[var(--border-default)]/50 bg-[var(--surface-primary)] p-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] font-bold text-[10px] mb-1">
                  1
                </span>
                <p className="text-[10px] font-semibold text-[var(--text-primary)]">
                  {isNe ? 'QR सेभ गर्नुहोस्' : 'Save QR'}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-default)]/50 bg-[var(--surface-primary)] p-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] font-bold text-[10px] mb-1">
                  2
                </span>
                <p className="text-[10px] font-semibold text-[var(--text-primary)]">
                  {isNe ? 'Scan from Gallery' : 'Scan Gallery'}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-default)]/50 bg-[var(--surface-primary)] p-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] mb-1">
                  3
                </span>
                <p className="text-[10px] font-semibold text-[var(--text-primary)]">
                  {isNe ? 'स्वेच्छिक सहयोग' : 'Send Amount'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-[var(--border-default)]/70 px-5 py-3 sm:px-6 bg-[var(--bg-secondary)]/50 flex items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <span>{isNe ? 'साथ र सहयोगका लागि धन्यवाद!' : 'Thank you for your support!'}</span>
            <span className="text-rose-500">❤️</span>
          </span>

          <button
            type="button"
            onClick={triggerClose}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)]/40 transition active:scale-95 cursor-pointer"
          >
            {isNe ? 'बन्द गर्नुहोस्' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
