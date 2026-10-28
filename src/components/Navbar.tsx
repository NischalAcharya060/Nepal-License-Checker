'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import InstallAppButton from '@/components/InstallAppButton'
import { SdkCodeIcon } from '@/components/SdkLogos'
import type { Language } from '@/lib/i18n'

export type ThemeMode = 'light' | 'dark'

interface NavbarProps {
  language: Language
  setLanguage: (lang: Language) => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  viewCount?: number | null
  dateLocale?: string
  lightLabel: string
  darkLabel: string
  onOpenOffices: () => void
  onOpenSms: () => void
  onOpenSample: () => void
  onOpenFeedback?: () => void
  onOpenNpm?: () => void
}

export default function Navbar({
  language,
  setLanguage,
  theme,
  setTheme,
  lightLabel,
  darkLabel,
  onOpenOffices,
  onOpenSms,
  onOpenSample,
  onOpenFeedback,
  onOpenNpm,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  type FontSize = 'normal' | 'lg' | 'xl'
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    if (typeof window === 'undefined') return 'normal'
    const saved = window.localStorage.getItem('ui-font-size')
    return saved === 'lg' || saved === 'xl' ? saved : 'normal'
  })

  const handleToggleFontSize = () => {
    const nextSize: FontSize = fontSize === 'normal' ? 'lg' : fontSize === 'lg' ? 'xl' : 'normal'
    setFontSize(nextSize)
    if (typeof window !== 'undefined') {
      if (nextSize === 'normal') {
        window.localStorage.removeItem('ui-font-size')
        document.documentElement.removeAttribute('data-font-size')
      } else {
        window.localStorage.setItem('ui-font-size', nextSize)
        document.documentElement.setAttribute('data-font-size', nextSize)
      }
    }
  }


  const handleBrandClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
      return
    }
    e.preventDefault()
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/' && !window.location.search) {
        window.location.reload()
      } else {
        window.location.href = '/'
      }
    }
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-[var(--border-default)]/70 bg-[var(--surface-primary)]/80 backdrop-blur-xl shadow-xs print:hidden">
      <div className="mx-auto flex w-full max-w-7xl lg:max-w-[1440px] items-center justify-between gap-2 sm:gap-3 px-3 py-2 sm:px-6 lg:px-8 sm:py-2.5">
        {/* Logo & Portal Branding */}
        <Link
          href="/"
          onClick={handleBrandClick}
          className="flex items-center gap-2 sm:gap-3 shrink min-w-0 cursor-pointer group"
          title={language === 'ne' ? 'पृष्ठ पुनः ताजा गर्नुहोस्' : 'Refresh page'}
        >
          <Image
            src="/License-Checker-Nepal-logo.png"
            alt="Nepal License Checker Logo"
            width={56}
            height={56}
            className="h-8 w-8 min-[380px]:h-9 min-[380px]:w-9 sm:h-12 sm:w-12 rounded-xl shadow-xs object-contain transition-transform group-hover:scale-105 shrink-0"
            priority
          />
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-[13px] min-[390px]:text-sm sm:text-base font-extrabold tracking-tight text-[var(--text-primary)] leading-tight whitespace-nowrap truncate">
              {language === 'ne' ? (
                <>
                  <span className="hidden min-[340px]:inline">नेपाल </span>लाइसेन्स जाँच
                </>
              ) : (
                <>
                  <span className="hidden min-[360px]:inline">Nepal </span>License Checker
                </>
              )}
            </span>
          </div>
        </Link>

        {/* Quick Actions & Navigation */}
        <div className="flex items-center justify-end gap-1 min-[380px]:gap-1.5 sm:gap-2 shrink-0">
          {/* Offices Directory button (Desktop) */}
          <button
            type="button"
            onClick={onOpenOffices}
            className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)] active:scale-95 sm:inline-flex cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]" aria-hidden="true">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
            </svg>
            <span>{language === 'ne' ? 'कार्यालयहरू' : 'Offices'}</span>
          </button>

          {/* SMS Guide button (Desktop) */}
          <button
            type="button"
            onClick={onOpenSms}
            className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 sm:inline-flex cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
            <span>{language === 'ne' ? 'एसएमएस सेवा' : 'SMS Check'}</span>
          </button>

          {/* Feedback & Support button (Desktop) */}
          {onOpenFeedback && (
            <button
              type="button"
              onClick={onOpenFeedback}
              className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-sky-500 hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400 active:scale-95 sm:inline-flex cursor-pointer"
              title={language === 'ne' ? 'प्रतिक्रिया तथा सहायता' : 'Feedback & Support'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{language === 'ne' ? 'प्रतिक्रिया' : 'Feedback'}</span>
            </button>
          )}

          {/* Testimonials / Reviews shortcut (Desktop) */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('testimonials')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
            className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-amber-500 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 active:scale-95 md:inline-flex cursor-pointer"
            title={language === 'ne' ? 'नागरिक समीक्षा तथा अनुभवहरू' : 'Citizen Reviews & Testimonials'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500" aria-hidden="true">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{language === 'ne' ? 'समीक्षाहरू' : 'Reviews'}</span>
          </button>

          {/* Developer SDKs Button (Desktop) */}
          {onOpenNpm && (
            <button
              type="button"
              onClick={onOpenNpm}
              className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)]/10 hover:text-[var(--nepal-blue)] active:scale-95 sm:inline-flex cursor-pointer group shadow-2xs"
              title={language === 'ne' ? 'विकासकर्ता SDK तथा API' : 'Developer SDKs & API'}
            >
              <SdkCodeIcon className="h-3.5 w-3.5 text-[var(--nepal-blue)] transition-transform group-hover:scale-110" />
              <span>{language === 'ne' ? 'SDK प्याकेजहरू' : 'SDKs & API'}</span>
            </button>
          )}

          {/* Language Switcher - compact, touch-friendly on all mobile screens */}
          <div
            className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] p-0.5 sm:p-1 text-xs shrink-0"
            role="group"
            aria-label="Language switch"
          >
            <button
              type="button"
              id="lang-en"
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
              className={`h-7 min-w-[28px] sm:min-h-[32px] sm:min-w-[32px] rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold transition active:scale-95 ${
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
              className={`h-7 min-w-[28px] sm:min-h-[32px] sm:min-w-[32px] rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold transition active:scale-95 ${
                language === 'ne'
                  ? 'bg-[var(--nepal-red)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <span className="sm:hidden">ने</span>
              <span className="hidden sm:inline">नेपाली</span>
            </button>
          </div>

          {/* Text Size / Accessibility Scaler (Aa) - visible on wider screens; on narrow devices it is featured in the drawer */}
          <button
            type="button"
            onClick={handleToggleFontSize}
            className={`hidden min-[480px]:inline-flex sm:inline-flex min-h-[34px] sm:min-h-[36px] items-center justify-center rounded-full border px-2 sm:px-2.5 text-xs font-bold transition active:scale-95 cursor-pointer shrink-0 ${
              fontSize !== 'normal'
                ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs'
                : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)]'
            }`}
            title={
              language === 'ne'
                ? `अक्षरको आकार परिवर्तन गर्नुहोस् (${fontSize === 'normal' ? 'सामान्य' : fontSize === 'lg' ? 'ठूलो' : 'धेरै ठूलो'})`
                : `Toggle Text Size (${fontSize === 'normal' ? 'Normal' : fontSize === 'lg' ? 'Large' : 'Extra Large'})`
            }
            aria-label="Text Size Toggle"
          >
            <span className="font-serif font-black tracking-tighter text-sm">A</span>
            <span className="text-[11px] font-sans font-bold">
              {fontSize === 'normal' ? 'a' : fontSize === 'lg' ? '+' : '++'}
            </span>
          </button>

          {/* 1-Click Theme Toggle Button (Comfortable Hit Area) */}
          <button
            type="button"
            aria-label={theme === 'dark' ? lightLabel : darkLabel}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex h-7.5 w-7.5 min-[380px]:h-8 min-[380px]:w-8 sm:min-h-[36px] sm:min-w-[36px] items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 shrink-0"
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
            className="hidden min-h-[36px] min-w-[36px] items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 sm:inline-flex"
            title="GitHub Repository & Contribute"
            aria-label="GitHub Repository"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>

          {/* Mobile Menu Hamburger Button (<sm) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-8 w-8 min-[380px]:h-8.5 min-[380px]:w-8.5 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 sm:hidden cursor-pointer shrink-0"
          >
            {isMobileMenuOpen ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="border-t border-[var(--border-default)]/70 bg-[var(--surface-primary)]/95 backdrop-blur-xl px-3.5 py-3 sm:hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-60px)] overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2">
            {/* Quick Settings & Mode Switcher in Mobile Drawer */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-2">
              {/* Theme Toggle in Drawer */}
              <button
                type="button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-2 text-left transition hover:border-[var(--nepal-blue)] active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
                    {theme === 'dark' ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 dark:text-slate-300">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79z" />
                      </svg>
                    )}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                      {theme === 'dark' ? (language === 'ne' ? 'डार्क मोड' : 'Dark Mode') : (language === 'ne' ? 'लाइट मोड' : 'Light Mode')}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)]">
                      {language === 'ne' ? 'बदल्नुहोस्' : 'Tap to switch'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Language Toggle in Drawer */}
              <div className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex-1 rounded-lg py-1.5 text-center text-[11px] font-bold transition cursor-pointer ${
                    language === 'en'
                      ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ne')}
                  className={`flex-1 rounded-lg py-1.5 text-center text-[11px] font-bold transition cursor-pointer ${
                    language === 'ne'
                      ? 'bg-[var(--nepal-red)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  नेपाली
                </button>
              </div>
            </div>

            {/* Install App */}
            <InstallAppButton language={language} variant="tile" />

            {/* Offices */}
            <button
              type="button"
              onClick={() => {
                onOpenOffices()
                setIsMobileMenuOpen(false)
              }}
              className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-left transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
                  </svg>
                </span>
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
                onOpenSms()
                setIsMobileMenuOpen(false)
              }}
              className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-left transition hover:border-emerald-500 hover:bg-emerald-500/10 active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </span>
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
                onOpenSample()
                setIsMobileMenuOpen(false)
              }}
              className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-left transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
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

            {/* Feedback & Support (Mobile) */}
            {onOpenFeedback && (
              <button
                type="button"
                onClick={() => {
                  onOpenFeedback()
                  setIsMobileMenuOpen(false)
                }}
                className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-left transition hover:border-sky-500 hover:bg-sky-500/10 active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {language === 'ne' ? 'प्रतिक्रिया तथा सहायता' : 'Feedback & Support'}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {language === 'ne' ? 'समस्या रिपोर्ट गर्नुहोस् वा सुझाव दिनुहोस्' : 'Ask questions or report an issue'}
                    </span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* Testimonials / Reviews (Mobile) */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false)
                const el = document.getElementById('testimonials')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-left transition hover:border-amber-500 hover:bg-amber-500/10 active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {language === 'ne' ? 'नागरिक समीक्षा (Testimonials)' : 'Reviews & Testimonials'}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {language === 'ne' ? 'अन्य चालकहरूको अनुभव र मूल्याङ्कन हेर्नुहोस्' : 'See what drivers across Nepal are saying'}
                  </span>
                </div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Multi-Language SDKs (Mobile) */}
            {onOpenNpm && (
              <button
                type="button"
                onClick={() => {
                  onOpenNpm()
                  setIsMobileMenuOpen(false)
                }}
                className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-left transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)]/10 active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-[var(--nepal-blue)]" aria-hidden="true">
                    <SdkCodeIcon className="h-4 w-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {language === 'ne' ? 'विकासकर्ता SDK तथा API' : 'Developer SDKs & API'}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {language === 'ne' ? 'TypeScript, Python वा PHP बाट जोड्नुहोस्' : 'Install via npm, pip, or composer'}
                    </span>
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

                        {/* Font Size Accessibility Controls (Mobile) */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]">
                    <polyline points="4 7 4 4 20 4 20 7" />
                    <line x1="9" y1="20" x2="15" y2="20" />
                    <line x1="12" y1="4" x2="12" y2="20" />
                  </svg>
                  <span>{language === 'ne' ? 'अक्षरको आकार (Accessibility)' : 'Text Size & Readability'}</span>
                </span>
                <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                  {fontSize === 'normal' ? '100%' : fontSize === 'lg' ? '112%' : '125%'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setFontSize('normal')
                    window.localStorage.removeItem('ui-font-size')
                    document.documentElement.removeAttribute('data-font-size')
                  }}
                  className={`rounded-lg py-1.5 text-center text-[11px] font-semibold transition ${
                    fontSize === 'normal'
                      ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                      : 'border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {language === 'ne' ? 'सामान्य' : 'Normal'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFontSize('lg')
                    window.localStorage.setItem('ui-font-size', 'lg')
                    document.documentElement.setAttribute('data-font-size', 'lg')
                  }}
                  className={`rounded-lg py-1.5 text-center text-[11px] font-semibold transition ${
                    fontSize === 'lg'
                      ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                      : 'border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {language === 'ne' ? 'ठूलो' : 'Large'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFontSize('xl')
                    window.localStorage.setItem('ui-font-size', 'xl')
                    document.documentElement.setAttribute('data-font-size', 'xl')
                  }}
                  className={`rounded-lg py-1.5 text-center text-[11px] font-semibold transition ${
                    fontSize === 'xl'
                      ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                      : 'border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {language === 'ne' ? 'धेरै ठूलो' : 'X-Large'}
                </button>
              </div>
            </div>

            {/* GitHub Link in mobile menu */}
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
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
