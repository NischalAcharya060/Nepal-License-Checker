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
    <main className="relative flex h-dvh max-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-3 sm:px-6">
      {/* Ambient Lighting Gradients */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-full max-w-md rounded-full bg-gradient-to-br from-[var(--nepal-blue)]/10 via-[var(--nepal-red)]/5 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative flex w-full max-w-md flex-col justify-center animate-rise-in">
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

        {/* Main Card */}
        <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)]/90 p-4 shadow-xl shadow-black/[0.04] backdrop-blur-md sm:p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--nepal-blue)]/10 to-[var(--nepal-blue)]/20 text-[var(--nepal-blue)] shadow-inner">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h1 className="mt-2 text-lg font-black tracking-tight text-[var(--text-primary)] sm:text-xl">
              Administrator Access
            </h1>
            <p className="text-[11px] leading-relaxed text-[var(--text-secondary)] sm:text-xs">
              Site is under maintenance. Authenticate to reach the live workspace.
            </p>
          </div>

          <div className="mt-3.5 border-t border-[var(--border-default)]/60 pt-3.5">
            <MaintenanceLoginForm />
          </div>
        </div>

        {/* Back Link */}
        <p className="mt-2.5 text-center text-xs">
          <Link
            href="/maintenance"
            className="group inline-flex items-center gap-1 font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
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
              className="transition-transform duration-200 group-hover:-translate-x-1"
              aria-hidden
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to maintenance notice</span>
          </Link>
        </p>
      </div>
    </main>
  )
}
