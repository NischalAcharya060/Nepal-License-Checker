import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import MaintenanceLoginForm from '@/components/MaintenanceLoginForm'

export const metadata: Metadata = {
  title: 'Admin Sign In · Nepal License Checker',
  description: 'Restricted maintenance access for authorized administrators.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export const dynamic = 'force-static'

export default function MaintenanceLoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-4 py-8 overflow-hidden">
      {/* Refined Ambient Background Gradient Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[var(--nepal-blue)]/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-red-500/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-rise-in">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm">
            <Image
              src="/License-Checker-Nepal-logo.png"
              alt="Nepal License Checker"
              width={48}
              height={48}
              priority
              className="h-12 w-12 object-contain"
            />
          </div>

          {/* Security Badge */}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--nepal-blue)]/15 bg-[var(--nepal-blue)]/[0.06] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--nepal-blue)]">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Secure Admin Access</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Administrator Access
          </h1>

          <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
            Site is under maintenance. Authenticate to reach the live workspace.
          </p>
        </div>

        {/* Login Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)]/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-90" />

          <MaintenanceLoginForm />

          <div className="mt-5 border-t border-[var(--border-default)]/60 pt-4 text-center">
            <Link
              href="/maintenance"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--nepal-blue)]"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Back to Maintenance Notice</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
