'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  getAllTransportOffices,
  getTransportOfficeByOfficeName,
  aggregateOfficeStats,
  type TransportOffice,
} from '@/lib/offices'
import { formatNepalDateTime, formatTimeUntil } from '@/lib/cronHelper'
import type { AppMetadata, SyncHistoryEntry } from '@/app/api/meta/route'

const BS_MONTHS_2083 = [
  { nameEn: 'Baisakh', nameNe: 'वैशाख', start: '2026-04-14', days: 31 },
  { nameEn: 'Jestha', nameNe: 'जेठ', start: '2026-05-15', days: 31 },
  { nameEn: 'Ashadh', nameNe: 'असार', start: '2026-06-15', days: 32 },
  { nameEn: 'Shrawan', nameNe: 'साउन', start: '2026-07-17', days: 32 },
  { nameEn: 'Bhadra', nameNe: 'भदौ', start: '2026-08-18', days: 30 },
  { nameEn: 'Ashwin', nameNe: 'असोज', start: '2026-09-17', days: 30 },
  { nameEn: 'Kartik', nameNe: 'कार्तिक', start: '2026-10-17', days: 30 },
  { nameEn: 'Mangsir', nameNe: 'मंसिर', start: '2026-11-16', days: 29 },
  { nameEn: 'Poush', nameNe: 'पुस', start: '2026-12-15', days: 30 },
  { nameEn: 'Magh', nameNe: 'माघ', start: '2027-01-14', days: 29 },
  { nameEn: 'Falgun', nameNe: 'फागुन', start: '2027-02-12', days: 30 },
  { nameEn: 'Chaitra', nameNe: 'चैत', start: '2027-03-14', days: 30 },
]

function toNepaliNumerals(num: number): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']
  return String(num)
    .split('')
    .map((c) => nepaliDigits[Number(c)] ?? c)
    .join('')
}

function getBsDate(dateStr: string, timestamp?: number): { ne: string; en: string } | null {
  let ymd = dateStr
  if (timestamp) {
    try {
      const d = new Date(timestamp)
      ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kathmandu',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d)
    } catch {
      // fallback to dateStr
    }
  }

  const target = new Date(ymd + 'T00:00:00Z').getTime()
  if (isNaN(target)) return null

  for (const m of BS_MONTHS_2083) {
    const s = new Date(m.start + 'T00:00:00Z').getTime()
    const e = s + m.days * 86400000
    if (target >= s && target < e) {
      const day = Math.floor((target - s) / 86400000) + 1
      const dayStrNe = day < 10 ? '०' + toNepaliNumerals(day) : toNepaliNumerals(day)
      const dayStrEn = day < 10 ? '0' + day : String(day)
      return {
        ne: `२०८३ ${m.nameNe} ${dayStrNe}`,
        en: `${m.nameEn} ${dayStrEn}, 2083 BS`,
      }
    }
  }
  return null
}

function formatTrigger(trigger: string | undefined, language: 'en' | 'ne'): string {
  if (trigger === 'manual' || trigger === 'manual_github' || trigger === 'manual_cron') {
    return language === 'ne' ? 'म्यानुअल क्रोन सिङ्क' : 'Manual Cron Trigger'
  }
  return language === 'ne' ? 'तालिकाबद्ध दैनिक सिङ्क' : 'Automated Daily Cron'
}

