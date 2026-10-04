import type { Metadata } from 'next'
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6">
      <div className="animate-rise-in w-full max-w-lg">
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-sm sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--warning-text)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--nepal-red)] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--nepal-red)]" />
            </span>
            Scheduled Maintenance
          </span>

          <h1 className="mt-4 text-2xl font-extrabold leading-tight text-[var(--text-primary)] sm:text-[28px]">
            We&rsquo;ll be right back
            <span lang="ne" className="mt-1 block text-xl font-bold text-[var(--text-secondary)] sm:text-2xl">
              हामी छिट्टै फेरि सेवामा आउँदैछौं
            </span>
          </h1>

          <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            <p>
              We&rsquo;re reconnecting our service to the Department of Transport Management
              printed licence records database. Lookups are briefly paused while we restore the
              connection.
            </p>
            <p lang="ne">
              हामी आफ्नो सेवालाई यातायात व्यवस्था विभागको लाइसेन्स छापिएको सूची अभिलेखसँग पुनः जोड्दैछौं।
              जडान मर्मतका कारण खोजी अस्थायी रूपमा रोकिएको छ।
            </p>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] px-4 py-3.5">
            <p className="text-sm font-semibold text-[var(--info-text)]">
              Need your licence status right now?
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--info-text)]/90">
              The official printed lists are still live on{' '}
              <a
                href="https://dotm.gov.np/category/details-of-printed-licenses/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                dotm.gov.np
              </a>{' '}
              &mdash; or send <code className="font-mono text-[13px]">LC &lt;Number&gt;</code> to 33001
              from your phone.
            </p>
          </div>

          <div className="mt-6">
            <MaintenanceStatus />
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-[var(--text-muted)]">
          Data mirrored from{' '}
          <a
            href="https://dotm.gov.np"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--nepal-blue)]"
          >
            dotm.gov.np
          </a>{' '}
          &middot;{' '}
          <span lang="ne">यातायात व्यवस्था विभाग</span>
          <span className="mt-1 block">
            <Link href="/maintenance" className="hover:underline">
              Maintenance notice
            </Link>
          </span>
        </p>
      </div>
    </main>
  )
}
