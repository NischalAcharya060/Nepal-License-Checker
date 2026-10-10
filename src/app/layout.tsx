import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Mukta } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { getSiteUrl } from '@/lib/siteUrl'
import { PwaProvider } from '@/components/PwaProvider'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

const mukta = Mukta({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-devanagari',
  display: 'swap',
})

const siteUrl = getSiteUrl()

const appTitleEn = 'Smart Licence Printed List | DOTM Nepal License Print Check'
const appTitleNe = 'सवारी चालक अनुमति पत्र चेक | स्मार्ट लाइसेन्स छापिएको सूची - DOTM'
const appTitle = `${appTitleEn} · ${appTitleNe}`

const appDescriptionEn =
  'Check smart licence printed list from DOTM Nepal. Search your smart card driving license print status online (सवारी चालक अनुमति पत्र चेक) across 1,000,000+ indexed official dotm.gov.np records.'
const appDescriptionNe =
  'यातायात व्यवस्था विभाग (DOTM) को स्मार्ट लाइसेन्स छापिएको सूची (Smart Licence Printed List) मा आफ्नो सवारी चालक अनुमति पत्र चेक गर्नुहोस्। १० लाख+ अभिलेखहरूमा निःशुल्क अनलाइन खोजी।'
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
    const updateManifest = (isDark) => {
      const link = document.querySelector('link[rel="manifest"]');
      if (link) {
        link.setAttribute('href', isDark ? '/site-dark.webmanifest' : '/site.webmanifest');
      }
    };
    updateManifest(theme === 'dark');
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => updateManifest(theme === 'dark'), { once: true });
    }
  } catch {}
})();
`

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'Smart Licence Printed List · सवारी चालक अनुमति पत्र चेक',
      alternateName: [
        'smart licence printed list nepal',
        'smart license printed list nepal',
        'smart licence printed list',
        'smart license printed list',
        'dotm license print check nepal',
        'dotm licence print check nepal',
        'dotm license print check',
        'dotm licence print check',
        'सवारी चालक अनुमति पत्र चेक नेपाल',
        'सवारी चालक अनुमति पत्र चेक',
        'www dotm gov np licence check online',
        'www dotm gov np license check online',
        'nepal license print check',
        'nepal licence print check',
        'nepal driving license check',
        'nepal driving licence check',
        'smart license check nepal',
        'smart licence check nepal',
        'dotm nepal license check',
        'dotm nepal licence check',
        'driving licence smart card check nepal',
        'driving license smart card check nepal',
        'dotm smart card license search nepal',
        'dotm smart card licence search nepal',
        'Nepal License Checker',
        'Nepal Licence Checker',
        'sawari chalak anumati patra nepal',
        'लाइसेन्स छापिएको सूची नेपाल',
        'लाइसेन्स छापिएको सूची',
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
      logo: `${siteUrl}/License-Checker-Nepal-logo.png`,
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
          name: 'How to check smart licence printed list online on dotm.gov.np?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'To check the smart licence printed list from DOTM Nepal, enter your driving license number (XX-XX-XXXXXXXX) into the search box above. Our tool checks your status instantly across 1,000,000+ indexed official DOTM printed records and shows whether your card is printed and ready for pickup at your local Transport Management Office (TMO).',
          },
        },
        {
          '@type': 'Question',
          name: 'DOTM को स्मार्ट लाइसेन्स छापिएको सूची (Smart Licence Printed List) अनलाइन कसरी चेक गर्ने?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'आफ्नो सवारी चालक अनुमतिपत्र नम्बर XX-XX-XXXXXXXX ढाँचामा माथिको खोज बाकसमा हालेर "स्थिति जाँच्नुहोस्" मा थिच्नुहोस्। यदि तपाईंको कार्ड यातायात व्यवस्था विभाग (DOTM) द्वारा छापिएको छ भने कार्यालयको नाम र संकलन निर्देशन तुरुन्तै देखाउँछ।',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I check my driving license print status by citizenship number or name?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Currently, the Department of Transport Management (DOTM Nepal) publishes the smart licence printed list strictly by Driving License Number (XX-XX-XXXXXXXX). Official public print lists do not support search solely by citizenship number or applicant name due to privacy protection. You can find your license number on your exam pass slip, payment receipt, or old license card.',
          },
        },
        {
          '@type': 'Question',
          name: 'के नागरिकता नम्बर वा नामबाट लाइसेन्स छापिएको कि छैन चेक गर्न सकिन्छ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'हाल यातायात व्यवस्था विभाग (DOTM) ले सार्वजनिक गर्ने स्मार्ट लाइसेन्स छापिएको सूचीमा केवल अनुमतिपत्र नम्बर (XX-XX-XXXXXXXX) बाट मात्र खोजी गर्न सकिन्छ। व्यक्तिगत गोपनीयताका कारण नागरिकता नम्बर वा नामबाट मात्र अनलाइन छपाइ सूची हेर्ने व्यवस्था छैन। तपाईंको परीक्षा उत्तीर्ण रसिद वा राजस्व रसिदमा लाइसेन्स नम्बर उल्लेख हुन्छ।',
          },
        },
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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/maskable-icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'android-chrome-192x192',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome-512x512',
        url: '/android-chrome-512x512.png',
      },
      {
        rel: 'maskable-icon',
        url: '/maskable-icon-512x512.png',
      },
      {
        rel: 'maskable-icon-dark',
        url: '/maskable-icon-dark-512x512.png',
      },
    ],
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'License Checker',
    statusBarStyle: 'black-translucent',
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
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nepal License Checker - Smart Card Driving License Status',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: appTitle,
    description: appDescription,
    creator: '@nischal_dev',
    images: ['/twitter-image.png'],
  },
  keywords: [
    // Top Google Search Console Queries (High Impressions & Clicks)
    'smart licence printed list nepal',
    'smart license printed list nepal',
    'smart licence printed list in nepal',
    'smart license printed list in nepal',
    'smart licence printed list',
    'smart license printed list',
    'dotm license print check nepal',
    'dotm licence print check nepal',
    'dotm license print check',
    'dotm licence print check',
    'www dotm gov np licence check online',
    'www dotm gov np license check online',
    'www dotm gov np licence check nepal',
    'www dotm gov np license check nepal',
    'license print check nepal',
    'licence print check nepal',
    'license print check',
    'licence print check',
    'www dotm gov np licence check',
    'www dotm gov np license check',
    'smart license check nepal',
    'smart licence check nepal',
    'smart license check',
    'smart licence check',
    'license check nepal',
    'licence check nepal',
    'license check',
    'licence check',
    'dotm nepal license check',
    'dotm nepal licence check',
    'dotm license check nepal',
    'dotm licence check nepal',
    'dotm license check',
    'dotm licence check',
    'dotm license print check online nepal',
    'dotm licence print check online nepal',
    'dotm license print check online',
    'dotm licence print check online',
    'driving license card check nepal',
    'driving licence card check nepal',
    'driving license card check',
    'driving licence card check',
    'smart card print check nepal',
    'smart card print check',
    'driving licence smart card check nepal',
    'driving license smart card check nepal',
    'driving licence smart card check',
    'driving license smart card check',
    'dotm nepal license print check',
    'dotm nepal licence print check',
    'driving licence smart card print nepal',
    'driving license smart card print nepal',
    'dotm smart card license search nepal',
    'dotm smart card licence search nepal',
    'dotm smart card license search',
    'dotm smart card licence search',
    'license status nepal',
    'licence status nepal',
    'license status',
    'licence status',
    'smart license print check online nepal',
    'smart licence print check online nepal',
    'smart license print check online',
    'smart licence print check online',
    'license status check nepal',
    'licence status check nepal',
    'license status check',
    'licence status check',
    'dotm license search nepal',
    'dotm licence search nepal',
    'dotm license search',
    'dotm licence search',
    'smart license check online nepal',
    'smart licence check online nepal',
    'smart license check online',
    'smart licence check online',
    'dotm license check by name nepal',
    'dotm licence check by name nepal',
    'dotm license check by name',
    'dotm licence check by name',
    'license check by citizenship number nepal',
    'licence check by citizenship number nepal',
    'license check by citizenship number',
    'licence check by citizenship number',
    'w.dotm.gov.np license check nepal',
    'w.dotm.gov.np licence check nepal',
    'w.dotm.gov.np license check',
    'w.dotm.gov.np licence check',
    'smart card check nepal',
    'smart card check',
    'smart card license search nepal',
    'smart card licence search nepal',
    'smart card license search',
    'smart card licence search',
    'driving license print check nepal',
    'driving licence print check nepal',
    'driving license print check',
    'driving licence print check',
    'nepal license check',
    'nepal licence check',
    'smart card status nepal',
    'smart card status',
    'license checker nepal',
    'licence checker nepal',
    'license checker',
    'licence checker',
    'license number check nepal',
    'licence number check nepal',
    'license number check',
    'licence number check',
    'find my license nepal',
    'find my licence nepal',
    'find my license',
    'find my licence',
    'driving license check nepal',
    'driving licence check nepal',
    'driving license check',
    'driving licence check',
    'www.dotm.gov.np license check',
    'www.dotm.gov.np licence check',
    'sawari chalak anumati patra nepal',
    'sawari chalak anumati patra',
    'smart card online check nepal',
    'smart card online check',
    'government of nepal license check',
    'government of nepal licence check',
    'government of nepal driving license check',
    'government of nepal driving licence check',
    'smart license search nepal',
    'smart licence search nepal',
    'smart license search',
    'smart licence search',
    'smartcard check nepal',
    'smartcard check',
    'license search dotm nepal',
    'licence search dotm nepal',
    'license search dotm',
    'licence search dotm',
    'printed license list nepal',
    'printed licence list nepal',
    'sawari chalak nepal',
    'sawari chalak',
    'search license nepal',
    'search licence nepal',
    'check smart card status nepal',
    'check smart card status',
    'check license print nepal',
    'check licence print nepal',
    'check license print',
    'check licence print',
    'smart-card license search nepal',
    'smart-card licence search nepal',
    'smart-card license search',
    'smart-card licence search',
    'smart licence printed list pdf nepal',
    'smart license printed list pdf nepal',
    'smart licence printed list pdf',
    'smart license printed list pdf',
    'driving license number check nepal',
    'driving licence number check nepal',
    'driving license number check',
    'driving licence number check',
    'license details check nepal',
    'licence details check nepal',
    'license details check',
    'licence details check',
    'nepali driving licence print check online',
    'nepali driving license print check online',
    'old license check nepal',
    'old licence check nepal',
    'driving license smart card status nepal',
    'driving licence smart card status nepal',
    'driving license smart card status',
    'driving licence smart card status',
    'online driving license check nepal',
    'online driving licence check nepal',
    'how to check if my license is printed or not nepal',
    'how to check if my licence is printed or not nepal',
    'how to check if my license is printed or not',
    'how to check if my licence is printed or not',
    'online smart card status check nepal',
    'online smart card status check',
    'applydlnew dotm gov np license check nepal',
    'applydlnew dotm gov np licence check nepal',
    'applydlnew dotm gov np license check',
    'smart card license check nepal',
    'smart card licence check nepal',
    'smart card license check',
    'smart card licence check',
    'dotm smart license check nepal',
    'dotm smart licence check nepal',
    'dotm smart license check',
    'dotm smart licence check',
    'smart license check online नेपाल',
    'smart licence check online नेपाल',
    'chalak anumati patra nepal',
    'chalak anumati patra',
    'savari chalak anumati patra nepal',
    'savari chalak anumati patra',
    'driving license print check janakpur',
    'driving licence print check janakpur',
    'narayani license check nepal',
    'narayani licence check nepal',
    'narayani license check',
    'birgunj license check nepal',
    'birgunj licence check nepal',
    'birgunj license check',
    'nepal driving license official',
    'nepal driving licence official',
    'DOTM smart card nepal',
    'DOTM smart card',
    // Nepali (Devanagari) - Focused on Nepal
    'सवारी चालक अनुमति पत्र चेक नेपाल',
    'सवारी चालक अनुमति पत्र चेक',
    'सवारी चालक अनुमतिपत्र चेक नेपाल',
    'सवारी चालक अनुमतिपत्र नेपाल',
    'सवारी चालक अनुमतिपत्र',
    'स्मार्ट कार्ड लाइसेन्स नेपाल',
    'स्मार्ट कार्ड लाइसेन्स',
    'लाइसेन्स छापिएको नेपाल',
    'लाइसेन्स छापिएको',
    'लाइसेन्स छापिएको कि छैन नेपाल',
    'लाइसेन्स छापिएको कि छैन',
    'सवारी चालक अनुमतिपत्र छापिएको कि छैन नेपाल',
    'सवारी चालक अनुमतिपत्र छापिएको कि छैन',
    'यातायात व्यवस्था विभाग नेपाल लाइसेन्स',
    'यातायात व्यवस्था विभाग नेपाल',
    'यातायात व्यवस्था विभाग',
    'यातायात लाइसेन्स नेपाल',
    'यातायात लाइसेन्स',
    'नेपाल लाइसेन्स जाँच',
    'नेपाल लाइसेन्स चेक',
    'स्मार्ट कार्ड स्थिति नेपाल',
    'स्मार्ट कार्ड स्थिति',
    'लाइसेन्स प्रिन्ट भएको कि छैन नेपाल',
    'लाइसेन्स प्रिन्ट भएको कि छैन',
    'लाइसेन्स नम्बर जाँच नेपाल',
    'लाइसेन्स नम्बर जाँच',
    'सवारी अनुमतिपत्र नेपाल',
    'DOTM नेपाल लाइसेन्स चेक',
    'DOTM नेपाल',
    'यातायात कार्यालय लाइसेन्स नेपाल',
    'यातायात कार्यालय लाइसेन्स',
    'लाइसेन्स प्रिंट अवस्था नेपाल',
    'लाइसेन्स प्रिंट अवस्था',
    'स्मार्ट लाइसेन्स छापिएको सूची नेपाल',
    'स्मार्ट लाइसेन्स छापिएको सूची',
    'नेपाल सवारी चालक अनुमतिपत्र चेक',
    'लाइसेन्स छापिएको छ कि छैन कसरी हेर्ने नेपाल',
    'नागरिकता नम्बरबाट लाइसेन्स चेक नेपाल',
    // Romanized Nepali
    'license chhapieko ki chaina nepal',
    'licence chhapieko ki chaina nepal',
    'license chhapieko ki chaina',
    'smart card license nepal status',
    'smart card licence nepal status',
    'yatayat license check nepal',
    'yatayat licence check nepal',
    'kasari check garne nepal license',
    'kasari check garne',
  ],
  authors: [
    { name: 'Nischal Acharya', url: 'https://acharyanischal.com.np/' },
    { name: 'Nepal License Checker' },
  ],
  creator: 'Nischal Acharya',
  publisher: 'Nepal License Checker',
  other: {
    developer: 'Nischal Acharya',
  },
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
      'en': '/',
      'en-NP': '/',
      'ne': '/?lang=ne',
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
    <html lang="en" className={`${plusJakartaSans.variable} ${mukta.variable}`} suppressHydrationWarning>
      <head>
        {/* prevent hydration mismatch */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>

      <body suppressHydrationWarning>
        <PwaProvider>
          {children}

          <Toaster
            position="top-center"
            containerClassName="print:hidden"
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
        </PwaProvider>
      </body>
    </html>
  )
}
