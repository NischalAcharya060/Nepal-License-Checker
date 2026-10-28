'use client'

import { useState, useMemo, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useSwipeDownToClose } from '@/hooks/useSwipeDownToClose'
import { getAllTransportOffices, type TransportOffice } from '@/lib/offices'
import type { OfficesModalCopy } from '@/lib/i18n'

interface OfficesModalProps {
  isOpen: boolean
  onClose: () => void
  copy: OfficesModalCopy
  language: 'en' | 'ne'
}

export default function OfficesModal({ isOpen, onClose, copy, language }: OfficesModalProps) {
  const [search, setSearch] = useState('')
  const [selectedOffice, setSelectedOffice] = useState<TransportOffice | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const offices = useMemo(() => getAllTransportOffices(), [])

  // Handle Escape key properly: closes detail modal if open, else closes main modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedOffice) {
          setSelectedOffice(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedOffice, onClose])

  const filtered = useMemo(() => {
    if (!search.trim()) return offices
    const q = search.toLowerCase().trim()
    return offices.filter((o) => {
      return (
        o.code.includes(q) ||
        o.nameEn.toLowerCase().includes(q) ||
        o.nameNe.includes(q) ||
        o.locationEn.toLowerCase().includes(q) ||
        o.locationNe.includes(q) ||
        o.provinceEn.toLowerCase().includes(q) ||
        o.provinceNe.includes(q) ||
        (o.phone && o.phone.toLowerCase().includes(q)) ||
        (o.email && o.email.toLowerCase().includes(q)) ||
        (o.website && o.website.toLowerCase().includes(q))
      )
    })
  }, [offices, search])

  const fallbackCopy = (text: string, onSuccess: () => void) => {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      textArea.style.top = '0'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      if (successful) {
        onSuccess()
      } else {
        toast.error(language === 'ne' ? 'कपी गर्न सकिएन' : 'Failed to copy')
      }
    } catch {
      toast.error(language === 'ne' ? 'कपी गर्न सकिएन' : 'Failed to copy')
    }
  }

  const handleCopy = (text: string, label: string) => {
    if (!text) return
    const onSuccess = () => {
      setCopiedField(label)
      toast.success(
        language === 'ne'
          ? `${label} प्रतिलिपि गरियो!`
          : `Copied ${label}!`
      )
      setTimeout(() => setCopiedField(null), 2000)
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(text)
        .then(onSuccess)
        .catch(() => fallbackCopy(text, onSuccess))
    } else {
      fallbackCopy(text, onSuccess)
    }
  }

  const {
    isRendered,
    triggerClose,
    modalStyle,
    backdropStyle,
    handleProps,
    containerProps,
  } = useSwipeDownToClose({
    isOpen: isOpen && !selectedOffice,
    onClose,
  })

  if (!isOpen && !isRendered) return null

  return (
    <>
      {/* Main Offices Directory Modal */}
      <div
        style={{ zIndex: 1000, ...backdropStyle }}
        className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm transition-opacity duration-300"
        onClick={triggerClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="offices-modal-title"
      >
        <div
          style={modalStyle}
          {...containerProps}
          className="relative flex max-h-[90vh] sm:max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-3xl dev-glass-card shadow-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile handle indicator & Swipe Down zone */}
          <div
            className="w-full pt-3 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none sm:hidden"
            {...handleProps}
          >
            <div className="w-12 h-1.5 bg-[var(--border-default)] hover:bg-[var(--text-muted)] rounded-full transition-colors" />
            <span className="text-[10px] text-[var(--text-muted)] mt-1 font-medium opacity-65 tracking-tight">
              Swipe down to close
            </span>
          </div>

          {/* Header */}
          <div
            className="flex items-start justify-between border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-blue-soft)] to-transparent p-4 sm:p-5 select-none cursor-grab active:cursor-grabbing sm:cursor-default"
            {...handleProps}
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--nepal-blue)] text-white shadow-xs">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <line x1="9" y1="22" x2="9" y2="22.01" />
                    <line x1="15" y1="22" x2="15" y2="22.01" />
                    <line x1="8" y1="6" x2="8" y2="6.01" />
                    <line x1="16" y1="6" x2="16" y2="6.01" />
                    <line x1="8" y1="10" x2="8" y2="10.01" />
                    <line x1="16" y1="10" x2="16" y2="10.01" />
                    <line x1="8" y1="14" x2="8" y2="14.01" />
                    <line x1="16" y1="14" x2="16" y2="14.01" />
                    <line x1="8" y1="18" x2="8" y2="18.01" />
                    <line x1="16" y1="18" x2="16" y2="18.01" />
                  </svg>
                </span>
                <h2 id="offices-modal-title" className="text-base font-extrabold text-[var(--text-primary)] sm:text-lg">
                  {copy.title}
                </h2>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={triggerClose}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-label={copy.closeLabel}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Search input */}
          <div className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-3 sm:px-5">
            <div className="relative">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={copy.searchPlaceholder}
                autoFocus
                className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] pl-9 pr-8 text-xs outline-none transition focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Offices list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-default)]/70 p-1 sm:p-2">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] sm:text-sm">
                {copy.noMatch}
              </div>
            ) : (
              filtered.map((office) => (
                <div
                  key={office.code}
                  onClick={() => setSelectedOffice(office)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 transition hover:bg-[var(--bg-secondary)]/80 rounded-xl cursor-pointer group"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] font-mono text-xs font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 group-hover:bg-[var(--nepal-blue)] group-hover:text-white transition-colors shadow-2xs">
                      {office.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-[var(--text-primary)] sm:text-sm group-hover:text-[var(--nepal-blue)] transition-colors">
                          {language === 'ne' ? office.nameNe : office.nameEn}
                        </span>
                        <span className="text-[10.5px] text-[var(--text-muted)] font-medium">
                          ({language === 'ne' ? office.provinceNe : office.provinceEn})
                        </span>
                      </div>

                      <div className="mt-0.5 text-[11px] text-[var(--text-secondary)] sm:text-xs flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{language === 'ne' ? office.addressNe : office.addressEn}</span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {office.phone && (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-primary)] px-2 py-0.5 rounded border border-[var(--border-default)]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <span>{office.phone}</span>
                          </span>
                        )}
                        {office.website && (
                          <a
                            href={office.website.startsWith('http') ? office.website : `https://${office.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--nepal-blue)] bg-[var(--nepal-blue-soft)] px-2 py-0.5 rounded border border-[var(--nepal-blue)]/20 hover:underline"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="2" y1="12" x2="22" y2="12" />
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            <span>{office.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} ↗</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end sm:flex-shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOffice(office)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue-soft)] px-3 py-1.5 text-xs font-bold text-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)] hover:text-white transition shadow-2xs group-hover:bg-[var(--nepal-blue)] group-hover:text-white"
                    >
                      <span>{language === 'ne' ? 'विवरण हेर्नुहोस्' : 'View details'}</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">
              {language === 'ne' ? 'कार्यालय वा "विवरण हेर्नुहोस्" मा क्लिक गरी पूरा जानकारी हेर्नुहोस्' : 'Click any office or "View details" for full details & copy'}
            </span>
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

      {/* Office Details Modal with One-Click Copy */}
      {selectedOffice && (
        <div
          style={{ zIndex: 2000 }}
          className="fixed inset-0 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedOffice(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="office-detail-title"
        >
          <div
            style={{ zIndex: 2001 }}
            className="relative flex max-h-[90vh] sm:max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] sm:rounded-3xl dev-glass-card shadow-2xl animate-rise-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[var(--border-default)] rounded-full mx-auto my-2 sm:hidden" aria-hidden />

            {/* Header */}
            <div className="flex items-start justify-between border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-blue-soft)] to-transparent p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white font-mono text-base font-bold shadow-sm">
                  {selectedOffice.code}
                </span>
                <div>
                  <h3 id="office-detail-title" className="text-base font-extrabold text-[var(--text-primary)]">
                    {language === 'ne' ? selectedOffice.nameNe : selectedOffice.nameEn}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {language === 'ne' ? selectedOffice.provinceNe : selectedOffice.provinceEn} · {selectedOffice.locationEn}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOffice(null)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
              {/* Phone */}
              {selectedOffice.phone ? (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>{language === 'ne' ? 'सम्पर्क फोन नम्बर' : 'Primary Phone Number'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      {selectedOffice.phone}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedOffice.phone || '', 'Phone')}
                        className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition shadow-2xs cursor-pointer"
                      >
                        {copiedField === 'Phone' ? (language === 'ne' ? 'कपी भयो' : 'Copied!') : (language === 'ne' ? 'कपी' : 'Copy')}
                      </button>
                      {(() => {
                        const rawPhone = selectedOffice.phone.split('/')[0].trim().replace(/[^0-9+]/g, '')
                        return rawPhone ? (
                          <a
                            href={`tel:${rawPhone}`}
                            className="rounded-lg bg-[var(--nepal-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--nepal-blue-mid)] transition shadow-2xs inline-flex items-center gap-1.5"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <span>{language === 'ne' ? 'कल' : 'Call'}</span>
                          </a>
                        ) : null
                      })()}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Email */}
              {selectedOffice.email ? (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    <span>{language === 'ne' ? 'आधिकारिक इमेल' : 'Official Contact Email'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs sm:text-sm font-semibold text-[var(--text-primary)] break-all">
                      {selectedOffice.email}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedOffice.email || '', 'Email')}
                        className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition shadow-2xs cursor-pointer"
                      >
                        {copiedField === 'Email' ? (language === 'ne' ? 'कपी भयो' : 'Copied!') : (language === 'ne' ? 'कपी' : 'Copy')}
                      </button>
                      <a
                        href={`mailto:${selectedOffice.email}`}
                        className="rounded-lg bg-[var(--nepal-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--nepal-blue-mid)] transition shadow-2xs inline-flex items-center gap-1.5"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                        <span>{language === 'ne' ? 'इमेल' : 'Email'}</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Website */}
              {selectedOffice.website ? (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5">
                  <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span>{language === 'ne' ? 'अनलाइन पोर्टल / वेबसाइट' : 'Dedicated Online Portal'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs sm:text-sm font-semibold text-[var(--nepal-blue)] break-all">
                      {selectedOffice.website}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedOffice.website || '', 'Website')}
                        className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition shadow-2xs cursor-pointer"
                      >
                        {copiedField === 'Website' ? (language === 'ne' ? 'कपी भयो' : 'Copied!') : (language === 'ne' ? 'कपी' : 'Copy')}
                      </button>
                      <a
                        href={selectedOffice.website.startsWith('http') ? selectedOffice.website : `https://${selectedOffice.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-[var(--nepal-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--nepal-blue-mid)] transition shadow-2xs inline-flex items-center gap-1"
                      >
                        <span>{language === 'ne' ? 'खोल्नुहोस्' : 'Visit'}</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Address */}
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5">
                <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{language === 'ne' ? 'कार्यालय ठेगाना' : 'Office Location & Address'}</span>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    {language === 'ne' ? selectedOffice.addressNe : selectedOffice.addressEn}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(language === 'ne' ? selectedOffice.addressNe : selectedOffice.addressEn, 'Address')}
                    className="flex-shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition shadow-2xs cursor-pointer"
                  >
                    {copiedField === 'Address' ? (language === 'ne' ? 'कपी भयो' : 'Copied!') : (language === 'ne' ? 'ठेगाना कपी' : 'Copy Address')}
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 sm:px-5 py-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedOffice(null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-bold text-[var(--nepal-blue)] transition hover:bg-[var(--nepal-blue-soft)]"
              >
                ← {language === 'ne' ? 'सूचीमा फर्कनुहोस्' : 'Back to Directory'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedOffice(null)}
                className="rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--nepal-blue-mid)]"
              >
                {language === 'ne' ? 'सकियो' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
