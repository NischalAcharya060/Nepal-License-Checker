'use client'

import type { Language } from '@/lib/i18n'

interface HeroHeaderProps {
  language: Language
  badge: string
  title: string
  titleAccent: string
  description: string
  viewsLabel: string
  indexedRecords: number | null
  viewCount: number | null
  lastUpdatedAt: string | null
  dateLocale: string
}

export default function HeroHeader({
  language,
  badge,
  title,
  titleAccent,
  description,
  viewsLabel,
  indexedRecords,
  viewCount,
  lastUpdatedAt,
  dateLocale,
}: HeroHeaderProps) {
  return (
    <>
      <header className="mb-8 text-center sm:mb-10 print:hidden">
        {/* Waving Nepal flag */}
        <div className="mb-3 flex justify-center animate-rise-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Nepal-flag.gif"
            alt=""
            aria-hidden
            width={50}
            height={68}
            className="h-14 w-auto object-contain drop-shadow-sm"
          />
        </div>

        {/* Nepal flag accent ribbon */}
        <div className="mb-4 flex items-center justify-center gap-2" aria-hidden>
          <div className="h-1.5 w-12 rounded-l-full bg-[var(--nepal-red)]" />
          <div className="h-2.5 w-2.5 rounded-full border-2 border-[var(--border-default)] bg-[var(--surface-primary)]" />
          <div className="h-1.5 w-12 rounded-r-full bg-[var(--nepal-blue)]" />
        </div>

        <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-[var(--nepal-blue)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-white shadow-sm animate-rise-in sm:text-[11px]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {badge}
        </div>

        <h1 className="mb-3 animate-rise-in text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl">
          {title} <span className="text-[var(--nepal-blue)]">{titleAccent}</span>
        </h1>
        <p className="mx-auto max-w-xl animate-rise-in text-sm leading-6 text-[var(--text-secondary)] sm:text-base" style={{ animationDelay: '0.06s' }}>
          {description}
        </p>

        {/* Bilingual subline */}
        <p
          className="mx-auto mt-2.5 max-w-2xl animate-rise-in text-[11px] leading-5 text-[var(--text-muted)] sm:text-xs"
          style={{ animationDelay: '0.12s' }}
          lang={language === 'ne' ? 'en' : 'ne'}
        >
          {language === 'ne'
            ? 'Check whether your Nepal smart card driving license has been printed by DOTM and is ready for collection.'
            : 'तपाईंको स्मार्ट कार्ड सवारी चालक अनुमतिपत्र छापिएको छ कि छैन तुरुन्तै जाँच गर्नुहोस्।'}
        </p>
      </header>

      {/* Trust & Authority Stats Bar */}
      <div
        className="mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)]/80 px-4 py-2.5 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm animate-rise-in print:hidden"
        style={{ animationDelay: '0.16s' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {indexedRecords !== null
            ? language === 'ne'
              ? `${indexedRecords.toLocaleString(dateLocale)} अभिलेख`
              : `${indexedRecords.toLocaleString(dateLocale)} records`
            : language === 'ne'
              ? '१ लाख+ अभिलेख'
              : '100K+ records'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {language === 'ne' ? 'साप्ताहिक अद्यावधिक' : 'Updated weekly'}
        </span>
        {viewCount !== null && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{viewCount.toLocaleString(dateLocale)} {viewsLabel}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5" title={lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : undefined}>
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          {(language === 'ne' ? 'स्रोत' : 'Source')}: dotm.gov.np
        </span>
      </div>
    </>
  )
}
