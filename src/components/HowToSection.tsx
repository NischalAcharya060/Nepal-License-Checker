'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Language } from '@/lib/i18n'

interface HowToSectionProps {
  language: Language
  lastUpdatedAt: string | null
}

export default function HowToSection({ language, lastUpdatedAt }: HowToSectionProps) {
  const steps =
    language === 'ne'
      ? [
          {
            title: 'अनुमतिपत्र नम्बर तयार राख्नुहोस्',
            body: 'तपाईंको पुरानो लाइसेन्स वा परीक्षा रसिदमा XX-XX-XXXXXXXX ढाँचाको नम्बर हुन्छ — पहिलो २ अंक कार्यालय कोड, दोस्रो २ अंक जिल्ला कोड, र अन्तिम ८ अंक तपाईंको व्यक्तिगत नम्बर हो।',
            hint: 'उदाहरण: ०१-०१-१२३४५६७८',
          },
          {
            title: 'माथिको खोज बक्समा नम्बर हाल्नुहोस्',
            body: 'हाइफन (-) स्वतः थपिन्छ। केवल अंक टाइप गर्नुहोस्। नेपाली वा अंग्रेजी दुवै अंक समर्थित छन्।',
            hint: null,
          },
          {
            title: '"स्थिति जाँच्नुहोस्" थिच्नुहोस्',
            body: 'हामी DOTM को पछिल्लो सार्वजनिक सूचीसँग तपाईंको नम्बर तुलना गर्छौं र केही सेकेन्डमै नतिजा देखाउँछौं।',
            hint: null,
          },
          {
            title: 'नतिजा बुझ्नुहोस्',
            body: '“तयार छ” देखियो भने तपाईंको कार्ड छापिइसकेको छ। “तयार छैन” आएमा सूची अझै अद्यावधिक नभएको हुन सक्छ — केही दिनपछि पुनः जाँच गर्नुहोस्।',
            hint: null,
          },
          {
            title: 'कार्यालय गएर बुझिलिनुहोस्',
            body: 'नागरिकता प्रमाणपत्र, पुरानो सवारी चालक अनुमतिपत्र, र भुक्तानी रसिद लिएर आफ्नो यातायात कार्यालयमा जानुहोस्।',
            hint: null,
          },
        ]
      : [
          {
            title: 'Have your license number ready',
            body: 'Your old license or exam receipt shows a number in the format XX-XX-XXXXXXXX — the first two digits are the office code, the next two are the district code, and the last eight are your personal number.',
            hint: 'Example: 01-01-12345678',
          },
          {
            title: 'Enter the number in the search box above',
            body: 'Hyphens are inserted automatically — just type the digits. Both English and Nepali keyboard numerals are recognized.',
            hint: null,
          },
          {
            title: 'Press “Check Status”',
            body: 'We match your number against the latest list published by DOTM and return the result in a few seconds.',
            hint: null,
          },
          {
            title: 'Read the result',
            body: '“Card is Printed & Ready” means your smart card has been printed. “Not Printed Yet” usually means the latest list hasn’t included it yet — check back in a few days.',
            hint: null,
          },
          {
            title: 'Collect it from your transport office',
            body: 'Bring your Citizenship card, old driving license, and payment receipt to the transport office where you applied.',
            hint: null,
          },
        ]

  return (
    <section
      id="how-to-check"
      className="mt-8 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm"
      aria-labelledby="how-to-heading"
    >
      <div className="border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-blue-soft)] to-transparent px-5 py-4 sm:px-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--nepal-blue)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--nepal-blue)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            {language === 'ne' ? 'चरण-दर-चरण' : 'Step-by-step'}
          </span>
          {lastUpdatedAt && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[9px] font-medium text-[var(--text-muted)]">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {language === 'ne'
                ? `अद्यावधिक: ${new Date(lastUpdatedAt).toLocaleDateString('ne-NP', { year: 'numeric', month: 'short', day: 'numeric' })}`
                : `Updated: ${new Date(lastUpdatedAt).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })}`}
            </span>
          )}
        </div>
        <h2 id="how-to-heading" className="text-lg font-extrabold text-[var(--text-primary)] sm:text-xl">
          {language === 'ne'
            ? 'सवारी चालक अनुमतिपत्र छापिएको कि छैन कसरी जाँच्ने?'
            : 'How to check if your Nepal driving license is printed'}
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm">
          {language === 'ne'
            ? 'यातायात व्यवस्था विभाग (DOTM, dotm.gov.np) को आधिकारिक छपाइ सूचीबाट सिधै जाँच गर्ने सजिलो तरिका।'
            : 'The quickest way to verify your smart card status directly from the official DOTM (dotm.gov.np) print list.'}
        </p>
      </div>

      {/* Video tutorial — thumbnail links to the /tutorial watch page */}
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        <Link
          href="/tutorial"
          className="group relative block aspect-video w-full overflow-hidden rounded-xl border border-[var(--border-default)] bg-black shadow-sm transition-shadow hover:shadow-md"
          aria-label={
            language === 'ne'
              ? 'भिडियो ट्युटोरियल हेर्नुहोस्'
              : 'Watch the video tutorial'
          }
        >
          <Image
            src="/tutorial-poster.jpg"
            alt={
              language === 'ne'
                ? 'सवारी चालक अनुमतिपत्र छापिएको कि छैन जाँच्ने भिडियो ट्युटोरियल'
                : 'Video tutorial: how to check if your Nepal driving licence is printed'
            }
            fill
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm transition-all duration-200 group-hover:scale-110 group-hover:bg-[var(--nepal-blue)]/85">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
          <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
            0:19
          </span>
          <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white">
            {language === 'ne' ? 'भिडियो ट्युटोरियल हेर्नुहोस्' : 'Watch video tutorial'}
          </span>
        </Link>
      </div>

      <ol className="divide-y divide-[var(--border-default)]/70">
        {steps.map((s, idx) => (
          <li key={idx} className="flex gap-4 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--nepal-blue)] text-sm font-bold text-white shadow-sm sm:h-9 sm:w-9">
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-[var(--text-primary)] sm:text-[15px]">{s.title}</div>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{s.body}</p>
              {s.hint && (
                <code className="mt-2 inline-block rounded-md border border-[var(--nepal-blue)]/25 bg-[var(--nepal-blue-soft)] px-2 py-0.5 font-mono text-[12px] text-[var(--nepal-blue)]">
                  {s.hint}
                </code>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="border-t border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-3 text-[11px] leading-5 text-[var(--text-muted)] sm:px-6">
        {language === 'ne'
          ? 'सूचना: यो साइट गैर-सरकारी स्वतन्त्र खोज उपकरण हो। तथ्याङ्क dotm.gov.np बाट नियमित लिइन्छ।'
          : 'Note: this site is an independent verification tool. Data is mirrored from dotm.gov.np and updated regularly.'}
      </div>
    </section>
  )
}
