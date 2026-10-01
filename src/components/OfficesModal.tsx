'use client'

import { useState, useMemo } from 'react'
import { getAllTransportOffices } from '@/lib/offices'
import type { OfficesModalCopy } from '@/lib/i18n'

interface OfficesModalProps {
  isOpen: boolean
  onClose: () => void
  copy: OfficesModalCopy
  language: 'en' | 'ne'
}

export default function OfficesModal({ isOpen, onClose, copy, language }: OfficesModalProps) {
  const [search, setSearch] = useState('')
  const offices = useMemo(() => getAllTransportOffices(), [])

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
        o.provinceNe.includes(q)
      )
    })
  }, [offices, search])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offices-modal-title"
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-2xl animate-rise-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-blue-soft)] to-transparent p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--nepal-blue)] text-white text-xs font-bold">
                🏢
              </span>
              <h2 id="offices-modal-title" className="text-base font-extrabold text-[var(--text-primary)] sm:text-lg">
                {copy.title}
              </h2>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{copy.subtitle}</p>
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
              className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] pl-9 pr-3 text-xs outline-none transition focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/20 sm:text-sm"
            />
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
                className="flex items-start justify-between gap-3 p-3 transition hover:bg-[var(--bg-secondary)]/70 rounded-xl"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--nepal-blue-soft)] font-mono text-xs font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20">
                    {office.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[var(--text-primary)] sm:text-sm">
                      {language === 'ne' ? office.nameNe : office.nameEn}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--text-secondary)] sm:text-xs">
                      📍 {language === 'ne' ? office.addressNe : office.addressEn}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border-default)]">
                        {language === 'ne' ? office.provinceNe : office.provinceEn}
                      </span>
                      {office.phone && (
                        <a
                          href={`tel:${office.phone.replace(/[^0-9]/g, '')}`}
                          className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[var(--nepal-blue)] hover:underline"
                        >
                          📞 {office.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
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
