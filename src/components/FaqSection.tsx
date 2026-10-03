'use client'

import type { Language } from '@/lib/i18n'

interface FaqSectionProps {
  language: Language
  lastUpdatedAt: string | null
}

export default function FaqSection({ language, lastUpdatedAt }: FaqSectionProps) {
  const faqs =
    language === 'ne'
      ? [
          {
            q: 'DOTM को स्मार्ट लाइसेन्स छापिएको सूची (Smart Licence Printed List) अनलाइन कसरी चेक गर्ने?',
            a: 'आफ्नो सवारी चालक अनुमतिपत्र नम्बर XX-XX-XXXXXXXX ढाँचामा माथिको खोज बाकसमा राखेर "स्थिति जाँच्नुहोस्" मा क्लिक गर्नुहोस्। हाम्रो प्रणालीले १० लाख+ आधिकारिक रेकर्डहरूबाट तपाईंको कार्ड छापिएको छ वा छैन तुरुन्तै देखाउँछ।',
          },
          {
            q: 'के नागरिकता नम्बर वा नामबाट लाइसेन्स छापिएको कि छैन चेक गर्न सकिन्छ?',
            a: 'हाल यातायात व्यवस्था विभाग (DOTM) ले सार्वजनिक गर्ने स्मार्ट लाइसेन्स छापिएको सूचीमा केवल अनुमतिपत्र नम्बर (XX-XX-XXXXXXXX) बाट मात्र खोजी गर्न सकिन्छ। व्यक्तिगत गोपनीयताका कारण नागरिकता नम्बर वा नामबाट मात्र अनलाइन छपाइ सूची हेर्ने व्यवस्था छैन। तपाईंको परीक्षा उत्तीर्ण रसिद वा राजस्व रसिदमा लाइसेन्स नम्बर उल्लेख हुन्छ।',
          },
          {
            q: 'मेरो लाइसेन्स छापिएको कि छैन कसरी थाहा पाउने?',
            a: 'माथिको खोज बक्समा आफ्नो अनुमतिपत्र नम्बर हाल्नुहोस् र "स्थिति जाँच्नुहोस्" थिच्नुहोस्। DOTM को आधिकारिक सूचीमा भएमा "कार्ड छापिइसकेको छ" देखाइनेछ।',
          },
          {
            q: 'अनुमतिपत्र नम्बरको ढाँचा के हो?',
            a: 'XX-XX-XXXXXXXX — पहिलो २ अंक कार्यालय कोड, दोस्रो २ अंक जिल्ला कोड, र अन्तिम ८ अंक व्यक्तिगत नम्बर। उदाहरण: ०१-०१-१२३४५६७८।',
          },
          {
            q: 'मेरो नम्बर कहाँ पाउन सकिन्छ?',
            a: 'पुरानो स्मार्ट कार्ड लाइसेन्स, परीक्षा रसिद, वा यातायात कार्यालयले दिएको अस्थायी रसिदमा तपाईंको नम्बर लेखिएको हुन्छ।',
          },
          {
            q: 'लाइसेन्स लिन के के लैजानु पर्छ?',
            a: 'नागरिकता प्रमाणपत्र, पुरानो सवारी चालक अनुमतिपत्र (यदि भए), र भुक्तानी रसिद। यी कागजात लिएर सम्बन्धित यातायात कार्यालयमा जानुहोस्।',
          },
          {
            q: '"छपाइ हुन बाँकी" देखाइयो भने के गर्ने?',
            a: 'अझ छपाइ हुन बाँकी हुन सक्छ। DOTM ले नियमित रूपमा सूची अद्यावधिक गर्छ — केही दिनपछि पुनः जाँच गर्नुहोस्। वा dotm.gov.np मा गएर पूर्ण सूची हेर्न सकिन्छ।',
          },
          {
            q: 'सूची कति पटक अद्यावधिक हुन्छ?',
            a: 'विभागले साप्ताहिक रूपमा छपाइ भएका लाइसेन्सहरूको सूची सार्वजनिक गर्छ। हाम्रो प्रणालीले पनि नियमित रूपमा त्यो सूची अद्यावधिक गर्छ।',
          },
          {
            q: 'के एसएमएस (SMS) बाट पनि बुझ्न सकिन्छ?',
            a: 'हो, आफ्नो मोबाइलबाट LC <space> <Application ID वा License No> टाइप गरी ३३००१, ३४९४९ वा ३१००३ मा पठाउनुहोस् — यो NTC, Ncell र Smart Cell सबैमा चल्छ।',
          },
          {
            q: 'के यो आधिकारिक सरकारी वेबसाइट हो?',
            a: 'होइन। यो स्वतन्त्र रूपमा बनाइएको नागरिक सहायता खोज उपकरण हो। तथ्याङ्क dotm.gov.np बाट लिइएको हो र त्यहीँ आधिकारिक सूची उपलब्ध छ।',
          },
          {
            q: 'के यो सेवा निःशुल्क हो?',
            a: 'हो। यो सेवा पूर्ण रूपमा निःशुल्क हो र कुनै दर्ता आवश्यक छैन।',
          },
          {
            q: 'मेरो व्यक्तिगत जानकारी सुरक्षित छ?',
            a: 'तपाईंले राख्ने नम्बर खोजका लागि मात्र प्रयोग गरिन्छ। हामी कुनै पनि व्यक्तिगत डेटा सुरक्षित गर्दैनौं।',
          },
        ]
      : [
          {
            q: 'How to check smart licence printed list online on dotm.gov.np?',
            a: 'Enter your driving license number in the XX-XX-XXXXXXXX format in our search tool above and click “Check Status”. Our system instantly searches across 1,000,000+ official DOTM printed records and shows whether your card is printed and ready for pickup at your local transport office.',
          },
          {
            q: 'Can I check my driving license print status by citizenship number or name?',
            a: 'Currently, the Department of Transport Management (DOTM Nepal) publishes the printed license list strictly by Driving License Number (XX-XX-XXXXXXXX). Direct search by citizenship number or applicant name is not supported on the public print list due to privacy protection. You can find your license number on your exam pass slip, payment receipt, or old license card.',
          },
          {
            q: 'How do I know if my license has been printed?',
            a: 'Enter your license number in the search box above and press “Check Status”. If your record appears in the official DOTM list, the page will show “Card is Printed & Ready” with complete details.',
          },
          {
            q: 'What is the license number format?',
            a: 'XX-XX-XXXXXXXX — the first two digits are your office code, the next two are the district code, and the last eight are your personal number. Example: 01-01-12345678.',
          },
          {
            q: 'Where can I find my license number?',
            a: 'It’s printed on your old smart card license, on your exam receipt, or on the temporary slip your transport office gave you when you applied.',
          },
          {
            q: 'What do I need to bring to collect the license?',
            a: 'Your original Citizenship card, your old driving license (if you have one), and your payment receipt. Bring them to the transport office where you applied.',
          },
          {
            q: 'My result says “Not Printed Yet” — what should I do?',
            a: 'Your card is likely still in the print backlog. DOTM updates the list regularly, so check back in a few days. You can also view the full list at dotm.gov.np.',
          },
          {
            q: 'Can I also check via SMS?',
            a: 'Yes! Send your license number (LC <space> <Application ID or License No>) to 33001, 34949 or 31003 — works on NTC, Ncell, and Smart Cell.',
          },
          {
            q: 'How often is the data updated?',
            a: 'DOTM publishes the printed-license list approximately weekly. Our system syncs that list regularly so results stay current.',
          },
          {
            q: 'Is this the official government website?',
            a: 'No. This is an independent public utility. The underlying data comes from dotm.gov.np, which is the official source.',
          },
          {
            q: 'Is this service free to use?',
            a: 'Yes — it is 100% free and requires no sign-up or registration.',
          },
          {
            q: 'Is my personal information safe?',
            a: 'The license number you enter is used only to query the database. We do not store or track personal searches.',
          },
        ]

  return (
    <section
      id="faq"
      className="mt-8 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm"
      aria-labelledby="faq-heading"
    >
      <div className="border-b border-[var(--border-default)] px-5 py-4 sm:px-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--nepal-red)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--nepal-red)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {language === 'ne' ? 'सोधाइ' : 'FAQ'}
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
        <h2 id="faq-heading" className="text-lg font-extrabold text-[var(--text-primary)] sm:text-xl">
          {language === 'ne' ? 'बारम्बार सोधिने प्रश्नहरू' : 'Frequently asked questions'}
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)] sm:text-sm">
          {language === 'ne'
            ? 'नेपाली स्मार्ट कार्ड सवारी चालक अनुमतिपत्र सम्बन्धी प्रायः सोधिने प्रश्नहरूको आधिकारिक उत्तर।'
            : 'Quick answers to the most common questions about Nepal smart card driving licenses.'}
        </p>
      </div>

      <div className="divide-y divide-[var(--border-default)]/70">
        {faqs.map((f, idx) => (
          <details
            key={idx}
            className="group px-5 py-3.5 transition hover:bg-[var(--bg-secondary)]/60 sm:px-6"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-semibold text-[var(--text-primary)] sm:text-[15px]">
              <span className="min-w-0 flex-1">{f.q}</span>
              <span
                className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] transition group-open:rotate-180 group-open:border-[var(--nepal-blue)] group-open:bg-[var(--nepal-blue)] group-open:text-white"
                aria-hidden
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 pr-9 text-sm leading-6 text-[var(--text-secondary)]">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
