import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Nepal License Print Status | Check Smart Card Driving License - DOTM',
  description: 'Instantly check if your Nepal smart card driving license has been printed and is ready for collection from DOTM. Official data from dotm.gov.np.',
  keywords: 'Nepal driving license check, DOTM license print status, smart card license Nepal, license printed or not, yatayat license check',
  authors: [{ name: 'Nepal License Checker' }],
  openGraph: {
    title: 'Nepal License Print Status Checker',
    description: 'Check if your Nepal smart card driving license is printed and ready for collection.',
    type: 'website',
    locale: 'en_NP',
  },
  robots: 'index, follow',
  themeColor: '#003893',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
              iconTheme: { primary: 'var(--success)', secondary: 'var(--success-bg)' },
            },
            error: {
              style: {
                background: 'var(--error-bg)',
                color: 'var(--error)',
                border: '1px solid var(--error-border)',
              },
              iconTheme: { primary: 'var(--error)', secondary: 'var(--error-bg)' },
            },
          }}
        />
      </body>
    </html>
  )
}
