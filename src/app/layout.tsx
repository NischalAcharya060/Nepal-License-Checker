import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { getSiteUrl } from '@/lib/siteUrl'

const siteUrl = getSiteUrl()
const appTitle = 'Nepal License Print Status | Check Smart Card Driving License - DOTM'
const appDescription =
  'Instantly check if your Nepal smart card driving license has been printed and is ready for collection from DOTM. Official data from dotm.gov.np.'

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
      name: 'Nepal License Checker',
      url: siteUrl,
      inLanguage: ['en-NP'],
      potentialAction: {
        '@type': 'SearchAction',
        target: `${siteUrl}/?number={license_number}`,
        'query-input': 'required name=license_number',
      },
    },
    {
      '@type': 'WebApplication',
      name: 'Nepal License Checker',
      applicationCategory: 'GovernmentApplication',
      operatingSystem: 'Web',
      url: siteUrl,
      description: appDescription,
      creator: {
        '@type': 'Person',
        name: 'Nischal Acharya',
        url: 'https://acharyanischal.com.np/',
      },
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
  keywords: [
    'Nepal driving license check',
    'DOTM license print status',
    'smart card license Nepal',
    'license printed or not',
    'yatayat license check',
  ],
  authors: [
    { name: 'Nischal Acharya', url: 'https://acharyanischal.com.np/' },
    { name: 'Nepal License Checker' },
  ],
  creator: 'Nischal Acharya',
  publisher: 'Nepal License Checker',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: appTitle,
    description: appDescription,
    url: '/',
    siteName: 'Nepal License Checker',
    type: 'website',
    locale: 'en_NP',
  },
  twitter: {
    card: 'summary',
    title: appTitle,
    description: appDescription,
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
  themeColor: '#003893',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* ✅ FIX: prevent hydration mismatch */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
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
              fontFamily: "'Plus Jakarta Sans', sans-serif",
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