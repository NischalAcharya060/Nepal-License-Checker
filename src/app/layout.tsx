import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { getSiteUrl } from '@/lib/siteUrl'

const siteUrl = getSiteUrl()

const appTitleEn = 'Nepal License Print Status | Check Smart Card Driving License - DOTM'
const appTitleNe = 'सवारी चालक अनुमतिपत्र छापिएको छ कि छैन | स्मार्ट कार्ड स्थिति - यातायात विभाग'
const appTitle = `${appTitleEn} · ${appTitleNe}`

const appDescriptionEn =
  'Instantly check if your Nepal smart card driving license has been printed and is ready for collection from DOTM. Free bilingual tool searching 100,000+ indexed records from dotm.gov.np.'
const appDescriptionNe =
  'तपाईंको नेपाल स्मार्ट कार्ड सवारी चालक अनुमतिपत्र छापिएको छ कि छैन र यातायात व्यवस्था विभाग (DOTM) बाट लिन तयार छ कि छैन तुरुन्तै जाँच गर्नुहोस्। १ लाख भन्दा बढी अभिलेखहरूमा निःशुल्क खोजी। dotm.gov.np को आधिकारिक तथ्याङ्क।'
const appDescription = `${appDescriptionEn} | ${appDescriptionNe}`

const themeInitScript = `
(() => {
  try {
    const saved = localStorage.getItem('ui-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved === 'dark' || saved === 'light'
      ? saved
      : (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  } catch {}
})();
`

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'Nepal License Checker · नेपाल लाइसेन्स जाँच',
      alternateName: [
        'Nepal Driving License Checker',
        'सवारी चालक अनुमतिपत्र जाँच',
        'स्मार्ट कार्ड लाइसेन्स स्थिति',
        'यातायात लाइसेन्स छापिएको कि छैन',
        'DOTM License Status',
        'Nepal Smart Card License Checker',
        'लाइसेन्स स्थिति जाँच',
      ],
      url: siteUrl,
      inLanguage: ['en-NP', 'ne-NP'],
      description: appDescription,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/?number={license_number}`,
        'query-input': 'required name=license_number',
      },
    },
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}/#webapp`,
      name: 'Nepal License Checker',
      applicationCategory: 'GovernmentApplication',
      operatingSystem: 'Web',
      url: siteUrl,
      inLanguage: ['en-NP', 'ne-NP'],
      description: appDescription,
      browserRequirements: 'Requires JavaScript. Modern browsers.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'NPR',
      },
      creator: {
        '@type': 'Organization',
        name: 'Nepal License Checker',
        url: siteUrl,
      },
      developer: {
        '@type': 'Person',
        name: 'Nischal Acharya',
        url: 'https://acharyanischal.com.np/',
      },
      isAccessibleForFree: true,
    },
    {
      '@type': 'Organization',
      '@id': `${siteUrl}/#org`,
      name: 'Nepal License Checker',
      url: siteUrl,
      description: appDescription,
      founder: {
        '@type': 'Person',
        name: 'Nischal Acharya',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Support',
        url: siteUrl,
        availableLanguage: ['en', 'ne'],
      },
    },
    {
      '@type': 'GovernmentService',
      '@id': `${siteUrl}/#service`,
      name: 'Nepal Smart Card Driving License Print Status Check',
      description: appDescriptionEn,
      url: siteUrl,
      provider: {
        '@type': 'GovernmentOrganization',
        name: 'Department of Transport Management (DOTM), Nepal',
        url: 'https://dotm.gov.np',
        alternateName: 'यातायात व्यवस्था विभाग',
      },
      serviceType: 'License Status Verification',
      audience: {
        '@type': 'Audience',
        audienceType: 'Nepal driving license holders',
      },
      isRelatedTo: {
        '@type': 'Thing',
        name: 'Smart Card Driving License',
        identifier: 'XX-XX-XXXXXXXX',
      },
      areaServed: {
        '@type': 'Country',
        name: 'Nepal',
      },
      inLanguage: ['en-NP', 'ne-NP'],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'NPR',
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home · गृहपृष्ठ',
          item: siteUrl,
        },
      ],
    },
    {
      '@type': 'WebPage',
      '@id': siteUrl,
      url: siteUrl,
      name: appTitle,
      description: appDescription,
      inLanguage: ['en-NP', 'ne-NP'],
      isAccessibleForFree: true,
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', '#how-to-heading', '#faq-heading'],
      },
      about: {
        '@type': 'Thing',
        name: 'Nepal Smart Card Driving License Print Status',
      },
      mainEntity: {
        '@id': `${siteUrl}/#service`,
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${siteUrl}/#faq`,
      inLanguage: ['en-NP', 'ne-NP'],
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I check if my Nepal smart card driving license is printed?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Enter your license number in the search box on this page in the format XX-XX-XXXXXXXX (Office-District-Number) and press “Check Status”. We compare it against the latest list published by the Department of Transport Management (DOTM) at dotm.gov.np and show whether your smart card has been printed and is ready to collect.',
          },
        },
        {
          '@type': 'Question',
          name: 'मेरो स्मार्ट कार्ड सवारी चालक अनुमतिपत्र छापिएको छ कि छैन कसरी जाँच गर्ने?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'माथिको खोज बक्समा आफ्नो अनुमतिपत्र नम्बर XX-XX-XXXXXXXX (कार्यालय-जिल्ला-नम्बर) ढाँचामा हाल्नुहोस् र "स्थिति जाँच्नुहोस्" थिच्नुहोस्। हामी यातायात व्यवस्था विभाग (dotm.gov.np) को आधिकारिक पछिल्लो सूचीसँग तुलना गरेर "तयार छ" वा "तयार छैन" भन्ने नतिजा देखाउँछौं।',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the license number format?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'It is XX-XX-XXXXXXXX. The first two digits are the office code, the next two are the district code, and the last eight digits are your personal number. Example: 01-01-12345678.',
          },
        },
        {
          '@type': 'Question',
          name: 'अनुमतिपत्र नम्बरको ढाँचा के हो?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'XX-XX-XXXXXXXX — पहिलो २ अंक कार्यालय कोड, दोस्रो २ अंक जिल्ला कोड, र अन्तिम ८ अंक व्यक्तिगत नम्बर हो। उदाहरण: ०१-०१-१२३४५६७८।',
          },
        },
        {
          '@type': 'Question',
          name: 'Where can I find my license number?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You can find your license number on your old smart card driving license, on your exam receipt, or on the temporary slip given to you by the transport office when you applied.',
          },
        },
        {
          '@type': 'Question',
          name: 'मेरो लाइसेन्स नम्बर कहाँ पाउन सकिन्छ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'पुरानो स्मार्ट कार्ड लाइसेन्स, परीक्षा रसिद, वा यातायात कार्यालयले दिएको अस्थायी रसिदमा तपाईंको नम्बर लेखिएको हुन्छ।',
          },
        },
        {
          '@type': 'Question',
          name: 'What should I bring to collect my license?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Bring your Citizenship card, your old driving license (if any), and your payment receipt to your transport office to collect the printed smart card.',
          },
        },
        {
          '@type': 'Question',
          name: 'लाइसेन्स लिन के के लैजानु पर्छ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'नागरिकता प्रमाणपत्र, पुरानो सवारी चालक अनुमतिपत्र (यदि भए), र भुक्तानी रसिद लिएर सम्बन्धित यातायात कार्यालयमा जानुहोस् र छापिएको स्मार्ट कार्ड बुझिलिनुहोस्।',
          },
        },
        {
          '@type': 'Question',
          name: 'My result says “Not Ready” — what should I do?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Your card may still be in the print queue. DOTM updates the list roughly weekly, so check back in a few days. You can also visit dotm.gov.np to view the full official list.',
          },
        },
        {
          '@type': 'Question',
          name: '"तयार छैन" देखाइयो भने के गर्ने?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'अझ छपाइ हुन बाँकी हुन सक्छ। DOTM ले साप्ताहिक रूपमा सूची अद्यावधिक गर्छ — केही दिनपछि पुनः जाँच गर्नुहोस्। वा dotm.gov.np मा गएर पूर्ण सूची हेर्न सकिन्छ।',
          },
        },
        {
          '@type': 'Question',
          name: 'How often is the list updated?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'DOTM publishes the printed-license list approximately weekly. Our system syncs that list regularly so results stay current.',
          },
        },
        {
          '@type': 'Question',
          name: 'सूची कति पटक अद्यावधिक हुन्छ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'विभागले साप्ताहिक रूपमा छपाइ भएका लाइसेन्सहरूको सूची सार्वजनिक गर्छ। हाम्रो प्रणालीले पनि नियमित रूपमा त्यो सूची अद्यावधिक गर्छ।',
          },
        },
        {
          '@type': 'Question',
          name: 'Is this the official government website?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. This is an independent search tool. The underlying data is mirrored from dotm.gov.np, which is the official source for the full list.',
          },
        },
        {
          '@type': 'Question',
          name: 'के यो आधिकारिक सरकारी वेबसाइट हो?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'होइन। यो स्वतन्त्र रूपमा बनाइएको खोज उपकरण हो। तथ्याङ्क dotm.gov.np बाट लिइएको हो र त्यहीँ आधिकारिक सूची उपलब्ध छ।',
          },
        },
        {
          '@type': 'Question',
          name: 'Is this service free to use?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes — it is completely free and requires no sign-up.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is my personal information safe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'The license number you enter is used only to perform the lookup. We don’t store or sell your searches.',
          },
        },
      ],
    },
    {
      '@type': 'HowTo',
      '@id': `${siteUrl}/#howto`,
      name: 'How to check if your Nepal driving license is printed',
      description:
        'A 5-step guide to verify whether your Nepal smart card driving license has been printed by DOTM and is ready to collect.',
      inLanguage: 'en-NP',
      totalTime: 'PT1M',
      supply: [
        { '@type': 'HowToSupply', name: 'Your driving license number (format XX-XX-XXXXXXXX)' },
      ],
      tool: [
        { '@type': 'HowToTool', name: 'Web browser' },
      ],
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Have your license number ready',
          text: 'Locate your license number on your old smart card, exam receipt, or temporary slip. It looks like XX-XX-XXXXXXXX — office code, district code, then your personal number.',
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Enter the number in the search box',
          text: 'Type only the digits — hyphens are inserted automatically. Use the clear button to fix any typos.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Press “Check Status”',
          text: 'We match your number against the latest list published by DOTM and return the result within seconds.',
        },
        {
          '@type': 'HowToStep',
          position: 4,
          name: 'Read the result',
          text: '“It’s Ready” means your smart card has been printed. “Not Ready” usually means it hasn’t been added to the list yet — check back in a few days.',
        },
        {
          '@type': 'HowToStep',
          position: 5,
          name: 'Collect it from your transport office',
          text: 'Bring your Citizenship card, old driving license, and payment receipt to the transport office where you originally applied.',
        },
      ],
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: appTitle,
  description: appDescription,
  applicationName: 'Nepal License Checker',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: appTitle,
    description: appDescription,
    url: '/',
    siteName: 'Nepal License Checker',
    type: 'website',
    locale: 'en_NP',
    alternateLocale: ['ne_NP'],
    countryName: 'Nepal',
    images: [
      {
        url: '/logo.webp',
        width: 512,
        height: 512,
        alt: 'Nepal License Checker - Smart Card Driving License Status',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: appTitle,
    description: appDescription,
    creator: '@nischal_dev',
    images: ['/logo.webp'],
  },
  keywords: [
    // English
    'Nepal driving license check',
    'DOTM license print status',
    'smart card license Nepal',
    'license printed or not',
    'yatayat license check',
    'license print status checker',
    'Nepal driving license status',
    'DOTM smart card',
    'driving license Nepal official',
    'check driving license Nepal',
    // Nepali (Devanagari)
    'सवारी चालक अनुमतिपत्र',
    'स्मार्ट कार्ड लाइसेन्स',
    'लाइसेन्स छापिएको',
    'लाइसेन्स छापिएको कि छैन',
    'सवारी चालक अनुमतिपत्र छापिएको कि छैन',
    'यातायात व्यवस्था विभाग',
    'यातायात लाइसेन्स',
    'नेपाल लाइसेन्स जाँच',
    'स्मार्ट कार्ड स्थिति',
    'लाइसेन्स प्रिन्ट भएको कि छैन',
    'लाइसेन्स नम्बर जाँच',
    'सवारी अनुमतिपत्र नेपाल',
    'DOTM नेपाल',
    'यातायात कार्यालय लाइसेन्स',
    // Romanized Nepali (people search like this too)
    'license chhapieko ki chaina',
    'sawari chalak anumati patra',
    'smart card license nepal status',
    'yatayat license check nepal',
  ],
  authors: [
    { name: 'Nischal Acharya', url: 'https://acharyanischal.com.np/' },
    { name: 'Nepal License Checker' },
  ],
  creator: 'Nischal Acharya',
  publisher: 'Nepal License Checker',
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
    url: false,
  },
  alternates: {
    canonical: '/',
    languages: {
      'en-NP': '/',
      'ne-NP': '/?lang=ne',
      'x-default': '/',
    },
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'Government',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#003893' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* prevent hydration mismatch */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Mukta:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <link rel="alternate" hrefLang="en-NP" href={siteUrl} />
        <link rel="alternate" hrefLang="ne-NP" href={`${siteUrl}/?lang=ne`} />
        <link rel="alternate" hrefLang="x-default" href={siteUrl} />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>

      <body suppressHydrationWarning>
        {children}

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "'Plus Jakarta Sans', 'Mukta', sans-serif",
              fontSize: '14px',
              fontWeight: '500',
              borderRadius: '10px',
              padding: '12px 16px',
            },
            success: {
              style: {
                background: 'var(--success-bg)',
                color: 'var(--success)',
                border: '1px solid var(--success-border)',
              },
              iconTheme: {
                primary: 'var(--success)',
                secondary: 'var(--success-bg)',
              },
            },
            error: {
              style: {
                background: 'var(--error-bg)',
                color: 'var(--error)',
                border: '1px solid var(--error-border)',
              },
              iconTheme: {
                primary: 'var(--error)',
                secondary: 'var(--error-bg)',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
