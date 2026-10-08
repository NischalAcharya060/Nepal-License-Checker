import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getSiteUrl } from '@/lib/siteUrl'

const siteUrl = getSiteUrl()
const videoUrl = `${siteUrl}/tutorial.mp4`
const pageUrl = `${siteUrl}/tutorial`
const thumbnailUrl = `${siteUrl}/tutorial-poster.jpg`

export const metadata: Metadata = {
  title:
    'Video Tutorial: How to Check Nepal Licence Print Status | सवारी चालक अनुमतिपत्र छापिएको कि छैन हेर्ने भिडियो',
  description:
    'Watch a 19-second tutorial on how to check your Nepal smart card driving licence print status online (सवारी चालक अनुमति पत्र चेक) using the DOTM printed list on Nepal License Checker.',
  alternates: {
    canonical: '/tutorial',
    languages: {
      'en': '/tutorial',
      'en-NP': '/tutorial',
      'ne': '/tutorial?lang=ne',
      'ne-NP': '/tutorial?lang=ne',
      'x-default': '/tutorial',
    },
  },
  openGraph: {
    title: 'Video Tutorial: How to Check Nepal Licence Print Status',
    description:
      'Watch a 19-second tutorial on how to check your smart card driving licence print status online with Nepal License Checker.',
    url: '/tutorial',
    siteName: 'Nepal License Checker',
    type: 'video.other',
    videos: [
      {
        url: videoUrl,
        width: 1280,
        height: 720,
        type: 'video/mp4',
      },
    ],
    images: [
      {
        url: '/tutorial-poster.jpg',
        width: 1280,
        height: 720,
        alt: 'Nepal License Checker video tutorial',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Video Tutorial: How to Check Nepal Licence Print Status',
    description:
      'Watch a 19-second tutorial on how to check your smart card driving licence print status online.',
    images: ['/tutorial-poster.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
}

export const dynamic = 'force-static'

const videoObject = {
  '@context': 'https://schema.org',
  '@type': 'VideoObject',
  '@id': `${pageUrl}#video`,
  name: 'How to Check if Your Nepal Driving Licence is Printed (Video Tutorial)',
  description:
    'A 19-second step-by-step tutorial showing how to check the smart card driving licence print status online using the official DOTM printed list on Nepal License Checker: enter your licence number, press Check Status, and read the result.',
  thumbnailUrl: [thumbnailUrl],
  contentUrl: videoUrl,
  embedUrl: pageUrl,
  uploadDate: '2026-10-01T00:00:00+05:45',
  duration: 'PT19S',
  inLanguage: ['en-NP', 'ne-NP'],
  width: 1280,
  height: 720,
  embeddable: true,
  expirationDate: '2036-10-01T00:00:00+05:45',
  isAccessibleForFree: true,
  publisher: {
    '@type': 'Organization',
    name: 'Nepal License Checker',
    url: siteUrl,
  },
}

const steps = [
  {
    title: 'Have your licence number ready',
    titleNe: 'अनुमतिपत्र नम्बर तयार राख्नुहोस्',
    body: 'Your old licence or exam receipt shows a number in the format XX-XX-XXXXXXXX — office code, district code, then your personal number.',
    bodyNe: 'पुरानो लाइसेन्स वा परीक्षा रसिदमा XX-XX-XXXXXXXX ढाँचाको नम्बर हुन्छ।',
  },
  {
    title: 'Enter the number in the search box',
    titleNe: 'खोज बक्समा नम्बर हाल्नुहोस्',
    body: 'Hyphens are inserted automatically — just type the digits. Nepali and English numerals both work.',
    bodyNe: 'हाइफन स्वतः थपिन्छ। नेपाली वा अंग्रेजी दुवै अंक समर्थित छन्।',
  },
  {
    title: 'Press “Check Status”',
    titleNe: '“स्थिति जाँच्नुहोस्” थिच्नुहोस्',
    body: 'We match your number against the latest list published by DOTM and return the result in a few seconds.',
    bodyNe: 'DOTM को पछिल्लो सार्वजनिक सूचीसँग तुलना गरी केही सेकेन्डमै नतिजा देखाइन्छ।',
  },
  {
    title: 'Read the result',
    titleNe: 'नतिजा बुझ्नुहोस्',
    body: '“Card is Printed & Ready” means your smart card has been printed. “Not Printed Yet” means check back in a few days.',
    bodyNe: '“तयार छ” भने कार्ड छापिइसकेको छ। “तयार छैन” भए केही दिनपछि पुनः जाँच गर्नुहोस्।',
  },
]

export default function TutorialPage() {
  return (
    <main className="relative min-h-[90vh] overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoObject) }}
      />

      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-80 w-full max-w-2xl -translate-x-1/2 rounded-full bg-gradient-to-br from-[var(--nepal-blue)]/10 via-[var(--nepal-red)]/5 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-3xl animate-rise-in">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Link href="/" className="font-semibold transition hover:text-[var(--nepal-blue)]">
            Home
          </Link>
          <span aria-hidden>/</span>
          <span className="font-bold text-[var(--text-primary)]">Video Tutorial</span>
        </nav>

        {/* Header */}
        <header className="mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--nepal-blue)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--nepal-blue)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
            19-second tutorial
          </span>
          <h1 className="mt-2 text-xl font-black tracking-tight text-[var(--text-primary)] sm:text-2xl">
            How to Check if Your Nepal Driving Licence is Printed
          </h1>
          <p lang="ne" className="mt-1 text-sm font-bold text-[var(--nepal-blue)]">
            सवारी चालक अनुमतिपत्र छापिएको कि छैन कसरी जाँच्ने?
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Watch the full flow — from entering your licence number to reading the result — then try
            it yourself on the home page.
          </p>
        </header>

        {/* Watch page: the video IS the main content of this page */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm">
          <video
            className="aspect-video w-full bg-black"
            controls
            preload="metadata"
            playsInline
            poster="/tutorial-poster.jpg"
          >
            <source src="/tutorial.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          <div className="border-t border-[var(--border-default)] px-4 py-3 sm:px-5">
            <p className="text-xs leading-5 text-[var(--text-muted)]">
              How to check your smart card licence print status · DOTM Nepal
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href="/"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 py-3 text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[var(--nepal-blue-mid)] hover:shadow-lg active:translate-y-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Check My Licence Status Now
          </Link>
          <Link
            href="/#how-to-check"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)]"
          >
            Read the Written Steps
          </Link>
        </div>

        {/* Steps recap */}
        <section
          aria-labelledby="steps-heading"
          className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm"
        >
          <div className="border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-blue-soft)] to-transparent px-5 py-3.5 sm:px-6">
            <h2 id="steps-heading" className="text-base font-extrabold text-[var(--text-primary)] sm:text-lg">
              Steps shown in the video
            </h2>
            <p lang="ne" className="text-xs font-semibold text-[var(--text-secondary)]">
              भिडियोमा देखाइएका चरणहरू
            </p>
          </div>
          <ol className="divide-y divide-[var(--border-default)]/70">
            {steps.map((s, idx) => (
              <li key={idx} className="flex gap-4 px-5 py-3.5 sm:px-6">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)] text-sm font-bold text-white shadow-sm">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    {s.title}
                    <span lang="ne" className="ml-2 font-semibold text-[var(--nepal-blue)]">
                      {s.titleNe}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-6 text-[var(--text-secondary)]">{s.body}</p>
                  <p lang="ne" className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
                    {s.bodyNe}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Footer note */}
        <div className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-[11px] leading-5 text-[var(--text-muted)]">
          <Image
            src="/nepal-flag-waving-realistic.svg"
            alt=""
            aria-hidden
            width={16}
            height={11}
            className="mr-1.5 inline-block align-middle"
          />
          This site is an independent verification tool. Data is mirrored from{' '}
          <a
            href="https://dotm.gov.np/category/details-of-printed-licenses/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[var(--nepal-blue)] underline underline-offset-2 hover:opacity-80"
          >
            dotm.gov.np
          </a>{' '}
          and updated regularly.
        </div>
      </div>
    </main>
  )
}
