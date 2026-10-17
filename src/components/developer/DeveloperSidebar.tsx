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
  collapsed?: boolean
  onToggleCollapse?: () => void
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
  collapsed = false,
  onToggleCollapse,
}: DeveloperSidebarProps) {
  const renderSidebarContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed

    return (
      <div className={`flex h-full flex-col justify-between select-none ${isCollapsed ? 'p-3' : 'p-4 sm:p-5'}`}>
        {/* Top Branding */}
        <div className="space-y-5">
          <div className={`flex items-center pb-4 border-b border-[var(--border-default)] ${isCollapsed ? 'flex-col gap-2.5' : 'justify-between'}`}>
            <Link
              href="/"
              className={`flex items-center gap-2.5 transition-transform hover:scale-102 group min-w-0 ${isCollapsed ? 'justify-center' : ''}`}
              title="Nepal License Checker - Home"
            >
              <Image
                src="/License-Checker-Nepal-logo.png"
                alt="Nepal License Checker Logo"
                width={36}
                height={36}
                className="h-9 w-9 rounded-xl object-contain shadow-xs shrink-0"
                priority
              />
              {!isCollapsed && (
                <div className="min-w-0 truncate">
                  <span className="font-extrabold text-xs tracking-tight text-[var(--text-primary)] block truncate">
                    Nepal License
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--nepal-blue)] flex items-center gap-1">
                    <span>⚡ Dev Portal</span>
                  </span>
                </div>
              )}
            </Link>

            {/* Close button on mobile */}
            {isMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] cursor-pointer"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            )}

            {/* Collapse/Expand Toggle on Desktop */}
            {!isMobile && onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition shadow-2xs cursor-pointer shrink-0"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  {isCollapsed ? (
                    <>
                      <polyline points="13 17 18 12 13 7" />
                      <polyline points="6 17 11 12 6 7" />
                    </>
                  ) : (
                    <>
                      <polyline points="11 17 6 12 11 7" />
                      <polyline points="18 17 13 12 18 7" />
                    </>
                  )}
                </svg>
              </button>
            )}
          </div>

          {/* Live Tier Badge */}
          {isCollapsed ? (
            <div
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2 text-center shadow-2xs cursor-help"
              title="Elevated Tier: 60 req/min (Zero Lockout)"
            >
              <div className="flex flex-col items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400">60/m</span>
              </div>
            </div>
          ) : (
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
          )}

          {/* Main Navigation Links */}
          <nav className="space-y-1">
            {!isCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-3 mb-2 block">
                Navigation
              </span>
            )}
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSectionClick(item.id)
                    if (isMobile) onCloseMobile()
                  }}
                  title={isCollapsed ? `${item.label} - ${item.description}` : undefined}
                  className={`group relative flex items-center rounded-xl transition-all duration-150 cursor-pointer ${
                    isCollapsed
                      ? 'h-10 w-10 mx-auto justify-center'
                      : 'w-full justify-between px-3 py-2 text-left text-xs'
                  } ${
                    isActive
                      ? 'bg-[var(--nepal-blue)] text-white font-bold shadow-sm shadow-[var(--nepal-blue)]/20'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] font-medium'
                  }`}
                >
                  <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                    <span
                      className={`transition-colors shrink-0 ${
                        isActive ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-[var(--nepal-blue)]'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <span className="truncate block">{item.label}</span>
                    )}
                  </div>

                  {item.badge && (
                    isCollapsed ? (
                      keys.length > 0 && (
                        <span
                          className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-mono font-bold ${
                            isActive ? 'bg-white text-[var(--nepal-blue)]' : 'bg-[var(--nepal-blue)] text-white'
                          }`}
                        >
                          {keys.length}
                        </span>
                      )
                    ) : (
                      <span
                        className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-default)]'
                        }`}
                      >
                        {item.badge(keys.length)}
                      </span>
                    )
                  )}
                </button>
              )
            })}
          </nav>

          {/* External Documentation Link */}
          <div className="pt-1">
            <Link
              href="/developer/docs"
              title={isCollapsed ? 'SDK Documentation' : undefined}
              className={`flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition shadow-2xs group ${
                isCollapsed
                  ? 'h-10 w-10 mx-auto justify-center'
                  : 'w-full justify-between px-3 py-2'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-muted)] group-hover:text-[var(--nepal-blue)] transition">📖</span>
                {!isCollapsed && <span>SDK Documentation</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10.5px] text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform">↗</span>
              )}
            </Link>
          </div>
        </div>

        {/* Sidebar Footer: Developer Account & Sign Out */}
        <div className={`space-y-3 pt-4 border-t border-[var(--border-default)] ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2.5">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={34}
                  height={34}
                  title={`Signed in as @${profile.username}`}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shrink-0 cursor-pointer"
                  unoptimized
                />
              ) : (
                <div
                  title={`Signed in as @${profile.username}`}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  {profile.username[0]?.toUpperCase()}
                </div>
              )}
              <Link
                href="/"
                title="Return to Public Search"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shadow-2xs"
              >
                🏠
              </Link>
              <button
                type="button"
                onClick={onLogout}
                title="Sign out of developer portal"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition cursor-pointer"
              >
                ⏻
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop Persistent Left Sidebar (collapsible width) */}
      <aside
        className={`hidden md:flex fixed top-0 bottom-0 left-0 z-30 flex-col border-r border-[var(--border-default)] bg-[var(--surface-primary)]/95 backdrop-blur-md overflow-y-auto transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer (always full width) */}
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
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  )
}
