'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getAllTransportOffices, aggregateOfficeStats } from '@/lib/offices'
import { formatNepalDateTime, formatTimeUntil } from '@/lib/cronHelper'
import type { AppMetadata, LatestBatchData } from '@/app/api/meta/route'

export default function UpdatesPage() {
  const [language, setLanguage] = useState<'en' | 'ne'>(() => {
    if (typeof window === 'undefined') return 'en'
    try {
      const savedLang = window.localStorage.getItem('ui-language')
      if (savedLang === 'ne' || savedLang === 'en') return savedLang
      if (navigator.language.startsWith('ne')) return 'ne'
    } catch {
      // Ignore
    }
    return 'en'
  })
  const [meta, setMeta] = useState<AppMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedProvince, setSelectedProvince] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'records' | 'recent' | 'code' | 'name'>('records')
  const [onlyUpdated, setOnlyUpdated] = useState(false)

  const handleLanguageToggle = (lang: 'en' | 'ne') => {
    setLanguage(lang)
    try {
      window.localStorage.setItem('ui-language', lang)
      document.documentElement.lang = lang
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    let isMounted = true
    fetch('/api/meta', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (isMounted && payload?.data) {
          setMeta(payload.data)
        }
      })
      .catch((err) => {
        console.error('Failed to load updates metadata:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/meta', { cache: 'no-store' })
      if (res.ok) {
        const payload = await res.json()
        if (payload?.data) {
          setMeta(payload.data)
        }
      }
    } catch (err) {
      console.error('Failed to refresh updates metadata:', err)
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  const dateLocale = language === 'ne' ? 'ne-NP' : 'en-NP'
  const offices = useMemo(() => getAllTransportOffices(), [])
  const officeCounts = useMemo(() => aggregateOfficeStats(meta?.officeTotals), [meta?.officeTotals])
  const latestBatch = meta?.latestBatch as LatestBatchData | null
  const batchCounts = useMemo(() => aggregateOfficeStats(latestBatch?.offices), [latestBatch?.offices])

  const totalRecords = meta?.totalRecords || Object.values(officeCounts).reduce((a, b) => a + b, 0) || 1185710

  const hasRecentBatch = Boolean(
    latestBatch && latestBatch.total > 0 && Object.keys(batchCounts).length > 0
  )

  const provinces = useMemo(() => {
    const set = new Set<string>()
    for (const o of offices) {
      set.add(language === 'ne' ? o.provinceNe : o.provinceEn)
    }
    return Array.from(set).sort()
  }, [offices, language])

  // Filter & sort offices
  const filteredOffices = useMemo(() => {
    let list = [...offices]

    // Province filter
    if (selectedProvince !== 'all') {
      list = list.filter((o) => {
        const prov = language === 'ne' ? o.provinceNe : o.provinceEn
        return prov === selectedProvince
      })
    }

    // Only updated filter
    if (onlyUpdated) {
      list = list.filter((o) => (batchCounts[o.code] || 0) > 0)
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((o) => {
        return (
          o.code.includes(q) ||
          o.nameEn.toLowerCase().includes(q) ||
          o.nameNe.includes(q) ||
          o.locationEn.toLowerCase().includes(q) ||
          o.locationNe.includes(q) ||
          o.provinceEn.toLowerCase().includes(q) ||
          o.provinceNe.includes(q) ||
          o.addressEn.toLowerCase().includes(q) ||
          o.addressNe.includes(q)
        )
      })
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'records') {
        const countA = officeCounts[a.code] || 0
        const countB = officeCounts[b.code] || 0
        return countB - countA || Number(a.code) - Number(b.code)
      }
      if (sortBy === 'recent') {
        const recentA = batchCounts[a.code] || 0
        const recentB = batchCounts[b.code] || 0
        if (recentA !== recentB) return recentB - recentA
        return (officeCounts[b.code] || 0) - (officeCounts[a.code] || 0)
      }
      if (sortBy === 'code') {
        return Number(a.code) - Number(b.code)
      }
      if (sortBy === 'name') {
        const nameA = language === 'ne' ? a.nameNe : a.nameEn
        const nameB = language === 'ne' ? b.nameNe : b.nameEn
        return nameA.localeCompare(nameB)
      }
      return 0
    })

    return list
  }, [offices, selectedProvince, onlyUpdated, search, sortBy, officeCounts, batchCounts, language])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-default)]/70 bg-[var(--bg-primary)]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            <Image
              src="/License-Checker-Nepal-logo.png"
              alt="Nepal License Checker"
              width={34}
              height={34}
              className="h-8 w-8 object-contain"
            />
            <div>
              <span className="block text-sm font-extrabold tracking-tight text-[var(--text-primary)]">
                Nepal License Checker
              </span>
              <span className="block text-[10.5px] font-semibold text-[var(--text-muted)]">
                {language === 'ne' ? 'छपाइ तथ्याङ्क तथा सिङ्क स्थिति' : 'Live Sync Metrics & Directory'}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-0.5 text-xs font-bold shadow-2xs">
              <button
                type="button"
                onClick={() => handleLanguageToggle('en')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  language === 'en'
                    ? 'bg-[var(--nepal-blue)] text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageToggle('ne')}
                className={`rounded-lg px-2.5 py-1 transition ${
                  language === 'ne'
                    ? 'bg-[var(--nepal-blue)] text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                नेपाली
              </button>
            </div>

            {/* Back to Home Button */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--nepal-blue)] transition hover:bg-[var(--nepal-blue-soft)] shadow-2xs"
            >
              <span>←</span>
              <span className="hidden sm:inline">{language === 'ne' ? 'लाइसेन्स खोजी पृष्ठ' : 'License Search'}</span>
              <span className="sm:hidden">{language === 'ne' ? 'फर्कनुहोस्' : 'Back'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 sm:py-12">
        {/* Page Hero Header */}
        <div className="mb-8 text-center sm:mb-12 animate-rise-in">
          {/* Nepal Flag GIF */}
          <div className="mb-3 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Nepal-flag.gif"
              alt=""
              aria-hidden
              width={42}
              height={58}
              className="h-12 w-auto object-contain drop-shadow-xs"
            />
          </div>

          {/* Accent Ribbon */}
          <div className="mb-4 flex items-center justify-center gap-2" aria-hidden>
            <div className="h-1.5 w-10 rounded-l-full bg-[var(--nepal-red)]" />
            <div className="h-2 w-2 rounded-full border-2 border-[var(--border-default)] bg-[var(--surface-primary)]" />
            <div className="h-1.5 w-10 rounded-r-full bg-[var(--nepal-blue)]" />
          </div>

          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-[var(--nepal-blue)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-white shadow-sm sm:text-[11px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            {language === 'ne' ? 'यातायात व्यवस्था विभाग · आधिकारिक छपाइ अभिलेख' : 'DOTM NEPAL · OFFICIAL PRINTED REGISTRY'}
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {language === 'ne' ? 'लाइसेन्स छपाइ तथ्याङ्क तथा कार्यालयगत विवरण' : 'License Print Statistics & Office Volumes'}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {language === 'ne'
              ? 'यातायात व्यवस्था विभाग (DOTM) बाट सार्वजनिक गरिएका १.१८ मिलियनभन्दा बढी स्मार्ट कार्ड सवारी चालक अनुमतिपत्रहरूको कार्यालयगत विवरण र प्रत्यक्ष सिङ्क स्थिति।'
              : 'Live office-by-office breakdown of 1.18M+ printed smart card driving licenses indexed across all 35 transport offices in Nepal.'}
          </p>

          <div className="mt-4 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] shadow-2xs"
              title="Refresh live metrics"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={isRefreshing ? 'animate-spin text-[var(--nepal-blue)]' : ''}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{isRefreshing ? (language === 'ne' ? 'लोड हुँदैछ...' : 'Refreshing...') : (language === 'ne' ? 'ताजा गर्नुहोस्' : 'Refresh Metrics')}</span>
            </button>

            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              {meta?.lastUpdated ? (
                language === 'ne'
                  ? `पछिल्लो सिङ्क: ${formatNepalDateTime(meta.lastUpdated, 'ne')}`
                  : `Last synced: ${formatNepalDateTime(meta.lastUpdated, 'en')}`
              ) : null}
            </span>
          </div>
        </div>

        {/* 2 Clean Executive Metric Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 animate-rise-in">
          {/* Card 1: Total Records */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--surface-primary)] to-[var(--nepal-blue-soft)]/20 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {language === 'ne' ? 'कुल दर्ता लाइसेन्स अभिलेख' : 'Total Printed Records Indexed'}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white text-base font-bold shadow-xs">
                📋
              </span>
            </div>
            <div className="mt-4 font-mono text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)]">
              {isLoading ? '...' : totalRecords.toLocaleString(dateLocale)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex h-2 w-2 rounded-full bg-[var(--success)] animate-glow-pulse" />
              <span>{language === 'ne' ? 'DOTM को सम्पूर्ण सार्वजनिक सूची शतप्रतिशत समावेश' : 'Mirroring 100% of published DOTM printed card notices'}</span>
            </div>
          </div>

          {/* Card 2: Next Scheduled Sync */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--surface-primary)] to-[var(--success)]/10 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {language === 'ne' ? 'अर्को तालिकाबद्ध सिङ्क' : 'Next Automated Synchronization'}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success)] text-white text-base font-bold shadow-xs">
                ⏱️
              </span>
            </div>
            <div className="mt-4 font-mono text-2xl sm:text-3xl font-black tracking-tight text-[var(--nepal-blue)]">
              {meta?.nextScheduledRun
                ? formatTimeUntil(meta.nextScheduledRun, language)
                : (language === 'ne' ? 'आज राति ९:०० बजे' : 'Tonight at 9:00 PM')}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">
                {meta?.nextScheduledRun
                  ? `${formatNepalDateTime(meta.nextScheduledRun, language)} (NPT)`
                  : 'Daily off-peak run at 9:00 PM NPT (15:15 UTC)'}
              </span>
            </div>
          </div>
        </div>

        {/* Latest Batch Highlights Card (If newly added licenses exist) */}
        {hasRecentBatch && latestBatch && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--success)]/30 bg-gradient-to-r from-[var(--success)]/10 via-[var(--surface-primary)] to-[var(--nepal-blue-soft)]/20 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--success)] text-white text-lg font-bold shadow-xs">
                  ✨
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                      {language === 'ne' ? 'पछिल्लो सिङ्कमा थपिएका नयाँ लाइसेन्सहरू' : 'Latest Scraper Batch Additions'}
                    </h2>
                    <span className="rounded-full bg-[var(--success)]/20 px-2 py-0.5 text-[11px] font-bold text-[var(--success)]">
                      +{latestBatch.total.toLocaleString(dateLocale)} {language === 'ne' ? 'नयाँ' : 'new'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {language === 'ne'
                      ? `पछिल्लो पटक ${Object.keys(batchCounts).length} यातायात कार्यालयहरूबाट कुल +${latestBatch.total.toLocaleString(dateLocale)} नयाँ स्मार्ट कार्ड लाइसेन्स डाटाबेसमा थपिएको छ।`
                      : `Successfully indexed +${latestBatch.total.toLocaleString(dateLocale)} new smart card licenses across ${Object.keys(batchCounts).length} transport offices.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setOnlyUpdated((prev) => !prev)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition shadow-2xs ${
                    onlyUpdated
                      ? 'bg-[var(--success)] text-white'
                      : 'border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] hover:border-[var(--success)] hover:text-[var(--success)]'
                  }`}
                >
                  {onlyUpdated
                    ? (language === 'ne' ? 'सबै कार्यालयहरू हेर्नुहोस्' : 'Show All Offices')
                    : (language === 'ne' ? 'नयाँ थपिएका मात्र हेर्नुहोस्' : 'Filter Updated Only')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Office-by-Office Breakdown Section */}
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm overflow-hidden">
          {/* Section Controls Bar */}
          <div className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)]">
                    {language === 'ne' ? 'यातायात कार्यालयगत छपाइ अभिलेख' : 'Office-by-Office License Breakdown'}
                  </h2>
                  <span className="rounded-full bg-[var(--nepal-blue-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20">
                    {filteredOffices.length}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {language === 'ne'
                    ? 'सबै कार्यालयहरूको नाम, प्रदेश, छापिएको लाइसेन्स संख्या, र सिङ्क स्थिति'
                    : 'Showing verified offices, indexed license counts, and sync status'}
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative min-w-[210px] flex-1 sm:flex-initial">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={language === 'ne' ? 'कार्यालय वा जिल्ला खोज्नुहोस्...' : 'Search office or district...'}
                    className="h-9 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] pl-8 pr-7 text-xs outline-none transition focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/20 shadow-2xs"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Province Filter */}
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="h-9 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)] shadow-2xs"
                >
                  <option value="all">{language === 'ne' ? 'सबै प्रदेशहरू' : 'All Provinces'}</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>

                {/* Sort Option */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'records' | 'recent' | 'code' | 'name')}
                  className="h-9 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)] shadow-2xs"
                >
                  <option value="records">{language === 'ne' ? 'धेरै लाइसेन्स संख्या' : 'Most Licenses'}</option>
                  <option value="recent">{language === 'ne' ? 'पछिल्लो अपडेट' : 'Recently Updated'}</option>
                  <option value="code">{language === 'ne' ? 'कार्यालय कोड' : 'Office Code'}</option>
                  <option value="name">{language === 'ne' ? 'नाम अनुसार (A-Z)' : 'Name (A-Z)'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table / Cards List */}
          <div className="divide-y divide-[var(--border-default)]/70">
            {filteredOffices.length === 0 ? (
              <div className="p-12 text-center text-xs text-[var(--text-muted)] sm:text-sm">
                {language === 'ne'
                  ? 'तपाईंको खोजी अनुसार कुनै कार्यालय फेला परेन।'
                  : 'No transport office matches your filter criteria.'}
              </div>
            ) : (
              filteredOffices.map((office) => {
                const count = officeCounts[office.code] || 0
                const batchCount = batchCounts[office.code] || 0
                const percent = totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(1) : '0'

                return (
                  <div
                    key={office.code}
                    className="p-4 sm:px-6 transition hover:bg-[var(--bg-secondary)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Left: Code, Name, Location */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--nepal-blue-soft)] to-transparent font-mono text-sm font-black text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/25 shadow-2xs">
                        {office.code}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
                            {language === 'ne' ? office.nameNe : office.nameEn}
                          </h3>
                          <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--text-muted)] border border-[var(--border-default)]">
                            {language === 'ne' ? office.provinceNe : office.provinceEn}
                          </span>
                        </div>

                        <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          📍 {language === 'ne' ? office.addressNe : office.addressEn}
                        </div>

                        {/* Contacts & Website */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px]">
                          {office.phone && (
                            <span className="font-mono text-[var(--text-secondary)] inline-flex items-center gap-1">
                              📞 {office.phone}
                            </span>
                          )}
                          {office.website && (
                            <a
                              href={office.website.startsWith('http') ? office.website : `https://${office.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-[var(--nepal-blue)] hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>🌐 {office.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                              <span>↗</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Printed Count & Progress */}
                    <div className="flex flex-col sm:items-end justify-center min-w-[200px] pt-1 sm:pt-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                          {count > 0 ? count.toLocaleString(dateLocale) : (language === 'ne' ? '०' : '0')}
                        </span>
                        <span className="text-xs font-semibold text-[var(--text-muted)]">
                          {language === 'ne' ? 'लाइसेन्स छापिएका' : 'licenses printed'}
                        </span>
                      </div>

                      {/* Percentage share bar */}
                      <div className="mt-1.5 flex items-center gap-2 w-full sm:w-48">
                        <div className="h-1.5 flex-1 rounded-full bg-[var(--border-default)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--nepal-blue)] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(count > 0 ? 3 : 0, Number(percent) * 3))}%` }}
                          />
                        </div>
                        <span className="text-[10.5px] font-mono font-bold text-[var(--text-muted)]">
                          {percent}%
                        </span>
                      </div>

                      {/* Batch status badge */}
                      <div className="mt-1.5">
                        {batchCount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-md border border-[var(--success)]/25 animate-glow-pulse shadow-2xs">
                            <span>✨</span>
                            <span>
                              +{batchCount.toLocaleString(dateLocale)} {language === 'ne' ? 'नयाँ थपियो' : 'new in batch'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-[var(--text-muted)]">
                            {count > 0 ? (
                              <>
                                <span className="text-[var(--success)] font-bold">✓</span>
                                <span>{language === 'ne' ? 'अद्यावधिक' : 'Up to date'}</span>
                              </>
                            ) : (
                              <span>{language === 'ne' ? 'डाटा संकलन हुँदै' : 'Awaiting published PDF'}</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Bottom CTA to Check License */}
        <div className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--nepal-blue)] px-7 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-md transition hover:bg-[var(--nepal-blue-dark)] hover:shadow-lg active:scale-98"
          >
            <span>🔍</span>
            <span>{language === 'ne' ? 'आफ्नो सवारी चालक अनुमतिपत्र छपाइ स्थिति जाँच्नुहोस्' : 'Check Your Smart Card License Status Now'}</span>
            <span>→</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
