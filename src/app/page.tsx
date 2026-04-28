'use client'

import Image from 'next/image'
import { useState, useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import LicenseForm from '@/components/LicenseForm'
import LicenseResult from '@/components/LicenseResult'
import { uiCopy } from '@/lib/i18n'

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

export default function Home() {
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [result, setResult] = useState<LicenseData | null>(null)
  const [lastSearched, setLastSearched] = useState<string>('')
  const [theme, setTheme] = useState<ThemeMode>('light')
  const [hydratedPreferences, setHydratedPreferences] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [indexedRecords, setIndexedRecords] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const copy = uiCopy

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
    setHydratedPreferences(true)
  }, [])

  useEffect(() => {
    if (!hydratedPreferences) return
    applyThemeToDocument(theme)
    window.localStorage.setItem('ui-theme', theme)
  }, [hydratedPreferences, theme])

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

  const lastUpdatedDisplay = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleString('en-NP', {
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
      metaSub: indexedRecords !== null ? `${indexedRecords.toLocaleString('en-NP')} records indexed` : null,
    },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="animate-float-soft absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[var(--nepal-blue)]/10 blur-3xl" />
        <div className="animate-float-soft absolute top-24 -right-24 h-72 w-72 rounded-full bg-[var(--nepal-red)]/10 blur-3xl" style={{ animationDelay: '0.8s' }} />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12">
        <header className="mb-8 text-center sm:mb-10">
          <div className="mb-5 flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <div className="hover-lift inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 text-[11px]" role="group" aria-label="Theme switch">
              <span className="px-2 text-[var(--text-muted)]">{copy.home.themeLabel}</span>
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
                className={`rounded-full px-2.5 py-1 font-semibold transition ${
                  theme === 'light' ? 'bg-[var(--nepal-blue)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                  {copy.home.lightLabel}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
                className={`rounded-full px-2.5 py-1 font-semibold transition ${
                  theme === 'dark' ? 'bg-[var(--nepal-blue)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z" />
                  </svg>
                  {copy.home.darkLabel}
                </span>
              </button>
            </div>
          </div>

          <div className="mb-5 flex items-center justify-center gap-2 animate-float-soft">
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

          <h1 className="mb-3 animate-rise-in text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {copy.home.title} <span className="text-[var(--nepal-blue)]">{copy.home.titleAccent}</span>
          </h1>
          <p className="mx-auto max-w-xl animate-rise-in text-sm leading-6 text-[var(--text-secondary)] sm:text-base" style={{ animationDelay: '0.06s' }}>
            {copy.home.description}
          </p>
        </header>

        <LicenseForm onSubmit={checkLicense} onReset={reset} loading={searchState === 'loading'} copy={copy.form} />

        {(searchState === 'found' || searchState === 'not_found' || searchState === 'error') && (
          <div className="mt-5 animate-slide-up">
            <LicenseResult state={searchState} result={result} licenseNumber={lastSearched} onCheckAnother={reset} copy={copy.result} dateLocale="en-NP" />
          </div>
        )}

        {searchState === 'idle' && (
          <section className="mt-7 animate-fade-in" aria-label="Helpful info">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Helpful Information</h2>
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
                        View example
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
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">Format Guide</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                You can find your license number on your temporary receipt or your old smart card.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
