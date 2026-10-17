import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/siteUrl'

const siteUrl = getSiteUrl()
const docsUrl = `${siteUrl}/developer/docs`

export const metadata: Metadata = {
  title: 'TypeScript SDK & REST API Documentation | Nepal License Checker',
  description:
    'Comprehensive documentation, code examples, TypeScript interfaces, and REST API reference for the nepal-license-checker SDK with elevated 60 req/min rate limits.',
  keywords: [
    'nepal license checker sdk',
    'nepal driving license api',
    'dotm nepal license api',
    'nepal-license-checker npm',
    'smart licence printed list api',
    'nepal license verification',
    'developer documentation',
    'typescript sdk',
  ],
  alternates: {
    canonical: '/developer/docs',
  },
  openGraph: {
    title: 'TypeScript SDK & REST API Documentation | Nepal License Checker',
    description:
      'Comprehensive documentation, code examples, TypeScript interfaces, and REST API reference for the nepal-license-checker SDK with elevated 60 req/min rate limits.',
    url: '/developer/docs',
    siteName: 'Nepal License Checker',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TypeScript SDK & REST API Documentation | Nepal License Checker',
    description:
      'Comprehensive documentation, code examples, TypeScript interfaces, and REST API reference for the nepal-license-checker SDK with elevated 60 req/min rate limits.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const docsStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'TechArticle',
      '@id': `${docsUrl}/#article`,
      url: docsUrl,
      name: 'Nepal License Checker TypeScript SDK & REST API Documentation',
      headline: 'TypeScript SDK & REST API Documentation for Nepal Driving License Verification',
      description:
        'Official documentation, installation guides, code usage examples, and offline utility reference for the nepal-license-checker SDK.',
      inLanguage: 'en',
      author: {
        '@type': 'Person',
        name: 'Nischal Acharya',
        url: 'https://acharyanischal.com.np/',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Nepal License Checker',
        url: siteUrl,
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${docsUrl}/#software`,
      name: 'nepal-license-checker',
      description:
        'Zero-dependency JavaScript and TypeScript SDK to check Nepal smart driving license print status via DOTM mirrored API.',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Node.js, Browser, Bun, Deno',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      author: {
        '@type': 'Person',
        name: 'Nischal Acharya',
        url: 'https://acharyanischal.com.np/',
      },
      downloadUrl: 'https://www.npmjs.com/package/nepal-license-checker',
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Developer Portal',
          item: `${siteUrl}/developer`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: 'SDK Documentation',
          item: docsUrl,
        },
      ],
    },
  ],
}

export default function SdkDocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(docsStructuredData) }}
      />
      {children}
    </>
  )
}
