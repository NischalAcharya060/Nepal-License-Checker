'use client'

import Image from 'next/image'
import { useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import LicenseForm from '@/components/LicenseForm'
import LicenseResult from '@/components/LicenseResult'
import { translations } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'

export type LicenseData = {
  license_number: string
  holder_name: string
  office: string
  category: string
  createdAt: any
  updatedAt: any
}

export type SearchState = 'idle' | 'loading' | 'found' | 'not_found' | 'error'
type ThemeMode = 'light' | 'dark'

function applyThemeToDocument(theme: ThemeMode) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('dark', theme === 'dark')
}

function applyLangToDocument(lang: Language) {
  document.documentElement.setAttribute('lang', lang === 'ne' ? 'ne-NP' : 'en-NP')
}

export default function Home() {
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [result, setResult] = useState<LicenseData | null>(null)
  const [lastSearched, setLastSearched] = useState<string>('')
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [hydratedPreferences, setHydratedPreferences] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [indexedRecords, setIndexedRecords] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [language, setLanguage] = useState<Language>('en')

  const copy = translations[language]

  // Hydrate theme and language preferences from URL / localStorage / browser
  useEffect(() => {
    const rootTheme = document.documentElement.getAttribute('data-theme')
    const savedTheme = window.localStorage.getItem('ui-theme')
    let preferredTheme: ThemeMode = 'light'

    if (rootTheme === 'light' || rootTheme === 'dark') {
      preferredTheme = rootTheme
      setTheme(rootTheme)
    } else if (savedTheme === 'light' || savedTheme === 'dark') {
      preferredTheme = savedTheme
      setTheme(savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      preferredTheme = 'dark'
      setTheme('dark')
    }

    applyThemeToDocument(preferredTheme)

    // Language priority: URL ?lang= > localStorage > browser
    const params = new URLSearchParams(window.location.search)
    const urlLang = params.get('lang')
    const savedLang = window.localStorage.getItem('ui-language')

    let preferredLang: Language = 'en'
    if (urlLang === 'ne' || urlLang === 'en') {
      preferredLang = urlLang
    } else if (savedLang === 'ne' || savedLang === 'en') {
      preferredLang = savedLang
    } else if (navigator.language.startsWith('ne')) {
      preferredLang = 'ne'
    }
    setLanguage(preferredLang)
    applyLangToDocument(preferredLang)

    setHydratedPreferences(true)
  }, [])

  useEffect(() => {
    if (!hydratedPreferences) return
    applyThemeToDocument(theme)
    window.localStorage.setItem('ui-theme', theme)
  }, [hydratedPreferences, theme])

  useEffect(() => {
    if (!hydratedPreferences) return
    window.localStorage.setItem('ui-language', language)
    applyLangToDocument(language)
  }, [hydratedPreferences, language])

  useEffect(() => {
    let cancelled = false

    const loadMeta = async () => {
      try {
        const response = await fetch('/api/meta', { cache: 'no-store' })
        if (!response.ok) return
        const payload = await response.json()
        if (cancelled) return

        setLastUpdatedAt(payload?.data?.lastUpdated ?? null)
        setIndexedRecords(typeof payload?.data?.totalRecords === 'number' ? payload.data.totalRecords : null)
      } catch {
        if (!cancelled) {
          setLastUpdatedAt(null)
          setIndexedRecords(null)
        }
      }
    }

    loadMeta()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isModalOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsModalOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isModalOpen])

  const dateLocale = language === 'ne' ? 'ne-NP' : 'en-NP'

  const lastUpdatedDisplay = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleString(dateLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : copy.home.lastUpdatedFallback

  const checkLicense = useCallback(
    async (licenseNumber: string) => {
      setSearchState('loading')
      setResult(null)
      setLastSearched(licenseNumber)

      try {
        const response = await fetch(`/api/license?number=${encodeURIComponent(licenseNumber)}`)
        const data = await response.json()

        if (response.status === 429) {
          toast.error(copy.home.toasts.rateLimit)
          setSearchState('error')
          return
        }

        if (!response.ok) {
          throw new Error(data.error || 'Server error')
        }

        if (data.status === 'success' && data.data) {
          setResult(data.data)
          setSearchState('found')
          toast.success(copy.home.toasts.found)
        } else {
          setSearchState('not_found')
          toast.error(copy.home.toasts.notFound)
        }
      } catch (error) {
        console.error('Error checking license:', error)
        setSearchState('error')
        toast.error(copy.home.toasts.serverError)
      }
    },
    [copy.home.toasts]
  )

  const reset = useCallback(() => {
    setSearchState('idle')
    setResult(null)
    setLastSearched('')
  }, [])

  const infoTiles = [
    {
      key: 'format',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
      title: copy.home.tiles[0].title,
      text: copy.home.tiles[0].text,
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
      title: copy.home.tiles[1].title,
      text: copy.home.tiles[1].text,
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
      title: copy.home.tiles[2].title,
      text: copy.home.tiles[2].text,
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
      title: copy.home.tiles[3].title,
      text: copy.home.tiles[3].text,
      showHelp: false,
      highlight: true,
      meta: `${copy.home.lastUpdatedLabel}: ${lastUpdatedDisplay}`,
      metaSub:
        indexedRecords !== null
          ? language === 'ne'
            ? `${indexedRecords.toLocaleString(dateLocale)} अभिलेख अनुक्रमणिकामा`
            : `${indexedRecords.toLocaleString(dateLocale)} records indexed`
          : null,
    },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background ambient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="animate-float-soft absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[var(--nepal-blue)]/10 blur-3xl" />
        <div className="animate-float-soft absolute top-24 -right-24 h-72 w-72 rounded-full bg-[var(--nepal-red)]/10 blur-3xl" style={{ animationDelay: '0.8s' }} />
        <div className="animate-float-soft absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-[var(--nepal-blue)]/8 blur-3xl" style={{ animationDelay: '1.4s' }} />
      </div>

      {/* Sticky top controls bar */}
      <div className="sticky top-0 z-40 border-b border-[var(--border-default)]/60 bg-[var(--bg-primary)]/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)]">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--success)] animate-glow-pulse" aria-hidden />
            <span className="hidden sm:inline">{language === 'ne' ? 'लाइभ डेटा · dotm.gov.np' : 'Live data · dotm.gov.np'}</span>
            <span className="sm:hidden">{language === 'ne' ? 'लाइभ' : 'Live'}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Language Switcher */}
            <div
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 text-[11px]"
              role="group"
              aria-label="Language switch"
            >
              <button
                type="button"
                id="lang-en"
                aria-pressed={language === 'en'}
                onClick={() => setLanguage('en')}
                className={`rounded-full px-2.5 py-1 font-semibold transition ${
                  language === 'en'
                    ? 'bg-[var(--nepal-blue)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                id="lang-ne"
                aria-pressed={language === 'ne'}
                onClick={() => setLanguage('ne')}
                lang="ne"
                className={`rounded-full px-2.5 py-1 font-semibold transition ${
                  language === 'ne'
                    ? 'bg-[var(--nepal-red)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                नेपाली
              </button>
            </div>

            {/* Theme Switcher */}
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 text-[11px]" role="group" aria-label="Theme switch">
              <button
                type="button"
                aria-pressed={theme === 'light'}
                aria-label={copy.home.lightLabel}
                onClick={() => setTheme('light')}
                className={`rounded-full px-2 py-1 transition ${
                  theme === 'light' ? 'bg-[var(--nepal-blue)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              </button>
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                aria-label={copy.home.darkLabel}
                onClick={() => setTheme('dark')}
                className={`rounded-full px-2 py-1 transition ${
                  theme === 'dark' ? 'bg-[var(--nepal-blue)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-14 pt-6 sm:px-6 sm:pt-10">
        <header className="mb-8 text-center sm:mb-10">
          {/* Nepal flag accent */}
          <div className="mb-5 flex items-center justify-center gap-2 animate-float-soft" aria-hidden>
            <div className="h-1.5 w-10 rounded-l-full bg-[var(--nepal-red)]" />
            <div className="animate-glow-pulse h-2.5 w-2.5 rounded-full border-2 border-[var(--border-default)] bg-[var(--surface-primary)]" />
            <div className="h-1.5 w-10 rounded-r-full bg-[var(--nepal-blue)]" />
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--nepal-blue)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-white shadow-sm animate-rise-in sm:text-[11px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {copy.home.badge}
          </div>

          <h1 className="mb-3 animate-rise-in text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-5xl">
            {copy.home.title} <span className="text-[var(--nepal-blue)]">{copy.home.titleAccent}</span>
          </h1>
          <p className="mx-auto max-w-xl animate-rise-in text-sm leading-6 text-[var(--text-secondary)] sm:text-base" style={{ animationDelay: '0.06s' }}>
            {copy.home.description}
          </p>

          {/* Bilingual subline — visible, helps users + reinforces SEO for both languages */}
          <p
            className="mx-auto mt-3 max-w-2xl animate-rise-in text-[11px] leading-5 text-[var(--text-muted)] sm:text-xs"
            style={{ animationDelay: '0.12s' }}
            lang={language === 'ne' ? 'en' : 'ne'}
          >
            {language === 'ne'
              ? 'Check if your Nepal smart card driving license is printed by DOTM and ready to collect.'
              : 'तपाईंको स्मार्ट कार्ड सवारी चालक अनुमतिपत्र छापिएको छ कि छैन जाँच गर्नुहोस्।'}
          </p>
        </header>

        {/* Trust & authority stats bar — visible E-E-A-T signal */}
        <div className="mx-auto mb-6 flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)]/80 px-4 py-2.5 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm animate-rise-in" style={{ animationDelay: '0.16s' }}>
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            {indexedRecords !== null
              ? language === 'ne'
                ? `${indexedRecords.toLocaleString(dateLocale)} अभिलेख`
                : `${indexedRecords.toLocaleString(dateLocale)} records`
              : language === 'ne'
                ? '१ लाख+ अभिलेख'
                : '100K+ records'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {language === 'ne' ? 'साप्ताहिक अद्यावधिक' : 'Updated weekly'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 7l-5-5-5 5"/><path d="M7 17l5 5 5-5"/></svg>
            {language === 'ne' ? 'पूर्णतः निःशुल्क' : 'Completely free'}
          </span>
          <span className="inline-flex items-center gap-1.5" title={lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : undefined}>
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            {(language === 'ne' ? 'स्रोत' : 'Source')}: dotm.gov.np
          </span>
        </div>

        <LicenseForm onSubmit={checkLicense} onReset={reset} loading={searchState === 'loading'} copy={copy.form} />

        {(searchState === 'found' || searchState === 'not_found' || searchState === 'error') && (
          <div className="mt-5 animate-slide-up">
            <LicenseResult state={searchState} result={result} licenseNumber={lastSearched} onCheckAnother={reset} copy={copy.result} dateLocale={dateLocale} />
          </div>
        )}

        {searchState === 'idle' && (
          <section className="mt-7 animate-fade-in" aria-label="Helpful info">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {language === 'ne' ? 'उपयोगी जानकारी' : 'Helpful Information'}
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
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">{tile.title}</div>
                    {tile.showHelp && (
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)]"
                      >
                        {language === 'ne' ? 'उदाहरण हेर्नुहोस्' : 'View example'}
                      </button>
                    )}
                  </div>

                  <div className="text-xs leading-5 text-[var(--text-secondary)]">{tile.text}</div>

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

            {/* How-To: step-by-step guide */}
            <section
              id="how-to-check"
              className="mt-10 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm"
              aria-labelledby="how-to-heading"
            >
              <div className="border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-blue-soft)] to-transparent px-5 py-4 sm:px-6">
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--nepal-blue)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--nepal-blue)]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    {language === 'ne' ? 'चरण-दर-चरण' : 'Step-by-step'}
                  </span>
                  {lastUpdatedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[9px] font-medium text-[var(--text-muted)]">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {language === 'ne'
                        ? `अद्यावधिक: ${new Date(lastUpdatedAt).toLocaleDateString('ne-NP', { year: 'numeric', month: 'short', day: 'numeric' })}`
                        : `Updated: ${new Date(lastUpdatedAt).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                    </span>
                  )}
                </div>
                <h2 id="how-to-heading" className="text-lg font-extrabold text-[var(--text-primary)] sm:text-xl">
                  {language === 'ne'
                    ? 'सवारी चालक अनुमतिपत्र छापिएको कि छैन कसरी जाँच्ने?'
                    : 'How to check if your Nepal driving license is printed'}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm">
                  {language === 'ne'
                    ? 'यातायात व्यवस्था विभाग (DOTM, dotm.gov.np) को आधिकारिक छपाइ सूचीबाट सिधै जाँच गर्ने सजिलो तरिका।'
                    : 'The quickest way to verify your smart card status directly from the official DOTM (dotm.gov.np) print list.'}
                </p>
              </div>

              {/* Tutorial video */}
              <div className="px-5 py-4 sm:px-6 sm:py-5">
                <video className="aspect-video w-full overflow-hidden rounded-xl border border-[var(--border-default)] bg-black shadow-sm" controls preload="metadata" playsInline>
                  <source src="/tutorial.mp4" type="video/mp4" />
                </video>
              </div>

              <ol className="divide-y divide-[var(--border-default)]/70">
                {(() => {
                  const steps = language === 'ne'
                    ? [
                        {
                          title: 'अनुमतिपत्र नम्बर तयार राख्नुहोस्',
                          body: 'तपाईंको पुरानो लाइसेन्स वा परीक्षा रसिदमा XX-XX-XXXXXXXX ढाँचाको नम्बर हुन्छ — पहिलो २ अंक कार्यालय कोड, दोस्रो २ अंक जिल्ला कोड, र अन्तिम ८ अंक तपाईंको व्यक्तिगत नम्बर हो।',
                          hint: 'उदाहरण: ०१-०१-१२३४५६७८',
                        },
                        {
                          title: 'माथिको खोज बक्समा नम्बर हाल्नुहोस्',
                          body: 'हाइफन (-) स्वतः थपिन्छ। केवल अंक टाइप गर्नुहोस्। गलत भएमा "मेट्नुहोस्" बटन थिचेर पुनः प्रयास गर्न सक्नुहुन्छ।',
                          hint: null,
                        },
                        {
                          title: '"स्थिति जाँच्नुहोस्" थिच्नुहोस्',
                          body: 'हामी DOTM को पछिल्लो सार्वजनिक सूचीसँग तपाईंको नम्बर तुलना गर्छौं र केही सेकेन्डमै नतिजा देखाउँछौं।',
                          hint: null,
                        },
                        {
                          title: 'नतिजा बुझ्नुहोस्',
                          body: '“तयार छ” देखियो भने तपाईंको स्मार्ट कार्ड छापिइसकेको छ। “तयार छैन” आएमा सूची अझै अद्यावधिक नभएको हुन सक्छ — केही दिनपछि पुनः जाँच गर्नुहोस्।',
                          hint: null,
                        },
                        {
                          title: 'कार्यालय गएर बुझिलिनुहोस्',
                          body: 'नागरिकता प्रमाणपत्र, पुरानो सवारी चालक अनुमतिपत्र, र भुक्तानी रसिद लिएर आफ्नो यातायात कार्यालयमा जानुहोस्।',
                          hint: null,
                        },
                      ]
                    : [
                        {
                          title: 'Have your license number ready',
                          body: 'Your old license or exam receipt shows a number in the format XX-XX-XXXXXXXX — the first two digits are the office code, the next two are the district code, and the last eight are your personal number.',
                          hint: 'Example: 01-01-12345678',
                        },
                        {
                          title: 'Enter the number in the search box above',
                          body: 'Hyphens are inserted automatically — just type the digits. If you mistype, hit the clear button and try again.',
                          hint: null,
                        },
                        {
                          title: 'Press “Check Status”',
                          body: 'We match your number against the latest list published by DOTM and return the result in a few seconds.',
                          hint: null,
                        },
                        {
                          title: 'Read the result',
                          body: '“It’s Ready” means your smart card has been printed. “Not Ready” usually means the latest list hasn’t included it yet — check back in a few days.',
                          hint: null,
                        },
                        {
                          title: 'Collect it from your transport office',
                          body: 'Bring your Citizenship card, old driving license, and payment receipt to the transport office where you applied.',
                          hint: null,
                        },
                      ]
                  return steps.map((s, idx) => (
                    <li key={idx} className="flex gap-4 px-5 py-4 sm:px-6 sm:py-5">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)] text-sm font-bold text-white shadow-sm sm:h-9 sm:w-9">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[var(--text-primary)] sm:text-[15px]">{s.title}</div>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{s.body}</p>
                        {s.hint && (
                          <code className="mt-2 inline-block rounded-md border border-[var(--nepal-blue)]/25 bg-[var(--nepal-blue-soft)] px-2 py-0.5 font-mono text-[12px] text-[var(--nepal-blue)]">
                            {s.hint}
                          </code>
                        )}
                      </div>
                    </li>
                  ))
                })()}
              </ol>

              <div className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-3 text-[11px] leading-5 text-[var(--text-muted)] sm:px-6">
                {language === 'ne'
                  ? 'सूचना: यो साइट आधिकारिक स्रोत होइन। तथ्याङ्क dotm.gov.np बाट लिइन्छ र दैनिक/साप्ताहिक रूपमा अद्यावधिक हुन्छ।'
                  : 'Note: this site is not the official source. Data is mirrored from dotm.gov.np and is updated regularly.'}
              </div>
            </section>

            {/* FAQ accordion */}
            <section
              id="faq"
              className="mt-8 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm"
              aria-labelledby="faq-heading"
            >
              <div className="border-b border-[var(--border-default)] px-5 py-4 sm:px-6">
                <div className="mb-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--nepal-red)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--nepal-red)]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    {language === 'ne' ? 'सोधाइ' : 'FAQ'}
                  </span>
                  {lastUpdatedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[9px] font-medium text-[var(--text-muted)]">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {language === 'ne'
                        ? `अद्यावधिक: ${new Date(lastUpdatedAt).toLocaleDateString('ne-NP', { year: 'numeric', month: 'short', day: 'numeric' })}`
                        : `Updated: ${new Date(lastUpdatedAt).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                    </span>
                  )}
                </div>
                <h2 id="faq-heading" className="text-lg font-extrabold text-[var(--text-primary)] sm:text-xl">
                  {language === 'ne' ? 'बारम्बार सोधिने प्रश्नहरू' : 'Frequently asked questions'}
                </h2>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm">
                  {language === 'ne'
                    ? 'नेपाली स्मार्ट कार्ड सवारी चालक अनुमतिपत्र सम्बन्धी प्रायः सोधिने प्रश्नहरूको छोटो उत्तर।'
                    : 'Quick answers to the most common questions about Nepal smart card driving licenses.'}
                </p>
              </div>

              <div className="divide-y divide-[var(--border-default)]/70">
                {(() => {
                  const faqs = language === 'ne'
                    ? [
                        { q: 'मेरो लाइसेन्स छापिएको कि छैन कसरी थाहा पाउने?', a: 'माथिको खोज बक्समा आफ्नो अनुमतिपत्र नम्बर हाल्नुहोस् र "स्थिति जाँच्नुहोस्" थिच्नुहोस्। DOTM को आधिकारिक सूचीमा भएमा "तयार छ" देखाइनेछ।' },
                        { q: 'अनुमतिपत्र नम्बरको ढाँचा के हो?', a: 'XX-XX-XXXXXXXX — पहिलो २ अंक कार्यालय कोड, दोस्रो २ अंक जिल्ला कोड, र अन्तिम ८ अंक व्यक्तिगत नम्बर। उदाहरण: ०१-०१-१२३४५६७८।' },
                        { q: 'मेरो नम्बर कहाँ पाउन सकिन्छ?', a: 'पुरानो स्मार्ट कार्ड लाइसेन्स, परीक्षा रसिद, वा यातायात कार्यालयले दिएको अस्थायी रसिदमा तपाईंको नम्बर लेखिएको हुन्छ।' },
                        { q: 'लाइसेन्स लिन के के लैजानु पर्छ?', a: 'नागरिकता प्रमाणपत्र, पुरानो सवारी चालक अनुमतिपत्र (यदि भए), र भुक्तानी रसिद। यी कागजात लिएर सम्बन्धित यातायात कार्यालयमा जानुहोस्।' },
                        { q: '"तयार छैन" देखाइयो भने के गर्ने?', a: 'अझ छपाइ हुन बाँकी हुन सक्छ। DOTM ले साप्ताहिक रूपमा सूची अद्यावधिक गर्छ — केही दिनपछि पुनः जाँच गर्नुहोस्। वा dotm.gov.np मा गएर पूर्ण सूची हेर्न सकिन्छ।' },
                        { q: 'सूची कति पटक अद्यावधिक हुन्छ?', a: 'विभागले साप्ताहिक रूपमा छपाइ भएका लाइसेन्सहरूको सूची सार्वजनिक गर्छ। हाम्रो प्रणालीले पनि नियमित रूपमा त्यो सूची अद्यावधिक गर्छ।' },
                        { q: 'के यो आधिकारिक सरकारी वेबसाइट हो?', a: 'होइन। यो स्वतन्त्र रूपमा बनाइएको खोज उपकरण हो। तथ्याङ्क dotm.gov.np बाट लिइएको हो र त्यहीँ आधिकारिक सूची उपलब्ध छ।' },
                        { q: 'के यो सेवा निःशुल्क हो?', a: 'हो। यो सेवा पूर्ण रूपमा निःशुल्क हो र कुनै दर्ता आवश्यक छैन।' },
                        { q: 'मेरो व्यक्तिगत जानकारी सुरक्षित छ?', a: 'तपाईंले राख्ने नम्बर खोजका लागि मात्र प्रयोग गरिन्छ। हामी तपाईंको खोज सुरक्षित गर्दैनौं वा बेच्दैनौं।' },
                      ]
                    : [
                        { q: 'How do I know if my license has been printed?', a: 'Enter your license number in the search box above and press “Check Status”. If your record appears in the official DOTM list, the page will show “It’s Ready” with your details.' },
                        { q: 'What is the license number format?', a: 'XX-XX-XXXXXXXX — the first two digits are your office code, the next two are the district code, and the last eight are your personal number. Example: 01-01-12345678.' },
                        { q: 'Where can I find my license number?', a: 'It’s printed on your old smart card license, on your exam receipt, or on the temporary slip your transport office gave you when you applied.' },
                        { q: 'What do I need to bring to collect the license?', a: 'Your Citizenship card, your old driving license (if you have one), and your payment receipt. Bring them to the transport office where you applied.' },
                        { q: 'My result says “Not Ready” — what should I do?', a: 'Your card may still be in the print queue. DOTM updates the list roughly weekly, so check back in a few days. You can also view the full list at dotm.gov.np.' },
                        { q: 'How often is the data updated?', a: 'DOTM publishes the printed-license list approximately weekly. Our system syncs that list regularly so results stay current.' },
                        { q: 'Is this the official government website?', a: 'No. This is an independent search tool. The underlying data comes from dotm.gov.np, which is the official source for the full list.' },
                        { q: 'Is this service free to use?', a: 'Yes — it’s completely free and requires no sign-up.' },
                        { q: 'Is my personal information safe?', a: 'The license number you enter is used only to perform the lookup. We don’t store or sell your searches.' },
                      ]
                  return faqs.map((f, idx) => (
                    <details
                      key={idx}
                      className="group px-5 py-3.5 transition hover:bg-[var(--bg-secondary)]/60 sm:px-6"
                    >
                      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-[var(--text-primary)] sm:text-[15px]">
                        <span className="min-w-0 flex-1">{f.q}</span>
                        <span
                          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] transition group-open:rotate-180 group-open:border-[var(--nepal-blue)] group-open:bg-[var(--nepal-blue)] group-open:text-white"
                          aria-hidden
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </span>
                      </summary>
                      <p className="mt-2 pr-9 text-sm leading-6 text-[var(--text-secondary)]">
                        {f.a}
                      </p>
                    </details>
                  ))
                })()}
              </div>
            </section>

            {/* Related searches — keeps Nepali long-tail keywords on the page */}
            <p className="mt-6 px-1 text-[11px] leading-5 text-[var(--text-muted)]">
              {language === 'ne'
                ? 'सम्बन्धित खोजहरू: सवारी चालक अनुमतिपत्र छापिएको कि छैन, स्मार्ट कार्ड लाइसेन्स स्थिति नेपाल, यातायात व्यवस्था विभाग लाइसेन्स, DOTM smart card print status, license chhapieko ki chaina, sawari chalak anumati patra Nepal.'
                : 'Related searches: Nepal smart card driving license status, DOTM printed license list, सवारी चालक अनुमतिपत्र छापिएको कि छैन, स्मार्ट कार्ड लाइसेन्स स्थिति, license chhapieko ki chaina, sawari chalak anumati patra.'}
            </p>
          </section>
        )}

        <div className="mt-9 space-y-1 text-center text-xs text-[var(--text-muted)]">
          <p>
            {copy.home.footerPrefix}{' '}
            <a href="https://dotm.gov.np/category/details-of-printed-licenses/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--nepal-blue)] no-underline">
              dotm.gov.np
            </a>{' '}
            · {copy.home.footerSuffix}
          </p>
          <p>
            {copy.home.developerCreditLabel}{' '}
            <a href="https://acharyanischal.com.np/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--nepal-blue)] no-underline">
              Nischal Acharya
            </a>{' '}
          </p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="License format guide"
            className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-[var(--surface-primary)] shadow-2xl animate-rise-in"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Close guide"
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-md transition-colors hover:bg-[var(--nepal-red)]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="p-1">
              <Image src="/license-sample2.png" alt="License format guide" width={1200} height={760} className="h-auto w-full rounded-xl object-cover" priority />
            </div>
            <div className="p-4 text-center">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
                {language === 'ne' ? 'ढाँचा निर्देशिका' : 'Format Guide'}
              </h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {language === 'ne'
                  ? 'तपाईंको अनुमति पत्र नम्बर अस्थायी रसिद वा पुरानो स्मार्ट कार्डमा फेला पार्न सक्नुहुन्छ।'
                  : 'You can find your license number on your temporary receipt or your old smart card.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
