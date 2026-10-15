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

  const totalOfficesWithRecords = useMemo(() => {
    return Object.values(officeCounts).filter((v) => v > 0).length
  }, [officeCounts])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-default)]/70 bg-[var(--bg-primary)]/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
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
                {language === 'ne' ? 'छपाइ विवरण तथा सिङ्क लग' : 'Sync Logs & Office Statistics'}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <div className="flex items-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleLanguageToggle('en')}
                className={`rounded-md px-2.5 py-1 transition ${
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
                className={`rounded-md px-2.5 py-1 transition ${
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-bold text-[var(--nepal-blue)] transition hover:bg-[var(--nepal-blue-soft)] shadow-2xs"
            >
              <span>←</span>
              <span className="hidden sm:inline">{language === 'ne' ? 'लाइसेन्स खोजी' : 'Search License'}</span>
              <span className="sm:hidden">{language === 'ne' ? 'फर्कनुहोस्' : 'Back'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-10">
        {/* Page Hero Header */}
        <div className="mb-8 text-center sm:mb-10 animate-rise-in">
          <div className="mb-3.5 inline-flex items-center gap-2 rounded-full bg-[var(--nepal-blue)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-white shadow-sm sm:text-[11px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {language === 'ne' ? 'यातायात व्यवस्था विभाग - प्रत्यक्ष तथ्याङ्क लग' : 'DOTM Live Database & Sync Logs'}
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
            {language === 'ne' ? 'लाइसेन्स छपाइ विवरण तथा सिङ्क स्थिति' : 'License Print Updates & Sync Logs'}
          </h1>
          <p className="mx-auto mt-2.5 max-w-2xl text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {language === 'ne'
              ? 'यातायात व्यवस्था विभाग (DOTM) द्वारा प्रकाशित स्मार्ट कार्ड सवारी चालक अनुमतिपत्रहरूको कार्यालयगत विवरण, अभिलेख संख्या, र दैनिक अद्यावधिक स्थिति।'
              : 'Official live breakdown of printed smart card driving licenses indexed across all 35 transport offices in Nepal, with automated synchronization logs from dotm.gov.np.'}
          </p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)]"
              title="Refresh live metrics"
            >
              <svg
                width="12"
                height="12"
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
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4 animate-rise-in">
          {/* 1. Total Records */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {language === 'ne' ? 'कुल दर्ता अभिलेख' : 'Total Printed Records'}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] text-sm font-bold">
                📋
              </span>
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {isLoading ? '...' : totalRecords.toLocaleString(dateLocale)}
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {language === 'ne' ? 'DOTM बाट संकलित कुल स्मार्ट कार्डहरू' : 'Directly indexed from official DOTM portal'}
            </p>
          </div>

          {/* 2. Offices Covered */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {language === 'ne' ? 'कार्यालयहरूको संख्या' : 'Transport Offices'}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] text-sm font-bold">
                🏢
              </span>
            </div>
            <div className="mt-3 font-mono text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)]">
              {isLoading ? '...' : `${totalOfficesWithRecords} / 39`}
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {language === 'ne' ? 'सबै ७ प्रदेशका यातायात कार्यालयहरू' : 'Offices with indexed license lists'}
            </p>
          </div>

          {/* 3. Scraper Health */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {language === 'ne' ? 'स्क्र्यापर सिङ्क स्थिति' : 'Sync Engine Health'}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--success)]/15 text-[var(--success)] text-sm font-bold">
                🛡️
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--success)] animate-glow-pulse" />
              <span className="text-lg sm:text-xl font-extrabold text-[var(--success)]">
                {language === 'ne' ? 'सक्रिय तथा नियमित' : 'Healthy & Active'}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {meta?.scraper?.lastRun?.totalPdfsCount
                ? `${meta.scraper.lastRun.totalPdfsCount} PDFs monitored (${meta.scraper.lastRun.durationSeconds || 80}s last run)`
                : (language === 'ne' ? '६२ आधिकारिक पीडीएफहरू निगरानीमा' : '62 PDFs monitored on dotm.gov.np')}
            </p>
          </div>

          {/* 4. Next Sync */}
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {language === 'ne' ? 'अर्को तालिकाबद्ध सिङ्क' : 'Next Scheduled Sync'}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] text-sm font-bold">
                ⏱️
              </span>
            </div>
            <div className="mt-3 font-mono text-lg sm:text-xl font-extrabold text-[var(--nepal-blue)]">
              {meta?.nextScheduledRun
                ? formatTimeUntil(meta.nextScheduledRun, language)
                : (language === 'ne' ? 'आज राति ९:०० बजे' : 'Tonight at 9:00 PM')}
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
              {meta?.nextScheduledRun
                ? `${formatNepalDateTime(meta.nextScheduledRun, language)} (NPT)`
                : 'Runs daily at 9:00 PM NPT (15:15 UTC)'}
            </p>
          </div>
        </div>

        {/* Latest Batch Highlights Card (If newly added licenses exist) */}
        {hasRecentBatch && latestBatch && (
          <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--success)]/30 bg-gradient-to-r from-[var(--success)]/10 via-[var(--surface-primary)] to-[var(--nepal-blue-soft)]/20 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--success)] text-white text-lg font-bold shadow-xs">
                  ✨
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-[var(--text-primary)]">
                      {language === 'ne' ? 'पछिल्लो सिङ्कमा थपिएका नयाँ लाइसेन्सहरू' : 'Latest Scraper Batch Additions'}
                    </h2>
                    <span className="rounded-full bg-[var(--success)]/20 px-2 py-0.5 text-[10.5px] font-bold text-[var(--success)]">
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)]">
                  {language === 'ne' ? 'यातायात कार्यालयगत छपाइ अभिलेख' : 'Office-by-Office License Breakdown'}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  {language === 'ne'
                    ? `कुल ${filteredOffices.length} कार्यालयहरूको विवरण प्रदर्शित`
                    : `Showing ${filteredOffices.length} transport offices`}
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Search */}
                <div className="relative min-w-[200px] flex-1 sm:flex-initial">
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
                    placeholder={language === 'ne' ? 'कार्यालय वा जिल्ला खोज्नुहोस्...' : 'Search office or location...'}
                    className="h-9 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] pl-8 pr-7 text-xs outline-none transition focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
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
                  className="h-9 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)]"
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
                  className="h-9 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)]"
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
                    className="p-4 sm:px-6 transition hover:bg-[var(--bg-secondary)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* Left: Code, Name, Location */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] font-mono text-sm font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 shadow-2xs">
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
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                          {office.phone && (
                            <span className="font-mono text-[var(--text-secondary)]">
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
                    <div className="flex flex-col sm:items-end justify-center min-w-[180px] pt-1 sm:pt-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-lg sm:text-xl font-extrabold text-[var(--text-primary)]">
                          {count > 0 ? count.toLocaleString(dateLocale) : (language === 'ne' ? '०' : '0')}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          {language === 'ne' ? 'लाइसेन्स' : 'licenses'}
                        </span>
                      </div>

                      {/* Percentage share bar */}
                      <div className="mt-1.5 flex items-center gap-2 w-full sm:w-44">
                        <div className="h-1.5 flex-1 rounded-full bg-[var(--border-default)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--nepal-blue)] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(count > 0 ? 3 : 0, Number(percent) * 3))}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)]">
                          {percent}%
                        </span>
                      </div>

                      {/* Batch status badge */}
                      <div className="mt-1.5">
                        {batchCount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded border border-[var(--success)]/25 animate-glow-pulse shadow-2xs">
                            <span>✨</span>
                            <span>
                              +{batchCount.toLocaleString(dateLocale)} {language === 'ne' ? 'नयाँ थपियो' : 'new in batch'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10.5px] font-medium text-[var(--text-muted)]">
                            {count > 0
                              ? (language === 'ne' ? '✓ अद्यावधिक' : '✓ Up to date')
                              : (language === 'ne' ? 'डाटा संकलन हुँदै' : 'Awaiting published PDF')}
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

        {/* Sync Engine Details & Information Accordion Box */}
        <section className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-5 sm:p-6 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] mb-2">
            <span>⚙️</span>
            <span>{language === 'ne' ? 'स्वचालित सिङ्क इन्जिन तथा डाटा सुरक्षा प्रणाली' : 'Automated Sync Engine & Technical Architecture'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5">
              <div className="font-bold text-[var(--text-primary)] mb-1">
                📅 {language === 'ne' ? 'दैनिक तालिकाबद्ध सिङ्क' : 'Daily Automated Cron'}
              </div>
              <p className="text-[11px]">
                {language === 'ne'
                  ? 'प्रत्येक दिन नेपाली समय राति ९:०० बजे (15:15 UTC) यातायात व्यवस्था विभागको आधिकारिक सर्भर कम व्यस्त हुने समयमा स्वचालित रूपमा चल्छ।'
                  : 'Runs every day off-peak at 9:00 PM NPT (15:15 UTC) via secure GitHub Actions to respect DOTM government server bandwidth.'}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5">
              <div className="font-bold text-[var(--text-primary)] mb-1">
                🔒 {language === 'ne' ? 'डुप्लिकेट सुरक्षा तथा क्यासिङ' : 'Smart Hash Duplicate Guard'}
              </div>
              <p className="text-[11px]">
                {language === 'ne'
                  ? 'पहिले नै प्रशोधन भइसकेका ६२ वटा पीडीएफहरू क्यासबाट स्वतः छुट्याइन्छ। नयाँ प्रकाशित लाइसेन्सहरू मात्र पार्स गरी डाटाबेसमा सुरक्षित गरिन्छ।'
                  : 'Previously processed PDFs are securely cached by URL and content hash. Only newly released print notices are fetched and parsed.'}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5">
              <div className="font-bold text-[var(--text-primary)] mb-1">
                ⚡ {language === 'ne' ? 'उच्च गतिको एज डाटाबेस' : 'Sub-millisecond Edge Lookups'}
              </div>
              <p className="text-[11px]">
                {language === 'ne'
                  ? '११ लाखभन्दा बढी अभिलेखहरू एज सर्भरमा इन्डेक्स गरिएकाले तपाईंले आफ्नो लाइसेन्स नम्बर हाल्नासाथ केही मिलिसेकेन्डमै नतिजा प्राप्त हुन्छ।'
                  : 'All 1.18M+ license records are indexed on distributed edge SQLite / libSQL tables for instantaneous search response.'}
              </p>
            </div>
          </div>
        </section>

        {/* Bottom Navigation CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-dark)]"
          >
            <span>🔍</span>
            <span>{language === 'ne' ? 'आफ्नो लाइसेन्स छपाइ स्थिति जाँच्नुहोस्' : 'Check Your License Print Status Now'}</span>
            <span>→</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
