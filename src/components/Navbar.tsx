'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Language } from '@/lib/i18n'

export type ThemeMode = 'light' | 'dark'

interface NavbarProps {
  language: Language
  setLanguage: (lang: Language) => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  viewCount: number | null
  dateLocale: string
  lightLabel: string
  darkLabel: string
  onOpenOffices: () => void
  onOpenSms: () => void
  onOpenSample: () => void
}

export default function Navbar({
  language,
  setLanguage,
  theme,
  setTheme,
  viewCount,
  dateLocale,
  lightLabel,
  darkLabel,
  onOpenOffices,
  onOpenSms,
  onOpenSample,
}: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
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
            onClick={onOpenOffices}
            className="hidden items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)] sm:inline-flex"
          >
            <span>🏢</span>
            <span>{language === 'ne' ? 'कार्यालयहरू' : 'Offices'}</span>
          </button>

          {/* SMS Guide button (Desktop) */}
          <button
            type="button"
            onClick={onOpenSms}
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
            aria-label={theme === 'dark' ? lightLabel : darkLabel}
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
                onOpenOffices()
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
                onOpenSms()
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
                onOpenSample()
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
  )
}
