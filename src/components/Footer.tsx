'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Language } from '@/lib/i18n'
import { VEHICLE_CATEGORIES } from '@/lib/categories'

interface FooterProps {
  language: Language
  dateLocale: string
  developerCreditLabel: string
  onOpenOffices: () => void
  onOpenSms: () => void
  onOpenSample: () => void
  lastUpdatedAt?: string | null
  indexedRecords?: number | null
  onReset?: () => void
}

export default function Footer({
  language,
  dateLocale,
  developerCreditLabel,
  onOpenOffices,
  onOpenSms,
  onOpenSample,
  lastUpdatedAt,
  indexedRecords,
  onReset,
}: FooterProps) {
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false)
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false)

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDocsModalOpen(false)
        setIsCategoriesModalOpen(false)
      }
    }
    if (isDocsModalOpen || isCategoriesModalOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDocsModalOpen, isCategoriesModalOpen])

  const scrollToSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => {
      const input = document.getElementById('license-number')
      if (input) {
        input.focus()
      }
    }, 350)
  }

  const handleScrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else if (onReset) {
      onReset()
      setTimeout(() => {
        const target = document.getElementById(sectionId)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' })
        }
      }, 150)
    }
  }

  const isNe = language === 'ne'
  const currentYear = 2026

  return (
    <footer className="w-full border-t border-[var(--border-default)]/80 bg-[var(--bg-primary)]/60 backdrop-blur-xs pt-10 pb-12 print:hidden text-xs text-[var(--text-secondary)]">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Top Landscape Header: Brand Info + Operational Status + Action Buttons (Flat, No Boxes) */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between pb-8 border-b border-[var(--border-default)]/70">
          {/* Left: Brand Identity & Live Status */}
          <div className="flex items-start sm:items-center gap-3.5">
            <Image
              src="/License-Checker-Nepal-logo.png"
              alt="Nepal License Checker Logo"
              width={48}
              height={48}
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl shadow-xs object-contain shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight">
                  {isNe ? 'नेपाल लाइसेन्स जाँच' : 'Nepal License Checker'}
                </h3>
                <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] shadow-2xs">
                  <span>{isNe ? 'DOTM लाइभ सिङ्क' : 'DOTM Live Sync'}</span>
                </span>
                <span className="rounded-full bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--nepal-blue)]">
                  MIT Open Source
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)] max-w-xl leading-relaxed">
                {isNe
                  ? 'यातायात व्यवस्था विभाग (DOTM) को सार्वजनिक छपाइ सूची खोज्न बनाइएको खुला तथा स्वतन्त्र नागरिक सेवा।'
                  : 'Independent civic platform mirroring Department of Transport Management (DOTM) smart card print records.'}
              </p>
              {lastUpdatedAt && (
                <div className="mt-1 text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <span>{isNe ? 'पछिल्लो ब्याच अद्यावधिक:' : 'Last batch synced:'}</span>
                  <span className="font-medium text-[var(--text-secondary)]">
                    {new Date(lastUpdatedAt).toLocaleDateString(dateLocale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Flat Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            <button
              type="button"
              onClick={scrollToSearch}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue-soft)] border border-[var(--nepal-blue)]/30 px-3 py-1.5 text-xs font-semibold text-[var(--nepal-blue)] transition hover:bg-[var(--nepal-blue)] hover:text-white active:scale-95 cursor-pointer shadow-2xs"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span>{isNe ? 'लाइसेन्स जाँच्नुहोस्' : 'Check a License'}</span>
            </button>

            <a
              href="https://github.com/NischalAcharya060/Nepal-License-Checker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 shadow-2xs"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>{isNe ? 'गिटहब रिपो' : 'Star on GitHub'}</span>
            </a>

            <a
              href="https://github.com/NischalAcharya060/Nepal-License-Checker/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-red)] hover:text-[var(--nepal-red)] active:scale-95 shadow-2xs"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-red)]">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{isNe ? 'समस्या रिपोर्ट' : 'Report Bug'}</span>
            </a>
          </div>
        </div>

        {/* Flat Landscape Directory: 4 Wide Columns (No Boxes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-8 border-b border-[var(--border-default)]/70">
          {/* Column 1: Services & Tools */}
          <div className="space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--nepal-blue)]" />
              <span>{isNe ? 'सेवा तथा उपकरणहरू' : 'Services & Tools'}</span>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={onOpenOffices}
                  className="group flex items-center gap-2 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0 transition-transform group-hover:scale-110">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
                  </svg>
                  <span>{isNe ? 'यातायात कार्यालयहरूको सूची' : 'Transport Offices Directory'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenSms}
                  className="group flex items-center gap-2 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0 transition-transform group-hover:scale-110">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                  <span>{isNe ? 'एसएमएस सेवा गाइड (३३००१)' : 'SMS Inquiry Guide (33001)'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenSample}
                  className="group flex items-center gap-2 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0 transition-transform group-hover:scale-110">
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <circle cx="9" cy="10" r="2" />
                    <path d="M15 8h2M15 12h2M7 16h10" />
                  </svg>
                  <span>{isNe ? 'लाइसेन्स नम्बर ढाँचा गाइड' : 'License Number Format Sample'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsDocsModalOpen(true)}
                  className="group flex items-center gap-2 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0 transition-transform group-hover:scale-110">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>{isNe ? 'लाइसेन्स लिन चाहिने कागजात' : 'Required Documents Checklist'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsCategoriesModalOpen(true)}
                  className="group flex items-center gap-2 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0 transition-transform group-hover:scale-110">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <path d="M12 12 19.07 4.93M12 12 4.93 4.93" />
                  </svg>
                  <span>{isNe ? 'सवारी साधनका वर्गहरू (A, B, C...)' : 'Vehicle Categories Breakdown'}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Government & Official Links */}
          <div className="space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--nepal-red)]" />
              <span>{isNe ? 'सरकारी तथा आधिकारिक पोर्टलहरू' : 'Official Portals'}</span>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://dotm.gov.np"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition font-medium"
                >
                  <span className="truncate">{isNe ? 'यातायात व्यवस्था विभाग (DOTM)' : 'DOTM Official Portal'}</span>
                  <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--nepal-blue)] transition">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://dotm.gov.np/category/details-of-printed-licenses/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition font-medium"
                >
                  <span className="truncate">{isNe ? 'छपाइ भएका लाइसेन्सको सूची' : 'Printed License Notices (PDF)'}</span>
                  <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--nepal-blue)] transition">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://nagarikapp.gov.np"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition font-medium"
                >
                  <span className="truncate">{isNe ? 'नागरिक एप (डिजिटल लाइसेन्स)' : 'Nagarik App (Digital License)'}</span>
                  <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--nepal-blue)] transition">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://traffic.nepalpolice.gov.np"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition font-medium"
                >
                  <span className="truncate">{isNe ? 'ट्राफिक प्रहरी महाशाखा (E-Challan)' : 'Traffic Police Nepal'}</span>
                  <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--nepal-blue)] transition">↗</span>
                </a>
              </li>
              <li>
                <a
                  href="https://mopit.gov.np"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition font-medium"
                >
                  <span className="truncate">{isNe ? 'भौतिक पूर्वाधार तथा यातायात मन्त्रालय' : 'Ministry of Transport (MOPIT)'}</span>
                  <span className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--nepal-blue)] transition">↗</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Help & Verification Guide */}
          <div className="space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--nepal-blue)]" />
              <span>{isNe ? 'सहयोग र निर्देशिका' : 'Help & Information'}</span>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollToSection('how-to-check')}
                  className="group flex items-center gap-2 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0 transition-transform group-hover:scale-110">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>{isNe ? 'चरणबद्ध जाँच विधि (भिडियो)' : 'How-to Check Video Guide'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollToSection('faq')}
                  className="group flex items-center gap-2 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0 transition-transform group-hover:scale-110">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <span>{isNe ? 'प्रायः सोधिने प्रश्नहरू (FAQs)' : 'Frequently Asked Questions'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={scrollToSearch}
                  className="group flex items-center gap-2 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0 transition-transform group-hover:scale-110">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span>{isNe ? 'नयाँ नम्बर जाँच्नुहोस्' : 'Check Another Number'}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleScrollToSection('faq')}
                  className="group flex items-center gap-2 text-left font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer w-full"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0 transition-transform group-hover:scale-110">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{isNe ? 'छपाइ हुन किन समय लाग्छ?' : 'Why is Printing Delayed?'}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Civic Tech & Privacy */}
          <div className="space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              <span>{isNe ? 'पारदर्शिता र सुरक्षा' : 'Trust & Transparency'}</span>
            </div>
            <div className="space-y-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              <div className="flex items-start gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)] mt-0.5 shrink-0">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>
                  {isNe
                    ? '१००% व्यक्तिगत गोपनीयता: कुनै पनि खोज इतिहास वा व्यक्तिगत विवरण भण्डारण हुँदैन।'
                    : '100% Privacy Focused: Queries are checked against public indices; no personal data is stored.'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
                <span>
                  {isNe
                    ? 'निःशुल्क नागरिक सेवा: विज्ञापनरहित र दर्ता बिना सिधै प्रयोग गर्न सकिने।'
                    : 'Zero Ads & Always Free: Built purely as a community civic service.'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-red)] mt-0.5 shrink-0">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>
                  {isNe
                    ? 'नेपाली नागरिकहरूको समय र झन्झट बचाउने उद्देश्यले निर्माण गरिएको।'
                    : 'Developed for simplicity, reliability, and speed across devices.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Flat Civic Notice & Legal Disclaimer (No Box) */}
        <div className="py-5 border-b border-[var(--border-default)]/60 text-[11px] leading-relaxed text-[var(--text-secondary)] flex items-start gap-2.5">
          <div className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-[var(--nepal-red)]/10 text-[var(--nepal-red)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-[var(--text-primary)]">
              {isNe ? 'सार्वजनिक सूचना तथा गैर-सरकारी घोषणा (Civic Disclaimer): ' : 'Official Notice & Non-Affiliation Disclaimer: '}
            </span>
            <span>
              {isNe
                ? 'यो वेबसाइट नेपाल सरकार, भौतिक पूर्वाधार तथा यातायात मन्त्रालय वा यातायात व्यवस्था विभाग (DOTM) को आधिकारिक वेबसाइट होइन। यो नागरिकहरूको सहजताका लागि विभागद्वारा सार्वजनिक रूपमा प्रकाशित छपाइ सूचीहरू (dotm.gov.np) लाई डिजिटल रूपमा खोजी गर्न बनाइएको एक स्वतन्त्र खुला-स्रोत नागरिक सेवा हो। कुनै पनि कानूनी वा आधिकारिक प्रमाणीकरणका लागि सम्बन्धित यातायात व्यवस्था कार्यालयमै सम्पर्क राख्नुहोस्।'
                : 'Nepal License Checker is an independent community project created to help citizens search publicly released print lists from the Department of Transport Management (DOTM), Government of Nepal. It is not affiliated with, authorized by, or endorsed by any government entity. For official inquiries or collection, please visit your local transport office.'}
            </span>
          </div>
        </div>

        {/* Bottom Landscape Attribution & Status Bar (Flat) */}
        <div className="pt-5 flex flex-col items-center justify-between gap-4 sm:flex-row text-[11px] text-[var(--text-muted)] text-center sm:text-left">
          {/* Left: Copyright & Developer Link */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1">
            <span className="font-semibold text-[var(--text-primary)]">
              © {currentYear} Nepal License Checker
            </span>
            <span>·</span>
            <span className="font-mono text-[10px] rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 border border-[var(--border-default)]">
              v2.0.0
            </span>
            <span>·</span>
            <span>{developerCreditLabel}</span>
            <a
              href="https://acharyanischal.com.np/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--nepal-blue)] hover:underline inline-flex items-center gap-0.5"
            >
              <span>Nischal Acharya</span>
            </a>
          </div>

          {/* Right: Live Stats Badges */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            {typeof indexedRecords === 'number' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 font-medium text-[var(--text-secondary)] shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                <span>
                  {indexedRecords.toLocaleString(dateLocale)} {isNe ? 'अभिलेख अनुक्रमणिकामा' : 'Records Indexed'}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Required Documents Modal */}
      {isDocsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setIsDocsModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isNe ? 'लाइसेन्स लिन चाहिने कागजात' : 'Required Documents Checklist'}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-[var(--surface-primary)] shadow-2xl animate-rise-in border border-[var(--border-default)] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4 bg-[var(--bg-secondary)]/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white shadow-xs">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    {isNe ? 'लाइसेन्स लिन लैजानुपर्ने कागजातहरू' : 'Documents Required for Collection'}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {isNe ? 'यातायात कार्यालय जानुअघि यी सक्कल कागजातहरू साथमा राख्नुहोस्' : 'Ensure you carry these original documents to the transport office'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDocsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)]/50 transition cursor-pointer border border-[var(--border-default)]"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content List */}
            <div className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)] text-white font-bold text-xs">
                  1
                </span>
                <div>
                  <div className="font-bold text-[var(--text-primary)] text-sm mb-0.5">
                    {isNe ? 'सक्कल नेपाली नागरिकता प्रमाणपत्र' : 'Original Nepali Citizenship Card'}
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {isNe
                      ? 'तपाईंको पहिचान प्रमाणित गर्न सक्कल नागरिकता अनिवार्य चाहिन्छ। प्रतिलिपि वा फोटोकपी मात्र भएमा कार्ड दिइँदैन।'
                      : 'Physical citizenship card is strictly required to verify identity at the distribution counter. Photocopies are not accepted.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)] text-white font-bold text-xs">
                  2
                </span>
                <div>
                  <div className="font-bold text-[var(--text-primary)] text-sm mb-0.5">
                    {isNe ? 'राजस्व दस्तुर तिरेको सक्कल रसिद' : 'Original Revenue / Bank Voucher'}
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {isNe
                      ? 'लाइसेन्स परीक्षा उत्तीर्ण गर्दा वा नवीकरण गर्दा यातायात कार्यालय वा बैंकमा राजस्व बुझाएको सक्कल रसिद।'
                      : 'The physical payment receipt or bank voucher issued when paying license examination/renewal fees.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)] text-white font-bold text-xs">
                  3
                </span>
                <div>
                  <div className="font-bold text-[var(--text-primary)] text-sm mb-0.5">
                    {isNe ? 'पुरानो सवारी चालक अनुमतिपत्र (आवश्यक भएमा)' : 'Previous Driving License (If Applicable)'}
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {isNe
                      ? 'यदि तपाईंले पुरानो लाइसेन्स नवीकरण (Renewal) वा नयाँ वर्ग थप (Add Category) गर्नुभएको हो भने पुरानो कार्ड कार्यालयमा फिर्ता बुझाउनुपर्छ।'
                      : 'Required if you applied for license renewal or category addition; the old license card must be surrendered.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)] text-white font-bold text-xs">
                  4
                </span>
                <div>
                  <div className="font-bold text-[var(--text-primary)] text-sm mb-0.5">
                    {isNe ? 'बायोमेट्रिक टोकन वा आवेदन स्लिप' : 'Biometrics Slip / Application Token'}
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    {isNe
                      ? 'बायोमेट्रिक दिँदा कार्यालयले प्रदान गरेको स्लिप। यसले कर्मचारीहरूलाई तपाईंको कार्ड भएको बाकस तुरुन्तै फेला पार्न मद्दत गर्छ।'
                      : 'Token slip provided during biometrics. Helps transport staff quickly locate your printed card packet.'}
                  </p>
                </div>
              </div>

              {/* Office hours tip */}
              <div className="rounded-xl bg-[var(--nepal-blue-soft)] border border-[var(--nepal-blue)]/20 p-3 text-[11px] leading-relaxed text-[var(--nepal-blue)]">
                <span className="font-bold">💡 {isNe ? 'कार्यालय समय सुझाव: ' : 'Helpful Visiting Tips: '}</span>
                <span>
                  {isNe
                    ? 'यातायात कार्यालयहरू आइतबारदेखि बिहीबार बिहान १० देखि ५ बजेसम्म र शुक्रबार बिहान १० देखि ३ बजेसम्म खुल्छन्। कार्ड संकलनका लागि स्वयं सेवाग्राही उपस्थित हुनुपर्छ।'
                    : 'Transport offices operate Sunday to Thursday 10:00 AM - 5:00 PM, and Friday 10:00 AM - 3:00 PM. The applicant must appear in person.'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border-default)] p-4 bg-[var(--bg-secondary)]/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDocsModalOpen(false)}
                className="rounded-xl bg-[var(--text-primary)] px-4 py-2 font-semibold text-[var(--surface-primary)] transition hover:opacity-90 active:scale-95 cursor-pointer text-xs"
              >
                {isNe ? 'बुझेँ (बन्द गर्नुहोस्)' : 'Got it (Close)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Categories Breakdown Modal */}
      {isCategoriesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setIsCategoriesModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={isNe ? 'सवारी साधनका वर्गहरू' : 'Vehicle Categories Breakdown'}
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-[var(--surface-primary)] shadow-2xl animate-rise-in border border-[var(--border-default)] max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-default)] px-6 py-4 bg-[var(--bg-secondary)]/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white shadow-xs">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="2" x2="12" y2="22" />
                    <path d="M12 12 19.07 4.93M12 12 4.93 4.93" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">
                    {isNe ? 'नेपाल सवारी चालक अनुमतिपत्र वर्गहरू' : 'Nepal Driving License Categories'}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {isNe ? 'यातायात व्यवस्था विभाग अनुसार सवारी साधनका आधिकारिक वर्गहरू' : 'Official vehicle classifications recognized by DOTM Nepal'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-default)]/50 transition cursor-pointer border border-[var(--border-default)]"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Grid of Categories */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.values(VEHICLE_CATEGORIES).map((cat) => (
                  <div
                    key={cat.code}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 hover:border-[var(--nepal-blue)]/40 transition"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--nepal-blue)] text-white font-mono font-extrabold text-xs shadow-2xs">
                        {cat.code}
                      </span>
                      <span className="font-bold text-xs text-[var(--text-primary)]">
                        {isNe ? cat.nameNe : cat.nameEn}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {isNe ? cat.vehiclesNe : cat.vehiclesEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--border-default)] p-4 bg-[var(--bg-secondary)]/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(false)}
                className="rounded-xl bg-[var(--text-primary)] px-4 py-2 font-semibold text-[var(--surface-primary)] transition hover:opacity-90 active:scale-95 cursor-pointer text-xs"
              >
                {isNe ? 'बन्द गर्नुहोस्' : 'Close Guide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
