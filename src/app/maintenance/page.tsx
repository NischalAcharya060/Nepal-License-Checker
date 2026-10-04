import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import MaintenanceStatus from '@/components/MaintenanceStatus'

export const metadata: Metadata = {
  title: 'Under Maintenance · Nepal License Checker',
  description:
    'Nepal License Checker is temporarily under maintenance while we reconnect to the DOTM printed licence records database.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  alternates: {
    canonical: '/maintenance',
  },
}

export const dynamic = 'force-static'

export default function MaintenancePage() {
  return (
    <main className="relative flex h-dvh max-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-3 sm:px-6">
      {/* Ambient Lighting Gradients */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-full max-w-lg rounded-full bg-gradient-to-br from-[var(--nepal-blue)]/10 via-[var(--nepal-red)]/5 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative flex w-full max-w-lg flex-col justify-center animate-rise-in">
        {/* Brand Header */}
        <div className="mb-2.5 flex flex-col items-center text-center sm:mb-3">
          <div className="relative mb-2 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-1.5 shadow-xs">
            <Image
              src="/License-Checker-Nepal-logo.png"
              alt="Nepal License Checker"
              width={34}
              height={34}
              priority
              className="object-contain"
            />
          </div>

          {/* Flag Ribbon Accent */}
          <div className="mb-1.5 flex items-center justify-center gap-1" aria-hidden>
            <div className="h-1 w-6 rounded-l-full bg-[var(--nepal-red)]" />
            <div className="h-1.5 w-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)]" />
            <div className="h-1 w-6 rounded-r-full bg-[var(--nepal-blue)]" />
          </div>

          <p className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
            Nepal License Checker
          </p>
        </div>

        {/* Main Glassmorphic Card */}
        <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)]/90 p-4 shadow-xl shadow-black/[0.04] backdrop-blur-md sm:p-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--warning-text)] shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--warning-text)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--warning-text)]" />
              </span>
              <span>Scheduled Maintenance &bull; मर्मतसम्भार</span>
            </span>
          </div>

          {/* Headings */}
          <div className="mt-2.5 text-center">
            <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)] sm:text-2xl">
              We&rsquo;ll Be Right Back
            </h1>
            <p lang="ne" className="text-sm font-bold text-[var(--nepal-blue)] sm:text-base">
              हामी छिट्टै फेरि सेवामा आउँदैछौं
            </p>
          </div>

          {/* Compact Context Copy */}
          <p className="mt-2.5 text-center text-xs leading-relaxed text-[var(--text-secondary)]">
            We are synchronizing with the Department of Transport Management (DOTM) database to index latest printed licence records. Lookups will resume shortly.
          </p>

          {/* Emergency Alternative Check */}
          <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/70 px-3.5 py-2.5 text-xs shadow-xs">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white shadow-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </span>
            <div className="min-w-0 flex-1 text-[11px] leading-relaxed text-[var(--text-primary)]">
              <span className="font-bold">Need status now?</span>
              <span> Visit </span>
              <a
                href="https://dotm.gov.np/category/details-of-printed-licenses/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-extrabold text-[var(--nepal-blue)] underline underline-offset-2 hover:opacity-80"
              >
                dotm.gov.np
              </a>
              <span> or SMS </span>
              <code className="inline-block rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-[var(--nepal-blue)] shadow-2xs">
                LC &lt;LicenseNo&gt;
              </code>
              <span> to </span>
              <strong className="font-extrabold text-[var(--text-primary)]">33001</strong>.
            </div>
          </div>

          {/* Dynamic 2-Minute Polling Component */}
          <div className="mt-3.5 border-t border-[var(--border-default)]/60 pt-3">
            <MaintenanceStatus />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-[var(--text-secondary)]">
          <p>
            Official source: <span className="font-bold text-[var(--text-primary)]">dotm.gov.np</span>
          </p>

          <Link
            href="/maintenance/login"
            className="inline-flex items-center gap-1 font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] hover:underline"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Admin Sign In</span>
          </Link>
        </footer>
      </div>
    </main>
  )
}
