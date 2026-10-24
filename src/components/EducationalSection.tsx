'use client'

import Link from 'next/link'
import type { Language } from '@/lib/i18n'

interface EducationalSectionProps {
  language: Language
  tilesCopy: Array<{ title: string; text: string }>
  lastUpdatedLabel: string
  lastUpdatedDisplay: string
  indexedRecords: number | null
  dateLocale: string
  onOpenOffices: () => void
  onOpenSms: () => void
  onOpenSample: () => void
  onOpenNpm?: () => void
}

export default function EducationalSection({
  language,
  tilesCopy,
  lastUpdatedLabel,
  lastUpdatedDisplay,
  indexedRecords,
  dateLocale,
  onOpenOffices,
  onOpenSms,
  onOpenSample,
  onOpenNpm,
}: EducationalSectionProps) {
  const infoTiles = [
    {
      key: 'format',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
      title: tilesCopy[0]?.title ?? '',
      text: tilesCopy[0]?.text ?? '',
      showHelp: true,
      highlight: false,
      meta: null as string | null,
      metaSub: null as string | null,
    },
    {
      key: 'collection',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      title: tilesCopy[1]?.title ?? '',
      text: tilesCopy[1]?.text ?? '',
      showHelp: false,
      highlight: false,
      meta: null as string | null,
      metaSub: null as string | null,
    },
    {
      key: 'source',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: tilesCopy[2]?.title ?? '',
      text: tilesCopy[2]?.text ?? '',
      showHelp: false,
      highlight: false,
      meta: null as string | null,
      metaSub: null as string | null,
    },
    {
      key: 'recent',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      title: tilesCopy[3]?.title ?? '',
      text: tilesCopy[3]?.text ?? '',
      showHelp: false,
      highlight: true,
      meta: `${lastUpdatedLabel}: ${lastUpdatedDisplay}`,
      metaSub:
        indexedRecords !== null
          ? language === 'ne'
            ? `${indexedRecords.toLocaleString(dateLocale)} अभिलेख अनुक्रमणिकामा`
            : `${indexedRecords.toLocaleString(dateLocale)} records indexed`
          : null,
    },
  ]

  return (
    <section className="mt-7 animate-fade-in print:hidden" aria-label="Helpful info">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
          {language === 'ne' ? 'उपयोगी जानकारी तथा सेवाहरू' : 'Helpful Information & Services'}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {infoTiles.map((tile, i) => (
          <div
            key={tile.key}
            className={`group hover-lift animate-rise-in rounded-2xl border dev-glass-card p-5 shadow-sm transition-all duration-300 hover:border-[var(--nepal-blue)]/50 ${
              tile.highlight
                ? 'border-[var(--nepal-blue)]/40 bg-gradient-to-b from-[var(--surface-primary)] to-[var(--nepal-blue-soft)]/30'
                : 'border-[var(--border-default)]/70'
            }`}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] transition-transform duration-200 group-hover:scale-110 shadow-2xs">
              {tile.icon}
            </div>

            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                {tile.title}
              </div>
              {tile.showHelp && (
                <button
                  type="button"
                  onClick={onOpenSample}
                  className="rounded-full bg-[var(--nepal-blue-soft)] px-3 py-1 text-xs font-bold text-[var(--nepal-blue)] transition hover:bg-[var(--nepal-blue)] hover:text-white active:scale-95 cursor-pointer"
                >
                  {language === 'ne' ? 'ढाँचा हेर्नुहोस्' : 'View Sample'}
                </button>
              )}
            </div>

            <p className="text-xs leading-5 text-[var(--text-secondary)]">{tile.text}</p>

            {tile.meta && (
              <div className="mt-3.5 rounded-xl border border-[var(--nepal-blue)]/25 bg-[var(--surface-primary)]/80 p-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--nepal-blue)]">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[var(--success)] animate-glow-pulse" />
                  <span className="font-mono tabular-nums">{tile.meta}</span>
                </div>
                {tile.metaSub && <div className="mt-1 font-mono tabular-nums text-xs text-[var(--text-secondary)]">{tile.metaSub}</div>}
              </div>
            )}

            {tile.key === 'recent' && (
              <div className="mt-3.5">
                <Link
                  href="/updates"
                  className="inline-flex w-full items-center justify-between rounded-xl border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue-soft)]/60 px-3 py-2 text-xs font-bold text-[var(--nepal-blue)] transition hover:bg-[var(--nepal-blue)] hover:text-white active:scale-95 shadow-2xs group cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <span>{language === 'ne' ? 'अपडेट तथा सिङ्क लग हेर्नुहोस्' : 'View Sync Logs & Office Data'}</span>
                  </span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions Bar for mobile users */}
      <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
        <button
          type="button"
          onClick={onOpenOffices}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs font-bold text-[var(--text-primary)] shadow-sm active:scale-95"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]" aria-hidden="true">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
          </svg>
          <span>{language === 'ne' ? 'यातायात कार्यालयहरू' : 'Transport Offices'}</span>
        </button>
        <button
          type="button"
          onClick={onOpenSms}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs font-bold text-[var(--text-primary)] shadow-sm active:scale-95"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
          <span>{language === 'ne' ? 'एसएमएसबाट जाँच्ने' : 'SMS Check (33001)'}</span>
        </button>
        {onOpenNpm && (
          <button
            type="button"
            onClick={onOpenNpm}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs font-bold text-[var(--text-primary)] shadow-sm active:scale-95"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-red)]" aria-hidden="true">
              <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-1.8 0l-4 2.31A1.78 1.78 0 0 0 1 8.08v8a1.78 1.78 0 0 0 .75 1.45l4 2.31a1.78 1.78 0 0 0 1.8 0l8.95-5.16" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
            </svg>
            <span>{language === 'ne' ? 'विकासकर्ता SDK प्याकेज (npm & GitHub)' : 'Developer SDK (npm & GitHub Packages)'}</span>
          </button>
        )}
      </div>
    </section>
  )
}