function formatSyncDate(dateStr: string, timestamp: number, language: 'en' | 'ne'): string {
  const d = new Date(timestamp || dateStr)
  if (language === 'ne') {
    return d.toLocaleDateString('ne-NP', {
      timeZone: 'Asia/Kathmandu',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

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
  const [activeTab, setActiveTab] = useState<'byDate' | 'byOffice'>('byDate')
  const [search, setSearch] = useState('')
  const [selectedProvince, setSelectedProvince] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'records' | 'recent' | 'code' | 'name'>('records')
  const [onlyWithAdditions, setOnlyWithAdditions] = useState(false)

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
  const totalRecords = meta?.totalRecords || Object.values(officeCounts).reduce((a, b) => a + b, 0) || 1185710

  const syncHistory: SyncHistoryEntry[] = useMemo(() => {
    if (meta?.syncHistory && meta.syncHistory.length > 0) {
      return meta.syncHistory
    }
    return []
  }, [meta?.syncHistory])

  const provinces = useMemo(() => {
    const set = new Set<string>()
    for (const o of offices) {
      set.add(language === 'ne' ? o.provinceNe : o.provinceEn)
    }
    return Array.from(set).sort()
  }, [offices, language])

  // Filtered timeline by date
  const filteredHistory = useMemo(() => {
    let list = [...syncHistory]

    if (onlyWithAdditions) {
      list = list.filter((item) => item.saved > 0)
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter((item) => {
        // Match date string
        if (item.dateStr.toLowerCase().includes(q)) return true
        const formatted = formatSyncDate(item.dateStr, item.timestamp, language).toLowerCase()
        if (formatted.includes(q)) return true

        // Match office breakdown within this date
        const officesInDate = Object.keys(item.officeBreakdown || {})
        for (const rawName of officesInDate) {
          if (rawName.toLowerCase().includes(q)) return true
          const matched = getTransportOfficeByOfficeName(rawName)
          if (matched) {
            if (
              matched.code.includes(q) ||
              matched.nameEn.toLowerCase().includes(q) ||
              matched.nameNe.includes(q) ||
              matched.locationEn.toLowerCase().includes(q) ||
              matched.locationNe.includes(q) ||
              matched.provinceEn.toLowerCase().includes(q) ||
              matched.provinceNe.includes(q)
            ) {
              return true
            }
          }
        }
        return false
      })
    }

    return list
  }, [syncHistory, onlyWithAdditions, search, language])

  // Cumulative all offices breakdown
  const filteredOffices = useMemo(() => {
    let list = [...offices]

    if (selectedProvince !== 'all') {
      list = list.filter((o) => {
        const prov = language === 'ne' ? o.provinceNe : o.provinceEn
        return prov === selectedProvince
      })
    }

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

    list.sort((a, b) => {
      if (sortBy === 'records') {
        const countA = officeCounts[a.code] || 0
        const countB = officeCounts[b.code] || 0
        return countB - countA || Number(a.code) - Number(b.code)
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
  }, [offices, selectedProvince, search, sortBy, officeCounts, language])

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
                {language === 'ne' ? 'लाइसेन्स छपाइ अपडेट तथा सिङ्क लग' : 'Print Updates & Sync History by Date'}
              </span>
            </div>
          </Link>

          {/* Right: Language Switcher Only */}
          <div className="flex items-center">
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
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 sm:py-10">
        {/* Breadcrumb Navigation below navbar */}
        <nav aria-label="Breadcrumbs" className="mb-6 flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[var(--text-secondary)] transition hover:text-[var(--nepal-blue)]"
          >
            <span>🏠</span>
            <span>{language === 'ne' ? 'गृहपृष्ठ' : 'Home'}</span>
          </Link>
          <span className="text-[var(--text-muted)]/60 font-bold select-none" aria-hidden>⇒</span>
          <span className="font-bold text-[var(--nepal-blue)]">
            {language === 'ne' ? 'अपडेट लग' : 'Updates'}
          </span>
        </nav>
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
            {language === 'ne' ? 'यातायात व्यवस्था विभाग · छपाइ अद्यावधिक अभिलेख' : 'DOTM NEPAL · PRINT UPDATES LOG'}
          </div>

          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
            {language === 'ne' ? 'मिति अनुसार लाइसेन्स छपाइ अपडेट' : 'License Print Updates by Date'}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {language === 'ne'
              ? 'यातायात व्यवस्था विभाग (DOTM) बाट कुन मितिमा कुन-कुन यातायात कार्यालयको कति संख्यामा स्मार्ट कार्ड सवारी चालक अनुमतिपत्र थपिए सोको यथार्थ विवरण।'
              : 'Chronological timeline of printed driving license additions from DOTM, documenting which transport offices received cards on each specific date.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-all duration-200 hover:bg-[var(--nepal-blue-dark)] hover:brightness-110 hover:shadow-sm active:scale-98"
            >
              <span>🔍</span>
              <span>{language === 'ne' ? 'लाइसेन्स स्थिति जाँच्नुहोस्' : 'Check License Status'}</span>
              <span>→</span>
            </Link>

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
              <span>{language === 'ne' ? '३५ वटै कार्यालयहरूको आधिकारिक विवरण समावेश' : 'Indexed across all 35 transport offices in Nepal'}</span>
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

        {/* View Switcher Tabs (By Date vs All Offices Directory) */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('byDate')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition shadow-2xs ${
                activeTab === 'byDate'
                  ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                  : 'border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>📅</span>
              <span>{language === 'ne' ? 'मिति अनुसार अपडेट लग' : 'Updates by Date'}</span>
              <span className={`ml-1 rounded-full px-2 py-0.2 text-[10px] font-bold ${
                activeTab === 'byDate' ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              }`}>
                {filteredHistory.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('byOffice')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold transition shadow-2xs ${
                activeTab === 'byOffice'
                  ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                  : 'border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>🏢</span>
              <span>{language === 'ne' ? 'सबै कार्यालयहरूको कुल विवरण' : 'All Offices Directory'}</span>
              <span className={`ml-1 rounded-full px-2 py-0.2 text-[10px] font-bold ${
                activeTab === 'byOffice' ? 'bg-white/20 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
              }`}>
                {offices.length}
              </span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[220px] sm:w-72">
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
              placeholder={
                activeTab === 'byDate'
                  ? (language === 'ne' ? 'कार्यालय वा मिति खोज्नुहोस्...' : 'Search office or date...')
                  : (language === 'ne' ? 'कार्यालय खोज्नुहोस्...' : 'Search transport office...')
              }
              className="h-9 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] pl-8 pr-7 text-xs outline-none transition focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/20 shadow-2xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: UPDATES BY DATE (TIMELINE) */}
        {activeTab === 'byDate' && (
          <div className="space-y-6">
            {/* Filter Pill to toggle 0-addition runs */}
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-[var(--text-secondary)] font-medium">
                {language === 'ne'
                  ? `सिङ्क मितिहरूको संख्या: ${filteredHistory.length}`
                  : `Showing ${filteredHistory.length} sync date event(s)`}
              </span>
              <button
                type="button"
                onClick={() => setOnlyWithAdditions((prev) => !prev)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                  onlyWithAdditions
                    ? 'bg-[var(--success)] text-white'
                    : 'border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {onlyWithAdditions
                  ? (language === 'ne' ? 'सबै सिङ्क देखाउनुहोस्' : 'Showing Dates With Additions Only')
                  : (language === 'ne' ? 'नयाँ लाइसेन्स थपिएका मिति मात्र' : 'Filter Dates With Additions Only')}
              </button>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-12 text-center text-xs text-[var(--text-muted)] sm:text-sm">
                {language === 'ne'
                  ? 'तपाईंको खोजी अनुसार कुनै सिङ्क रेकर्ड फेला परेन।'
                  : 'No sync history records match your search criteria.'}
              </div>
            ) : (
              filteredHistory.map((entry) => {
                const bsDateObj = getBsDate(entry.dateStr, entry.timestamp)
                const bsDate = bsDateObj ? bsDateObj.ne : ''
                const bsDateEn = bsDateObj ? bsDateObj.en : ''
                const formattedDate = formatSyncDate(entry.dateStr, entry.timestamp, language)

                // Process offices breakdown for this date
                const breakdown = entry.officeBreakdown || {}

                interface ResolvedOfficeItem {
                  office: TransportOffice | null
                  count: number
                  rawName: string
                }

                const officesList: ResolvedOfficeItem[] = []
                for (const [rawName, cnt] of Object.entries(breakdown)) {
                  const num = Number(cnt) || 0
                  if (num <= 0) continue
                  const matched = getTransportOfficeByOfficeName(rawName)
                  officesList.push({
                    office: matched,
                    count: num,
                    rawName,
                  })
                }

                // Sort by count descending
                officesList.sort((a, b) => b.count - a.count)

                return (
                  <div
                    key={entry.id || entry.dateStr}
                    className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm transition hover:shadow-md"
                  >
                    {/* Date Item Header */}
                    <div className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3.5">
                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--surface-primary)] border border-[var(--border-default)] text-lg font-bold shadow-2xs">
                          📅
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)]">
                              {formattedDate}
                            </h2>
                            {bsDate && (
                              <span className="rounded-md bg-[var(--surface-primary)] px-2 py-0.5 text-[11px] font-bold text-[var(--text-muted)] border border-[var(--border-default)]">
                                {language === 'ne' ? bsDate : bsDateEn}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <span>
                              {language === 'ne'
                                ? `सिङ्क समय: ${formatNepalDateTime(entry.timestamp, 'ne')}`
                                : `Synced at: ${formatNepalDateTime(entry.timestamp, 'en')} (NPT)`}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">
                              {formatTrigger(entry.trigger, language)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pill Badge on Top Right */}
                      <div className="flex items-center gap-2">
                        {entry.saved > 0 ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--success)]/10 px-3.5 py-1.5 text-xs font-black text-[var(--success)] border border-[var(--success)]/30 animate-glow-pulse shadow-2xs">
                            <span>✨</span>
                            <span>
                              +{entry.saved.toLocaleString(dateLocale)} {language === 'ne' ? 'नयाँ लाइसेन्स थपियो' : 'new licenses added'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] border border-[var(--border-default)] shadow-2xs">
                            <span className="text-[var(--success)] font-black">✓</span>
                            <span>{language === 'ne' ? 'अद्यावधिक (० नयाँ)' : 'Up to date (0 added)'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date Item Body */}
                    {entry.saved === 0 ? (
                      /* CASE 1: No licenses added */
                      <div className="p-6 sm:p-8 text-center bg-gradient-to-b from-[var(--surface-primary)] to-[var(--bg-secondary)]/20">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-xl shadow-2xs mb-3">
                          📋
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
                          {language === 'ne' ? 'यस मितिमा थप नयाँ लाइसेन्स थपिएका छैनन्' : 'No additional licenses added'}
                        </h3>
                        <p className="mx-auto mt-1.5 max-w-xl text-xs sm:text-xs text-[var(--text-secondary)] leading-relaxed">
                          {language === 'ne'
                            ? 'यातायात व्यवस्था विभागको आधिकारिक सर्भर परीक्षण गरियो। प्रकाशित सबै छपाइ सूचीहरू पहिले नै डाटाबेसमा सुरक्षित र अद्यावधिक छन्। यस पटक विभागद्वारा कुनै नयाँ छपाइ सूची सार्वजनिक गरिएको छैन।'
                            : 'The automated sync verified the Department of Transport Management (DOTM) portal. All published print notices are already indexed and up to date. No new print batches were released by DOTM in this run.'}
                        </p>
                      </div>
                    ) : (
                      /* CASE 2: Licenses added on this date (e.g. October 01, 2026, July 17, 2026) */
                      <div className="p-4 sm:p-6">
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-default)]/60 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs sm:text-sm text-[var(--text-primary)]">
                              {language === 'ne'
                                ? `यस मितिमा थपिएका कार्यालयहरू (${officesList.length}):`
                                : `Transport offices with new licenses on this date (${officesList.length}):`}
                            </span>
                            <span className="rounded-full bg-[var(--success)]/15 px-2 py-0.2 text-[10.5px] font-bold text-[var(--success)]">
                              +{entry.saved.toLocaleString(dateLocale)}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-[var(--text-muted)]">
                            {language === 'ne' ? 'लाइसेन्स संख्या अनुसार क्रमबद्ध' : 'Sorted by volume'}
                          </span>
                        </div>

                        {/* Office Breakdown Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {officesList.map(({ office, count, rawName }) => {
                            const share = entry.saved > 0 ? ((count / entry.saved) * 100).toFixed(1) : '0'

                            return (
                              <div
                                key={office ? office.code : rawName}
                                className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 transition hover:border-[var(--nepal-blue)] hover:shadow-2xs flex flex-col justify-between gap-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--nepal-blue-soft)] to-transparent font-mono text-xs font-black text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/25">
                                      {office ? office.code : '🏛️'}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h4 className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] truncate">
                                          {office
                                            ? (language === 'ne' ? office.nameNe : office.nameEn)
                                            : rawName}
                                        </h4>
                                        {office && (
                                          <span className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--text-muted)] border border-[var(--border-default)]">
                                            {language === 'ne' ? office.provinceNe : office.provinceEn}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate">
                                        📍 {office ? (language === 'ne' ? office.addressNe : office.addressEn) : 'नेपाल'}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right flex-shrink-0">
                                    <div className="font-mono text-sm sm:text-base font-black text-[var(--success)]">
                                      +{count.toLocaleString(dateLocale)}
                                    </div>
                                    <div className="text-[10px] font-mono text-[var(--text-muted)]">
                                      {language === 'ne' ? 'लाइसेन्स थपियो' : 'licenses'}
                                    </div>
                                  </div>
                                </div>

                                {/* Volume bar and contact */}
                                <div className="flex items-center justify-between gap-3 pt-1 border-t border-[var(--border-default)]/40 text-[10.5px]">
                                  <div className="flex items-center gap-2 flex-1 max-w-[180px]">
                                    <div className="h-1 flex-1 rounded-full bg-[var(--border-default)] overflow-hidden">
                                      <div
                                        className="h-full rounded-full bg-[var(--success)]"
                                        style={{ width: `${Math.min(100, Math.max(5, Number(share)))}%` }}
                                      />
                                    </div>
                                    <span className="font-mono text-[10px] font-bold text-[var(--text-muted)]">
                                      {share}%
                                    </span>
                                  </div>

                                  {office?.website && (
                                    <a
                                      href={office.website.startsWith('http') ? office.website : `https://${office.website}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-semibold text-[var(--nepal-blue)] hover:underline inline-flex items-center gap-0.5 truncate"
                                    >
                                      <span>🌐 {office.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                                      <span>↗</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* TAB 2: ALL OFFICES DIRECTORY (CUMULATIVE TOTALS) */}
        {activeTab === 'byOffice' && (
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm overflow-hidden">
            {/* Controls Bar */}
            <div className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4 sm:p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)]">
                      {language === 'ne' ? 'यातायात कार्यालयगत कुल छपाइ तथ्याङ्क' : 'Cumulative Office-by-Office Totals'}
                    </h2>
                    <span className="rounded-full bg-[var(--nepal-blue-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20">
                      {filteredOffices.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {language === 'ne'
                      ? 'सबै ३५ वटा यातायात कार्यालयहरूको नाम, प्रदेश, कुल छापिएको लाइसेन्स संख्या र राष्ट्रिय प्रतिशत'
                      : 'Verified transport offices with all-time total indexed licenses and national volume share'}
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2.5">
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
                    <option value="code">{language === 'ne' ? 'कार्यालय कोड' : 'Office Code'}</option>
                    <option value="name">{language === 'ne' ? 'नाम अनुसार (A-Z)' : 'Name (A-Z)'}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Office Rows */}
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
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>
        )}

        {/* Bottom Closing CTA Card */}
        <div className="mt-12 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--surface-primary)] via-[var(--surface-primary)] to-[var(--nepal-blue-soft)]/25 p-6 sm:p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue)] text-white text-xl shadow-xs mb-3">
            🔍
          </div>
          <h3 className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)]">
            {language === 'ne'
              ? 'के तपाईंको स्मार्ट कार्ड लाइसेन्स छापियो?'
              : 'Looking for your printed smart card license?'}
          </h3>
          <p className="mx-auto mt-1.5 max-w-lg text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {language === 'ne'
              ? 'आफ्नो सवारी चालक अनुमतिपत्र नम्बर हाल्नुहोस् र १.१८ मिलियनभन्दा बढी आधिकारिक अभिलेखबाट छपाइ स्थिति तत्काल हेर्नुहोस्।'
              : 'Enter your driving license number to search across 1.18M+ indexed DOTM print records in milliseconds.'}
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-6 py-3 text-xs sm:text-sm font-extrabold text-white shadow-md transition-all duration-200 hover:bg-[var(--nepal-blue-dark)] hover:brightness-110 hover:shadow-xl active:scale-98"
            >
              <span>{language === 'ne' ? 'लाइसेन्स स्थिति खोजी गर्नुहोस्' : 'Search License Print Status'}</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
