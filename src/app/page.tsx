'use client'

import { useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import Navbar, { type ThemeMode } from '@/components/Navbar'
import HeroHeader from '@/components/HeroHeader'
import LicenseForm from '@/components/LicenseForm'
import LicenseResult from '@/components/LicenseResult'
import EducationalSection from '@/components/EducationalSection'
import HowToSection from '@/components/HowToSection'
import FaqSection from '@/components/FaqSection'
import Footer from '@/components/Footer'
import SampleModal from '@/components/SampleModal'
import OfficesModal from '@/components/OfficesModal'
import SmsModal from '@/components/SmsModal'
import ScrollProgressButton from '@/components/ScrollProgressButton'
import OfflineBanner from '@/components/OfflineBanner'
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

function applyThemeToDocument(theme: ThemeMode) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('dark', theme === 'dark')
}

function applyLangToDocument(lang: Language) {
  document.documentElement.setAttribute('lang', lang === 'ne' ? 'ne-NP' : 'en-NP')
}

/** Reads `?view=` once, for PWA app shortcuts that deep-link into a modal. */
function readViewParam() {
  if (typeof window === 'undefined') return ''
  try {
    return new URLSearchParams(window.location.search).get('view') || ''
  } catch {
    return ''
  }
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
  // Modal deep-links from PWA shortcuts (/?view=offices|sms).
  const [isOfficesModalOpen, setIsOfficesModalOpen] = useState(() => readViewParam() === 'offices')
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(() => readViewParam() === 'sms')
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
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const stored = window.sessionStorage.getItem('nepal_license_lockout_until')
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed > Date.now()) {
          return parsed
        }
      }
    } catch {
      // Ignore
    }
    return null
  })

  // Clean up shortcut-only params so a refresh does not reopen a modal.
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      if (!url.searchParams.has('view') && !url.searchParams.has('source')) return
      url.searchParams.delete('view')
      url.searchParams.delete('source')
      window.history.replaceState({}, '', url.toString())
    } catch {
      // Ignore
    }
  }, [])

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
          fetch('/api/meta').catch(() => null),
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
      const now = Date.now()

      // If currently locked out, prevent searching
      if (lockoutUntil && now < lockoutUntil) {
        return
      }

      // Client-side spam guard: prevents spamming searches even when Vercel Edge CDN caches duplicate queries
      try {
        const rawHistory = window.sessionStorage.getItem('nepal_license_client_searches')
        const history: number[] = rawHistory ? JSON.parse(rawHistory) : []
        const activeHistory = history.filter((ts) => now - ts < 60000)
        activeHistory.push(now)

        if (activeHistory.length > 15) {
          const lockoutDurationMs = 5 * 60 * 1000 // 5 minutes penalty
          const until = now + lockoutDurationMs
          setLockoutUntil(until)
          window.sessionStorage.setItem('nepal_license_lockout_until', String(until))
          window.sessionStorage.removeItem('nepal_license_client_searches')

          const rateMsg = copy.home.toasts.rateLimit
          toast.error(rateMsg, { duration: 6000 })
          setSearchState('error')
          return
        }

        window.sessionStorage.setItem('nepal_license_client_searches', JSON.stringify(activeHistory))
      } catch {
        // Ignore storage errors
      }

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
          const retryAfterSec = typeof data?.retryAfter === 'number' ? data.retryAfter : 300
          const until = Date.now() + retryAfterSec * 1000
          setLockoutUntil(until)
          try {
            window.sessionStorage.setItem('nepal_license_lockout_until', String(until))
          } catch {
            // Ignore
          }
          const rateMsg = data?.error || copy.home.toasts.rateLimit
          toast.error(rateMsg, { duration: 6000 })
          setSearchState('error')
          return
        }

        if (data?.offline) {
          toast.error(copy.pwa.offlineMessage)
          setSearchState('error')
          return
        }

        if (response.status === 503) {
          window.location.href = '/maintenance'
          return
        }

        // Served by the service worker from cache (offline or stale connection).
        const isFromCache = response.headers.get('X-From-Cache') === '1'

        if (!response.ok) {
          throw new Error(data.error || 'Server error')
        }

        if (isFromCache) {
          toast(copy.pwa.offlineCachedHint, { icon: '📶' })
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
        toast.error(
          typeof navigator !== 'undefined' && !navigator.onLine
            ? copy.pwa.offlineMessage
            : copy.home.toasts.serverError
        )
      }
    },
    [copy, lockoutUntil]
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

  return (
    <main className="relative min-h-screen overflow-hidden print:min-h-0 print:overflow-visible print:static">
      {/* Offline / connection-lost notice */}
      <OfflineBanner language={language} />

      {/* Background ambient blobs */}
      <div className="pointer-events-none absolute inset-0 -z-0 print:hidden">
        <div className="animate-float-soft absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[var(--nepal-blue)]/10 blur-3xl" />
        <div
          className="animate-float-soft absolute top-24 -right-24 h-72 w-72 rounded-full bg-[var(--nepal-red)]/10 blur-3xl"
          style={{ animationDelay: '0.8s' }}
        />
        <div
          className="animate-float-soft absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-[var(--nepal-blue)]/8 blur-3xl"
          style={{ animationDelay: '1.4s' }}
        />
      </div>

      {/* Modular Navbar */}
      <Navbar
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        viewCount={viewCount}
        dateLocale={dateLocale}
        lightLabel={copy.home.lightLabel}
        darkLabel={copy.home.darkLabel}
        onOpenOffices={() => setIsOfficesModalOpen(true)}
        onOpenSms={() => setIsSmsModalOpen(true)}
        onOpenSample={() => setIsSampleModalOpen(true)}
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-14 pt-6 sm:px-6 sm:pt-10 print:p-0 print:m-0 print:max-w-none">
        {/* Modular Hero Header */}
        <HeroHeader
          language={language}
          badge={copy.home.badge}
          title={copy.home.title}
          titleAccent={copy.home.titleAccent}
          description={copy.home.description}
          viewsLabel={copy.home.viewsLabel}
          indexedRecords={indexedRecords}
          viewCount={viewCount}
          lastUpdatedAt={lastUpdatedAt}
          dateLocale={dateLocale}
        />

        {/* License Query Form */}
        <div className="print:hidden">
          <LicenseForm
            onSubmit={checkLicense}
            onReset={reset}
            loading={searchState === 'loading'}
            copy={copy.form}
            language={language}
            externalNumber={externalNumber}
            lockoutUntil={lockoutUntil}
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

        {/* Educational Content & Help Sections */}
        {searchState === 'idle' && (
          <>
            <EducationalSection
              language={language}
              tilesCopy={copy.home.tiles}
              lastUpdatedLabel={copy.home.lastUpdatedLabel}
              lastUpdatedDisplay={lastUpdatedDisplay}
              indexedRecords={indexedRecords}
              dateLocale={dateLocale}
              onOpenOffices={() => setIsOfficesModalOpen(true)}
              onOpenSms={() => setIsSmsModalOpen(true)}
              onOpenSample={() => setIsSampleModalOpen(true)}
            />

            <HowToSection language={language} lastUpdatedAt={lastUpdatedAt} />

            <FaqSection language={language} lastUpdatedAt={lastUpdatedAt} />
          </>
        )}
      </div>

      {/* Modular Modern Footer - Landscape wide */}
      <Footer
        language={language}
        viewCount={viewCount}
        dateLocale={dateLocale}
        totalViewsLabel={copy.home.totalViewsLabel}
        developerCreditLabel={copy.home.developerCreditLabel}
        onOpenOffices={() => setIsOfficesModalOpen(true)}
        onOpenSms={() => setIsSmsModalOpen(true)}
        onOpenSample={() => setIsSampleModalOpen(true)}
        lastUpdatedAt={lastUpdatedAt}
        indexedRecords={indexedRecords}
        onReset={reset}
      />

      {/* Floating Dynamic Scroll Progress & Back-to-Top Button */}
      <ScrollProgressButton />

      {/* Sample License Image Guide Modal */}
      <SampleModal
        isOpen={isSampleModalOpen}
        onClose={() => setIsSampleModalOpen(false)}
        language={language}
      />

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
