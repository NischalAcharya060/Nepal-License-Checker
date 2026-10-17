// src/components/developer/DeveloperSidebar.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { DeveloperProfile, DeveloperApiKey } from '@/lib/developerAuth'

interface DeveloperSidebarProps {
  profile: DeveloperProfile
  keys: DeveloperApiKey[]
  activeSection: string
  onSectionClick: (sectionId: string) => void
  onLogout: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

const NAV_ITEMS = [
  {
    id: 'section-overview',
    label: 'Overview',
    description: 'Metrics & health',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    id: 'section-analytics',
    label: 'Telemetry & Graphs',
    description: 'Traffic, rate & latency',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'section-keys',
    label: 'API Keys',
    description: 'Secret credentials',
    badge: (keysCount: number) => `${keysCount}/3`,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1-1-1.5 1.5L7 8l-5 5a4 4 0 0 0 6 6l5-5-1.5-1.5L13 11l1.5 1.5 3.5-3.5" />
      </svg>
    ),
  },
  {
    id: 'section-quickstart',
    label: 'Code Integration',
    description: 'SDK, cURL & Fetch',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: 'section-console',
    label: 'Live Sandbox',
    description: 'Test /api/license',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0" />
        <path d="M5.52 16h12.96" />
      </svg>
    ),
  },
  {
    id: 'section-specs',
    label: 'HTTP Specs',
    description: 'RFC rate headers',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
]

export default function DeveloperSidebar({
  profile,
  keys,
  activeSection,
  onSectionClick,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: DeveloperSidebarProps) {
  const content = (
    <div className="flex h-full flex-col justify-between p-4 sm:p-5 select-none">
      {/* Top Branding */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-transform hover:scale-101 group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--nepal-blue)] to-[var(--nepal-blue-dark)] text-white shadow-sm font-bold text-sm">
              🇳🇵
            </div>
            <div>
              <span className="font-extrabold text-xs tracking-tight text-[var(--text-primary)] block">
                Nepal License
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--nepal-blue)] flex items-center gap-1">
                <span>⚡ Dev Portal</span>
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Live Tier Badge */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-3 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-[var(--text-primary)]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Elevated Tier</span>
            </span>
            <span className="font-mono text-[10px] font-bold text-[var(--nepal-blue)]">
              60 req/min
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--border-default)] overflow-hidden">
            <div className="h-full w-full rounded-full bg-[var(--nepal-blue)]" />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
            <span>4x Public Quota</span>
            <span>Zero Lockout</span>
          </div>
        </div>

        {/* Main Navigation Links */}
        <nav className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-2 block">
            Navigation
          </span>
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSectionClick(item.id)
                  onCloseMobile()
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[var(--nepal-blue)] text-white font-bold shadow-sm shadow-[var(--nepal-blue)]/20 translate-x-0.5'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`transition-colors shrink-0 ${
                      isActive ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-[var(--nepal-blue)]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <div className="truncate">
                    <span className="block truncate">{item.label}</span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-default)]'
                    }`}
                  >
                    {item.badge(keys.length)}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* External Documentation Link */}
        <div className="pt-2">
          <Link
            href="/developer/docs"
            className="flex w-full items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition shadow-2xs group"
          >
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] group-hover:text-[var(--nepal-blue)] transition">📖</span>
              <span>SDK Documentation</span>
            </div>
            <span className="text-[10.5px] text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform">↗</span>
          </Link>
        </div>
      </div>

      {/* Sidebar Footer: Developer Account & Sign Out */}
      <div className="space-y-3 pt-4 border-t border-[var(--border-default)]">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2.5 shadow-2xs">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.username}
              width={38}
              height={38}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shrink-0"
              unoptimized
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white font-bold text-xs shrink-0">
              {profile.username[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="font-bold text-xs text-[var(--text-primary)] truncate block leading-tight">
              {profile.name || profile.username}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate block font-mono">
              @{profile.username}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            className="flex-1 text-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shadow-2xs"
          >
            ← Home
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-2.5 py-1.5 text-[11px] font-bold text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition cursor-pointer"
            title="Sign out of developer portal"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex fixed top-0 bottom-0 left-0 w-64 z-30 flex-col border-r border-[var(--border-default)] bg-[var(--surface-primary)]/90 backdrop-blur-md overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Drawer Body */}
          <div className="relative w-72 max-w-[85vw] h-full bg-[var(--surface-primary)] border-r border-[var(--border-default)] shadow-2xl z-10 animate-slide-right overflow-y-auto">
            {content}
          </div>
        </div>
      )}
    </>
  )
}
