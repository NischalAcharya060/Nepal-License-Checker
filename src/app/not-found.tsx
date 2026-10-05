import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '404 - Page Not Found · Nepal License Checker',
  description: 'The requested page could not be found. Check your smart card driving license print status on Nepal License Checker.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <main className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      {/* Ambient Lighting Gradients */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-full max-w-lg rounded-full bg-gradient-to-br from-[var(--nepal-blue)]/10 via-[var(--nepal-red)]/5 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative flex w-full max-w-lg flex-col justify-center animate-rise-in text-center">
        {/* Brand Logo & Ribbon */}
        <div className="mb-4 flex flex-col items-center">
          <div className="relative mb-2.5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)] p-2 shadow-xs transition-transform hover:scale-105">
            <Image
              src="/License-Checker-Nepal-logo.png"
              alt="Nepal License Checker"
              width={42}
              height={42}
              priority
              className="object-contain"
            />
          </div>

          {/* Flag Ribbon Accent */}
          <div className="mb-2 flex items-center justify-center gap-1.5" aria-hidden>
            <div className="h-1.5 w-8 rounded-l-full bg-[var(--nepal-red)]" />
            <div className="h-2 w-2 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)]" />
            <div className="h-1.5 w-8 rounded-r-full bg-[var(--nepal-blue)]" />
          </div>

          <p className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
            Nepal License Checker
          </p>
        </div>

        {/* Main 404 Glassmorphic Card */}
        <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)]/90 p-5 shadow-xl shadow-black/[0.04] backdrop-blur-md sm:p-8">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--warning-text)] shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning-text)]" />
              <span>404 · Error / त्रुटि</span>
            </span>
          </div>

          {/* Large 404 Heading */}
          <div className="mt-3">
            <h1 className="text-5xl font-black tracking-tight text-[var(--text-primary)] sm:text-6xl">
              4<span className="text-[var(--nepal-red)]">0</span>4
            </h1>
            <h2 className="mt-1 text-base font-bold text-[var(--text-primary)] sm:text-lg">
              Page Not Found &bull; पृष्ठ फेला परेन
            </h2>
          </div>

          {/* Bilingual Context Copy */}
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-secondary)] sm:text-sm">
            The page you are looking for doesn&rsquo;t exist, was removed, or the link may be broken.
          </p>
          <p lang="ne" className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
            तपाईंले खोज्नुभएको वेब पृष्ठ फेला परेन वा हटाइएको हुन सक्छ। कृपया मुख्य पृष्ठमा फर्किएर आफ्नो लाइसेन्स जाँच गर्नुहोस्।
          </p>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--nepal-blue-mid)] hover:shadow-lg active:translate-y-0"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span>Back to Home · मुख्य पृष्ठ</span>
            </Link>

            <Link
              href="/?view=offices"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)]"
            >
              <span>🏢</span>
              <span>Offices Directory</span>
            </Link>
          </div>

          {/* Helpful SMS Hint */}
          <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 text-center text-[11px] text-[var(--text-muted)]">
            <span>Need status right now via SMS? </span>
            <Link
              href="/?view=sms"
              className="font-semibold text-[var(--nepal-blue)] underline hover:opacity-90"
            >
              View SMS Guide
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
