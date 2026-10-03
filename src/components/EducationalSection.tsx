'use client'

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {infoTiles.map((tile, i) => (
          <div
            key={tile.key}
            className={`hover-lift animate-rise-in rounded-xl border bg-[var(--surface-primary)] p-4 shadow-sm ${
              tile.highlight
                ? 'border-[var(--nepal-blue)]/35 bg-gradient-to-b from-[var(--surface-primary)] to-[var(--nepal-blue-soft)]/40'
                : 'border-[var(--border-default)]'
            }`}
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)]">
              {tile.icon}
            </div>

            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">
                {tile.title}
              </div>
              {tile.showHelp && (
                <button
                  type="button"
                  onClick={onOpenSample}
                  className="rounded-full bg-[var(--nepal-blue-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)] transition hover:bg-[var(--nepal-blue)] hover:text-white"
                >
                  {language === 'ne' ? 'ढाँचा हेर्नुहोस्' : 'View Sample'}
                </button>
              )}
            </div>

            <p className="text-xs leading-5 text-[var(--text-secondary)]">{tile.text}</p>

            {tile.meta && (
              <div className="mt-3 rounded-lg border border-[var(--nepal-blue)]/25 bg-[var(--surface-primary)]/70 p-2.5">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--nepal-blue)]">
                  <span className="inline-flex h-2 w-2 rounded-full bg-[var(--success)] animate-glow-pulse" />
                  {tile.meta}
                </div>
                {tile.metaSub && <div className="mt-1 text-[10px] text-[var(--text-secondary)]">{tile.metaSub}</div>}
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
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs font-bold text-[var(--text-primary)] shadow-sm"
        >
          <span>🏢</span>
          <span>{language === 'ne' ? 'यातायात कार्यालयहरू' : 'Transport Offices'}</span>
        </button>
        <button
          type="button"
          onClick={onOpenSms}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs font-bold text-[var(--text-primary)] shadow-sm"
        >
          <span>📱</span>
          <span>{language === 'ne' ? 'एसएमएसबाट जाँच्ने' : 'SMS Check (31003)'}</span>
        </button>
      </div>
    </section>
  )
}
