'use client'

import Image from 'next/image'
import { useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import LicenseForm from '@/components/LicenseForm'
import LicenseResult from '@/components/LicenseResult'
import OfficesModal from '@/components/OfficesModal'
import SmsModal from '@/components/SmsModal'
import { translations } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'

export type LicenseData = {
  license_number: string
  holder_name: string
  office: string
  category: string
  createdAt: Date | string | number
  updatedAt: Date | string | number
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
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light'
    try {
      const rootTheme = document.documentElement.getAttribute('data-theme')
      const savedTheme = window.localStorage.getItem('ui-theme')
      if (rootTheme === 'light' || rootTheme === 'dark') return rootTheme
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
    } catch {
      // Ignore
    }
    return 'light'
  })
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [indexedRecords, setIndexedRecords] = useState<number | null>(null)
  const [viewCount, setViewCount] = useState<number | null>(null)
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false)
  const [isOfficesModalOpen, setIsOfficesModalOpen] = useState(false)
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en'
    try {
      const params = new URLSearchParams(window.location.search)
      const urlLang = params.get('lang')
      const savedLang = window.localStorage.getItem('ui-language')
      if (urlLang === 'ne' || urlLang === 'en') return urlLang
      if (savedLang === 'ne' || savedLang === 'en') return savedLang
      if (navigator.language.startsWith('ne')) return 'ne'
    } catch {
      // Ignore
    }
    return 'en'
  })
  const [externalNumber] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    try {
      const params = new URLSearchParams(window.location.search)
      return params.get('number') || ''
    } catch {
      return ''
    }
  })

  const copy = translations[language]

  useEffect(() => {
    applyThemeToDocument(theme)
    window.localStorage.setItem('ui-theme', theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem('ui-language', language)
    applyLangToDocument(language)
  }, [language])

  useEffect(() => {
    let cancelled = false

    const loadMetaAndViews = async () => {
      try {
        const hasCounted =
          typeof window !== 'undefined' &&
          window.sessionStorage.getItem('nepal_license_view_counted') === '1'
        const viewMethod = hasCounted ? 'GET' : 'POST'

        const [metaRes, viewRes] = await Promise.all([
          fetch('/api/meta', { cache: 'no-store' }).catch(() => null),
          fetch('/api/views', { method: viewMethod, cache: 'no-store' }).catch(() => null),
        ])

        if (cancelled) return

        if (metaRes && metaRes.ok) {
          const metaPayload = await metaRes.json()
          if (!cancelled && metaPayload?.data) {
            setLastUpdatedAt(metaPayload.data.lastUpdated ?? null)
            setIndexedRecords(
              typeof metaPayload.data.totalRecords === 'number'
                ? metaPayload.data.totalRecords
                : null
            )
            if (typeof metaPayload.data.totalViews === 'number') {
              setViewCount(metaPayload.data.totalViews)
            }
          }
        }

        if (viewRes && viewRes.ok) {
          const viewPayload = await viewRes.json()
          if (!cancelled && typeof viewPayload?.data?.views === 'number') {
            if (!hasCounted && viewMethod === 'POST' && typeof window !== 'undefined') {
              window.sessionStorage.setItem('nepal_license_view_counted', '1')
            }
            setViewCount(viewPayload.data.views)
          }
        }
      } catch {
        if (!cancelled) {
          setLastUpdatedAt(null)
          setIndexedRecords(null)
        }
      }
    }

    loadMetaAndViews()
    return () => {
      cancelled = true
    }
  }, [])

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

      // Update URL search param for shareability without refresh
      try {
        const url = new URL(window.location.href)
        url.searchParams.set('number', licenseNumber)
        window.history.replaceState({}, '', url.toString())
      } catch {
        // Ignore
      }

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
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('number')
      window.history.replaceState({}, '', url.toString())
    } catch {
      // Ignore
    }
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
    <main className="relative min-h-screen overflow-hidden print:min-h-0 print:overflow-visible print:static">
      {/* Background ambient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-0 print:hidden">
        <div className="animate-float-soft absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[var(--nepal-blue)]/10 blur-3xl" />
        <div className="animate-float-soft absolute top-24 -right-24 h-72 w-72 rounded-full bg-[var(--nepal-red)]/10 blur-3xl" style={{ animationDelay: '0.8s' }} />
        <div className="animate-float-soft absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-[var(--nepal-blue)]/8 blur-3xl" style={{ animationDelay: '1.4s' }} />
      </div>

      {/* Sticky top navigation bar */}
      <nav className="sticky top-0 z-40 border-b border-[var(--border-default)]/70 bg-[var(--bg-primary)]/80 backdrop-blur-md print:hidden">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-2.5">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Image
              src="/License-Checker-Nepal-logo.png"
              alt="Nepal License Checker Logo"
              width={56}
              height={56}
              className="h-9 w-9 sm:h-12 sm:w-12 rounded-xl shadow-xs object-contain transition-transform hover:scale-105 shrink-0"
              priority
            />
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-extrabold tracking-tight text-[var(--text-primary)] sm:text-base leading-tight">
                {language === 'ne' ? 'नेपाल लाइसेन्स जाँच' : 'Nepal License Checker'}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-[var(--text-secondary)]">
                <span className="inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-[var(--success)] animate-glow-pulse shrink-0" aria-hidden />
                <span className="truncate">DOTM · dotm.gov.np</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Navigation */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
            {/* Live Viewer Counter (Desktop/Tablet) */}
            {viewCount !== null && (
              <span
                className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] md:inline-flex shadow-2xs"
                title={language === 'ne' ? `कुल अवलोकन: ${viewCount.toLocaleString(dateLocale)}` : `Total views: ${viewCount.toLocaleString(dateLocale)}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>{viewCount.toLocaleString(dateLocale)}</span>
              </span>
            )}

            {/* Offices Directory button (Desktop) */}
            <button
              type="button"
              onClick={() => setIsOfficesModalOpen(true)}
              className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)] sm:inline-flex"
            >
              <span>🏢</span>
              <span>{language === 'ne' ? 'कार्यालयहरू' : 'Offices'}</span>
            </button>

            {/* SMS Guide button (Desktop) */}
            <button
              type="button"
              onClick={() => setIsSmsModalOpen(true)}
              className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)] sm:inline-flex"
            >
              <span>📱</span>
              <span>{language === 'ne' ? 'एसएमएस सेवा' : 'SMS Check'}</span>
            </button>

            {/* Language Switcher - compact on mobile */}
            <div
              className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] p-0.5 sm:p-1 text-[11px]"
              role="group"
              aria-label="Language switch"
            >
              <button
                type="button"
                id="lang-en"
                aria-pressed={language === 'en'}
                onClick={() => setLanguage('en')}
                className={`rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 font-semibold transition ${
                  language === 'en'
                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
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
                className={`rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1 font-semibold transition ${
                  language === 'ne'
                    ? 'bg-[var(--nepal-red)] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span className="sm:hidden">ने</span>
                <span className="hidden sm:inline">नेपाली</span>
              </button>
            </div>

            {/* 1-Click Theme Toggle Button (Compact) */}
            <button
              type="button"
              aria-label={theme === 'dark' ? copy.home.lightLabel : copy.home.darkLabel}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* GitHub Repo Button (Desktop) */}
            <a
              href="https://github.com/NischalAcharya060/Nepal-License-Checker"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 sm:inline-flex"
              title="GitHub Repository & Contribute"
              aria-label="GitHub Repository"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>

            {/* Mobile Menu Hamburger Button (<sm) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 sm:hidden"
            >
              {isMobileMenuOpen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Menu Drawer (<sm) */}
        {isMobileMenuOpen && (
          <div className="border-t border-[var(--border-default)]/70 bg-[var(--bg-primary)]/95 backdrop-blur-md px-4 py-3 sm:hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-2">
              {/* Offices */}
              <button
                type="button"
                onClick={() => {
                  setIsOfficesModalOpen(true)
                  setIsMobileMenuOpen(false)
                }}
                className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-left transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nepal-blue-soft)] text-base">🏢</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {language === 'ne' ? 'यातायात कार्यालयहरू' : 'Transport Offices Directory'}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {language === 'ne' ? 'काठमाडौं, पोखरा, बुटवल, इटहरी, जनकपुर र अन्य' : 'Addresses, codes & phone numbers'}
                    </span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* SMS Check */}
              <button
                type="button"
                onClick={() => {
                  setIsSmsModalOpen(true)
                  setIsMobileMenuOpen(false)
                }}
                className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-left transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-base text-emerald-600 dark:text-emerald-400">📱</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {language === 'ne' ? 'एसएमएस (SMS) सेवा' : 'SMS Print Status Service'}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {language === 'ne' ? 'LC <ID> लेखेर ३३००१ मा पठाउनुहोस्' : 'Send "LC <ApplicationID>" to 33001'}
                    </span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* Sample Format */}
              <button
                type="button"
                onClick={() => {
                  setIsSampleModalOpen(true)
                  setIsMobileMenuOpen(false)
                }}
                className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-left transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-base text-amber-600 dark:text-amber-400">🔍</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {language === 'ne' ? 'लाइसेन्स नम्बर ढाँचा' : 'License Number Format'}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {language === 'ne' ? '८ अंकको लाइसेन्स नम्बर कसरी पत्ता लगाउने' : 'Sample smart card & 8-digit guide'}
                    </span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>

              {/* GitHub Link & Views in mobile menu */}
              <div className="mt-1 flex items-center justify-between pt-2 border-t border-[var(--border-default)]/60 text-[11px]">
                <a
                  href="https://github.com/NischalAcharya060/Nepal-License-Checker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)]"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub Repository</span>
                </a>

                {viewCount !== null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>{viewCount.toLocaleString(dateLocale)} views</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-14 pt-6 sm:px-6 sm:pt-10 print:p-0 print:m-0 print:max-w-none">
        <header className="mb-8 text-center sm:mb-10 print:hidden">
          {/* Nepal flag accent ribbon */}
          <div className="mb-4 flex items-center justify-center gap-2 animate-float-soft" aria-hidden>
            <div className="h-1.5 w-12 rounded-l-full bg-[var(--nepal-red)]" />
            <div className="animate-glow-pulse h-2.5 w-2.5 rounded-full border-2 border-[var(--border-default)] bg-[var(--surface-primary)]" />
            <div className="h-1.5 w-12 rounded-r-full bg-[var(--nepal-blue)]" />
          </div>

          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-[var(--nepal-blue)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-white shadow-sm animate-rise-in sm:text-[11px]">
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
        <div className="mx-auto mb-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-5 gap-y-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)]/80 px-4 py-2.5 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm animate-rise-in print:hidden" style={{ animationDelay: '0.16s' }}>
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
          {viewCount !== null && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{viewCount.toLocaleString(dateLocale)} {copy.home.viewsLabel}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5" title={lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : undefined}>
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            {(language === 'ne' ? 'स्रोत' : 'Source')}: dotm.gov.np
          </span>
        </div>

        {/* License Query Form */}
        <div className="print:hidden">
          <LicenseForm
            onSubmit={checkLicense}
            onReset={reset}
            loading={searchState === 'loading'}
            copy={copy.form}
            language={language}
            externalNumber={externalNumber}
          />
        </div>

        {/* Result Card */}
        {(searchState === 'found' || searchState === 'not_found' || searchState === 'error') && (
          <div className="mt-5 animate-slide-up print:m-0 print:p-0">
            <LicenseResult
              state={searchState}
              result={result}
              licenseNumber={lastSearched}
              onCheckAnother={reset}
              copy={copy.result}
              dateLocale={dateLocale}
              language={language}
            />
          </div>
        )}

        {/* Educational Content & Help Info */}
        {searchState === 'idle' && (
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
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">{tile.title}</div>
                    {tile.showHelp && (
                      <button
                        type="button"
                        onClick={() => setIsSampleModalOpen(true)}
                        className="rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)]"
                      >
                        {language === 'ne' ? 'नमुना हेर्नुहोस्' : 'View sample'}
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

            {/* Quick Actions Bar for mobile users */}
            <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => setIsOfficesModalOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs font-bold text-[var(--text-primary)] shadow-sm"
              >
                <span>🏢</span>
                <span>{language === 'ne' ? 'यातायात कार्यालयहरू' : 'Transport Offices'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSmsModalOpen(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs font-bold text-[var(--text-primary)] shadow-sm"
              >
                <span>📱</span>
                <span>{language === 'ne' ? 'एसएमएसबाट जाँच्ने' : 'SMS Check (31003)'}</span>
              </button>
            </div>

            {/* How-To: step-by-step guide */}
            <section
              id="how-to-check"
              className="mt-8 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm"
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
                  const steps =
                    language === 'ne'
                      ? [
                          {
                            title: 'अनुमतिपत्र नम्बर तयार राख्नुहोस्',
                            body: 'तपाईंको पुरानो लाइसेन्स वा परीक्षा रसिदमा XX-XX-XXXXXXXX ढाँचाको नम्बर हुन्छ — पहिलो २ अंक कार्यालय कोड, दोस्रो २ अंक जिल्ला कोड, र अन्तिम ८ अंक तपाईंको व्यक्तिगत नम्बर हो।',
                            hint: 'उदाहरण: ०१-०१-१२३४५६७८',
                          },
                          {
                            title: 'माथिको खोज बक्समा नम्बर हाल्नुहोस्',
                            body: 'हाइफन (-) स्वतः थपिन्छ। केवल अंक टाइप गर्नुहोस्। नेपाली वा अंग्रेजी दुवै अंक समर्थित छन्।',
                            hint: null,
                          },
                          {
                            title: '"स्थिति जाँच्नुहोस्" थिच्नुहोस्',
                            body: 'हामी DOTM को पछिल्लो सार्वजनिक सूचीसँग तपाईंको नम्बर तुलना गर्छौं र केही सेकेन्डमै नतिजा देखाउँछौं।',
                            hint: null,
                          },
                          {
                            title: 'नतिजा बुझ्नुहोस्',
                            body: '“तयार छ” देखियो भने तपाईंको कार्ड छापिइसकेको छ। “तयार छैन” आएमा सूची अझै अद्यावधिक नभएको हुन सक्छ — केही दिनपछि पुनः जाँच गर्नुहोस्।',
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
                            body: 'Hyphens are inserted automatically — just type the digits. Both English and Nepali keyboard numerals are recognized.',
                            hint: null,
                          },
                          {
                            title: 'Press “Check Status”',
                            body: 'We match your number against the latest list published by DOTM and return the result in a few seconds.',
                            hint: null,
                          },
                          {
                            title: 'Read the result',
                            body: '“Card is Printed & Ready” means your smart card has been printed. “Not Printed Yet” usually means the latest list hasn’t included it yet — check back in a few days.',
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
                  ? 'सूचना: यो साइट गैर-सरकारी स्वतन्त्र खोज उपकरण हो। तथ्याङ्क dotm.gov.np बाट नियमित लिइन्छ।'
                  : 'Note: this site is an independent verification tool. Data is mirrored from dotm.gov.np and updated regularly.'}
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
                    ? 'नेपाली स्मार्ट कार्ड सवारी चालक अनुमतिपत्र सम्बन्धी प्रायः सोधिने प्रश्नहरूको आधिकारिक उत्तर।'
                    : 'Quick answers to the most common questions about Nepal smart card driving licenses.'}
                </p>
              </div>

              <div className="divide-y divide-[var(--border-default)]/70">
                {(() => {
                  const faqs =
                    language === 'ne'
                      ? [
                          { q: 'DOTM को स्मार्ट लाइसेन्स छापिएको सूची (Smart Licence Printed List) अनलाइन कसरी चेक गर्ने?', a: 'आफ्नो सवारी चालक अनुमतिपत्र नम्बर XX-XX-XXXXXXXX ढाँचामा माथिको खोज बाकसमा राखेर "स्थिति जाँच्नुहोस्" मा क्लिक गर्नुहोस्। हाम्रो प्रणालीले १० लाख+ आधिकारिक रेकर्डहरूबाट तपाईंको कार्ड छापिएको छ वा छैन तुरुन्तै देखाउँछ।' },
                          { q: 'के नागरिकता नम्बर वा नामबाट लाइसेन्स छापिएको कि छैन चेक गर्न सकिन्छ?', a: 'हाल यातायात व्यवस्था विभाग (DOTM) ले सार्वजनिक गर्ने स्मार्ट लाइसेन्स छापिएको सूचीमा केवल अनुमतिपत्र नम्बर (XX-XX-XXXXXXXX) बाट मात्र खोजी गर्न सकिन्छ। व्यक्तिगत गोपनीयताका कारण नागरिकता नम्बर वा नामबाट मात्र अनलाइन छपाइ सूची हेर्ने व्यवस्था छैन। तपाईंको परीक्षा उत्तीर्ण रसिद वा राजस्व रसिदमा लाइसेन्स नम्बर उल्लेख हुन्छ।' },
                          { q: 'मेरो लाइसेन्स छापिएको कि छैन कसरी थाहा पाउने?', a: 'माथिको खोज बक्समा आफ्नो अनुमतिपत्र नम्बर हाल्नुहोस् र "स्थिति जाँच्नुहोस्" थिच्नुहोस्। DOTM को आधिकारिक सूचीमा भएमा "कार्ड छापिइसकेको छ" देखाइनेछ।' },
                          { q: 'अनुमतिपत्र नम्बरको ढाँचा के हो?', a: 'XX-XX-XXXXXXXX — पहिलो २ अंक कार्यालय कोड, दोस्रो २ अंक जिल्ला कोड, र अन्तिम ८ अंक व्यक्तिगत नम्बर। उदाहरण: ०१-०१-१२३४५६७८।' },
                          { q: 'मेरो नम्बर कहाँ पाउन सकिन्छ?', a: 'पुरानो स्मार्ट कार्ड लाइसेन्स, परीक्षा रसिद, वा यातायात कार्यालयले दिएको अस्थायी रसिदमा तपाईंको नम्बर लेखिएको हुन्छ।' },
                          { q: 'लाइसेन्स लिन के के लैजानु पर्छ?', a: 'नागरिकता प्रमाणपत्र, पुरानो सवारी चालक अनुमतिपत्र (यदि भए), र भुक्तानी रसिद। यी कागजात लिएर सम्बन्धित यातायात कार्यालयमा जानुहोस्।' },
                          { q: '"छपाइ हुन बाँकी" देखाइयो भने के गर्ने?', a: 'अझ छपाइ हुन बाँकी हुन सक्छ। DOTM ले नियमित रूपमा सूची अद्यावधिक गर्छ — केही दिनपछि पुनः जाँच गर्नुहोस्। वा dotm.gov.np मा गएर पूर्ण सूची हेर्न सकिन्छ।' },
                          { q: 'सूची कति पटक अद्यावधिक हुन्छ?', a: 'विभागले साप्ताहिक रूपमा छपाइ भएका लाइसेन्सहरूको सूची सार्वजनिक गर्छ। हाम्रो प्रणालीले पनि नियमित रूपमा त्यो सूची अद्यावधिक गर्छ।' },
                          { q: 'के एसएमएस (SMS) बाट पनि बुझ्न सकिन्छ?', a: 'हो, आफ्नो मोबाइलबाट LC <space> <Application ID वा License No> टाइप गरी ३३००१, ३४९४९ वा ३१००३ मा पठाउनुहोस् — यो NTC, Ncell र Smart Cell सबैमा चल्छ।' },
                          { q: 'के यो आधिकारिक सरकारी वेबसाइट हो?', a: 'होइन। यो स्वतन्त्र रूपमा बनाइएको नागरिक सहायता खोज उपकरण हो। तथ्याङ्क dotm.gov.np बाट लिइएको हो र त्यहीँ आधिकारिक सूची उपलब्ध छ।' },
                          { q: 'के यो सेवा निःशुल्क हो?', a: 'हो। यो सेवा पूर्ण रूपमा निःशुल्क हो र कुनै दर्ता आवश्यक छैन।' },
                          { q: 'मेरो व्यक्तिगत जानकारी सुरक्षित छ?', a: 'तपाईंले राख्ने नम्बर खोजका लागि मात्र प्रयोग गरिन्छ। हामी कुनै पनि व्यक्तिगत डेटा सुरक्षित गर्दैनौं।' },
                        ]
                      : [
                          { q: 'How to check smart licence printed list online on dotm.gov.np?', a: 'Enter your driving license number in the XX-XX-XXXXXXXX format in our search tool above and click “Check Status”. Our system instantly searches across 1,000,000+ official DOTM printed records and shows whether your card is printed and ready for pickup at your local transport office.' },
                          { q: 'Can I check my driving license print status by citizenship number or name?', a: 'Currently, the Department of Transport Management (DOTM Nepal) publishes the printed license list strictly by Driving License Number (XX-XX-XXXXXXXX). Direct search by citizenship number or applicant name is not supported on the public print list due to privacy protection. You can find your license number on your exam pass slip, payment receipt, or old license card.' },
                          { q: 'How do I know if my license has been printed?', a: 'Enter your license number in the search box above and press “Check Status”. If your record appears in the official DOTM list, the page will show “Card is Printed & Ready” with complete details.' },
                          { q: 'What is the license number format?', a: 'XX-XX-XXXXXXXX — the first two digits are your office code, the next two are the district code, and the last eight are your personal number. Example: 01-01-12345678.' },
                          { q: 'Where can I find my license number?', a: 'It’s printed on your old smart card license, on your exam receipt, or on the temporary slip your transport office gave you when you applied.' },
                          { q: 'What do I need to bring to collect the license?', a: 'Your original Citizenship card, your old driving license (if you have one), and your payment receipt. Bring them to the transport office where you applied.' },
                          { q: 'My result says “Not Printed Yet” — what should I do?', a: 'Your card is likely still in the print backlog. DOTM updates the list regularly, so check back in a few days. You can also view the full list at dotm.gov.np.' },
                          { q: 'Can I also check via SMS?', a: 'Yes! Send your license number (LC <space> <Application ID or License No>) to 33001, 34949 or 31003 — works on NTC, Ncell, and Smart Cell.' },
                          { q: 'How often is the data updated?', a: 'DOTM publishes the printed-license list approximately weekly. Our system syncs that list regularly so results stay current.' },
                          { q: 'Is this the official government website?', a: 'No. This is an independent public utility. The underlying data comes from dotm.gov.np, which is the official source.' },
                          { q: 'Is this service free to use?', a: 'Yes — it is 100% free and requires no sign-up or registration.' },
                          { q: 'Is my personal information safe?', a: 'The license number you enter is used only to query the database. We do not store or track personal searches.' },
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

          </section>
        )}

        {/* Modern Unified Footer */}
        <footer className="mt-14 border-t border-[var(--border-default)]/70 pt-8 pb-10 print:hidden text-xs text-[var(--text-secondary)]">
          {/* Developer & Open Source Contribution Box */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-sm transition hover:border-[var(--nepal-blue)]/40 mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--text-primary)] text-[var(--surface-primary)] shadow-sm">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--text-primary)] text-xs sm:text-sm">
                      {language === 'ne' ? 'खुला-स्रोत परियोजना (Open Source)' : 'Open Source Project'}
                    </span>
                    <span className="rounded-full bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--nepal-blue)]">
                      Public Repo
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
                    {language === 'ne'
                      ? 'यदि तपाईं डेभलपर हुनुहुन्छ र यस परियोजनामा योगदान दिन चाहनुहुन्छ भने गिटहबमा स्वागत छ। कुनै समस्या वा बग भेटिएमा GitHub Issues मा रिपोर्ट गर्नुहोस्।'
                      : 'If you are a developer and want to contribute to this project, the repository is open for contributions. Found an issue or bug? Please report it on GitHub Issues.'}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 sm:flex-shrink-0">
                <a
                  href="https://github.com/NischalAcharya060/Nepal-License-Checker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--text-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--surface-primary)] shadow-sm transition hover:opacity-90 active:scale-95"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>{language === 'ne' ? 'गिटहब रिपो' : 'Contribute'}</span>
                </a>
                <a
                  href="https://github.com/NischalAcharya060/Nepal-License-Checker/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-red)]">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{language === 'ne' ? 'समस्या रिपोर्ट' : 'Report Issue'}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Links & Navigation Row */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 pb-6 border-b border-[var(--border-default)]/60 text-xs">
            <button
              type="button"
              onClick={() => setIsOfficesModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-medium hover:text-[var(--nepal-blue)] transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                <path d="M9 22v-4h6v4" />
                <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
              </svg>
              <span>{language === 'ne' ? 'यातायात कार्यालयहरू' : 'Transport Offices'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSmsModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-medium hover:text-[var(--nepal-blue)] transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <span>{language === 'ne' ? 'एसएमएस सेवा (३३००१)' : 'SMS Service (33001)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSampleModalOpen(true)}
              className="inline-flex items-center gap-1.5 font-medium hover:text-[var(--nepal-blue)] transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <circle cx="9" cy="10" r="2" />
                <path d="M15 8h2M15 12h2M7 16h10" />
              </svg>
              <span>{language === 'ne' ? 'नम्बर ढाँचा गाइड' : 'License Format Guide'}</span>
            </button>

            <a
              href="https://dotm.gov.np/category/details-of-printed-licenses/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium hover:text-[var(--nepal-blue)] transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>DOTM Official</span>
            </a>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('faq');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 font-medium hover:text-[var(--nepal-blue)] transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{language === 'ne' ? 'प्रायः सोधिने प्रश्नहरू' : 'FAQs'}</span>
            </button>
          </div>

          {/* Bottom Attribution & Status Bar */}
          <div className="pt-6 flex flex-col items-center justify-between gap-3 sm:flex-row text-[11px] text-[var(--text-muted)] text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="font-semibold text-[var(--text-primary)]">Nepal License Checker</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                <span>Data from <a href="https://dotm.gov.np" target="_blank" rel="noopener noreferrer" className="font-medium text-[var(--nepal-blue)] hover:underline">dotm.gov.np</a></span>
              </span>
              <span>·</span>
              <span className="font-mono text-[10px]">v2.0.0</span>
              {viewCount !== null && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-medium text-[var(--text-secondary)]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>{viewCount.toLocaleString(dateLocale)} {copy.home.totalViewsLabel}</span>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center justify-center gap-1">
              <span>{copy.home.developerCreditLabel}</span>
              <a
                href="https://acharyanischal.com.np/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--nepal-blue)] hover:underline"
              >
                Nischal Acharya
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Sample License Image Guide Modal */}
      {isSampleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-md animate-fade-in" onClick={() => setIsSampleModalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="License format guide"
            className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-[var(--surface-primary)] shadow-2xl animate-rise-in border border-[var(--border-default)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label="Close guide"
              onClick={() => setIsSampleModalOpen(false)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-[var(--nepal-red)] hover:scale-105 active:scale-95 shadow-md"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="p-3 bg-[var(--bg-secondary)]/50">
              <Image src="/license-sample2.png" alt="License format guide" width={1200} height={760} className="h-auto w-full rounded-2xl object-cover shadow-xs border border-[var(--border-default)]" priority />
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
      )}

      {/* Transport Offices Directory Modal */}
      <OfficesModal
        isOpen={isOfficesModalOpen}
        onClose={() => setIsOfficesModalOpen(false)}
        copy={copy.officesModal}
        language={language}
      />

      {/* SMS Service Guide Modal */}
      <SmsModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        copy={copy.smsGuide}
        language={language}
        initialNumber={lastSearched || externalNumber || ''}
      />
    </main>
  )
}
