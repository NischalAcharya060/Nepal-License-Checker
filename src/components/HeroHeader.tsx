'use client'

import type { Language } from '@/lib/i18n'
import { formatNepalDateTime, formatTimeUntil } from '@/lib/cronHelper'

interface HeroHeaderProps {
  language: Language
  badge: string
  title: string
  titleAccent: string
  description: string
  viewsLabel?: string
  nextSyncLabel?: string
  indexedRecords: number | null
  viewCount?: number | null
  lastUpdatedAt: string | null
  nextScraperRun?: string | null
  dateLocale: string
}

export default function HeroHeader({
  language,
  badge,
  title,
  titleAccent,
  description,
  viewsLabel = 'Views',
  nextSyncLabel,
  indexedRecords,
  viewCount = null,
  lastUpdatedAt,
  nextScraperRun,
  dateLocale,
}: HeroHeaderProps) {
  return (
    <>
      <header className="relative z-10 mb-8 text-center sm:mb-10 print:hidden">
        {/* Waving Nepal flag with calm civic presentation */}
        <div className="mb-3 flex justify-center animate-rise-in">
          <div className="drop-shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Nepal-flag.gif"
              alt=""
              aria-hidden
              width={50}
              height={68}
              className="h-13 w-auto object-contain transition-transform duration-300 hover:scale-105"
            />
          </div>
        </div>

        {/* Nepal flag accent ribbon */}
        <div className="mb-4 flex items-center justify-center gap-2" aria-hidden>
          <div className="h-1.5 w-12 rounded-l-full bg-[var(--nepal-red)] shadow-xs" />
          <div className="h-2.5 w-2.5 rounded-full border-2 border-[var(--border-default)] bg-[var(--surface-primary)] shadow-xs" />
          <div className="h-1.5 w-12 rounded-r-full bg-[var(--nepal-blue)] shadow-xs" />
        </div>

        {/* Official Status Badge - 11pt / 12px accessible typography floor */}
        <div className="mb-3.5 inline-flex items-center gap-2 rounded-full border border-[var(--nepal-blue)]/20 bg-[var(--nepal-blue-soft)]/75 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--nepal-blue)] dark:text-[#88b6ff] shadow-xs animate-rise-in cursor-default transition-all duration-300">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] dark:text-[#88b6ff]">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>{badge}</span>
        </div>

        <h1 className="mb-3 animate-rise-in text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl">
          {title} <span className="text-[var(--nepal-blue)] drop-shadow-xs">{titleAccent}</span>
        </h1>
        <p className="mx-auto max-w-xl animate-rise-in text-sm leading-6 text-[var(--text-secondary)] sm:text-base font-normal" style={{ animationDelay: '0.06s' }}>
          {description}
        </p>

        {/* Bilingual subline */}
        <p
          className="mx-auto mt-2.5 max-w-2xl animate-rise-in text-xs sm:text-sm leading-relaxed text-[var(--text-muted)] font-medium"
          style={{ animationDelay: '0.12s' }}
          lang={language === 'ne' ? 'en' : 'ne'}
        >
          {language === 'ne'
            ? 'Check whether your Nepal smart card driving license has been printed by DOTM and is ready for collection.'
            : 'तपाईंको स्मार्ट कार्ड सवारी चालक अनुमतिपत्र छापिएको छ कि छैन तुरुन्तै जाँच गर्नुहोस्।'}
        </p>
      </header>

      {/* Trust & Authority Stats Bar (Clean High-Precision Card) */}
      <div
        className="relative overflow-hidden mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)]/90 backdrop-blur-md px-5 py-3 text-xs font-medium text-[var(--text-secondary)] shadow-xs animate-rise-in transition-all duration-300 print:hidden"
        style={{ animationDelay: '0.16s' }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-75" />
        <span className="inline-flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
            {indexedRecords !== null
              ? language === 'ne'
                ? `${indexedRecords.toLocaleString(dateLocale)}`
                : `${indexedRecords.toLocaleString(dateLocale)}`
              : language === 'ne'
                ? '१ लाख+'
                : '100K+'}
          </span>
          <span>{language === 'ne' ? 'अभिलेख' : 'records'}</span>
        </span>

        {/* Next Scheduled Scraper Sync */}
        {nextScraperRun && (
          <span
            className="inline-flex items-center gap-1.5 cursor-help transition hover:text-[var(--nepal-blue)]"
            title={`${language === 'ne' ? 'अर्को तालिकाबद्ध सिङ्क:' : 'Next scheduled sync:'} ${formatNepalDateTime(nextScraperRun, language)} (NPT)`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] animate-pulse">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              {nextSyncLabel || (language === 'ne' ? 'अर्को सिङ्क' : 'Next Sync')}:{' '}
              <strong className="font-mono tabular-nums font-bold text-[var(--text-primary)]">
                {formatTimeUntil(nextScraperRun, language)}
              </strong>
            </span>
          </span>
        )}

        {viewCount !== null && (
          <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="font-mono tabular-nums font-bold text-[var(--text-primary)]">{viewCount.toLocaleString(dateLocale)}</span>
            <span className="text-[var(--text-secondary)] font-normal">{viewsLabel}</span>
          </span>
        )}

        <span className="inline-flex items-center gap-1.5" title={lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : undefined}>
          <span className="inline-flex h-2 w-2 rounded-full bg-[var(--success)] animate-glow-pulse" />
          <span className="text-[var(--text-muted)]">{(language === 'ne' ? 'स्रोत' : 'Source')}:</span>
          <span className="font-mono text-[var(--text-secondary)] font-semibold">dotm.gov.np</span>
        </span>
      </div>
    </>
  )
}
