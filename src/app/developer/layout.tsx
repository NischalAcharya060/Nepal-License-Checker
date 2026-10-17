import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Developer Portal & API Keys | Nepal License Checker',
  description:
    'Manage API keys and access elevated 60 req/min rate limits for Nepal License Checker. Integrate smart card driving license verification into web, mobile, and backend apps.',
  alternates: {
    canonical: '/developer',
  },
  openGraph: {
    title: 'Developer Portal & API Keys | Nepal License Checker',
    description:
      'Manage API keys and access elevated 60 req/min rate limits for Nepal License Checker. Integrate smart card driving license verification into web, mobile, and backend apps.',
    url: '/developer',
    siteName: 'Nepal License Checker',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Developer Portal & API Keys | Nepal License Checker',
    description:
      'Manage API keys and access elevated 60 req/min rate limits for Nepal License Checker.',
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

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  return children
}
