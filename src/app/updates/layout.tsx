import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DOTM License Print Updates & Sync Logs | नेपाल लाइसेन्स छपाइ विवरण तथा लग',
  description:
    'Live synchronization logs and office-by-office breakdown of 1.18M+ printed driving licenses indexed from Nepal Department of Transport Management (DOTM).',
  alternates: {
    canonical: '/updates',
  },
  openGraph: {
    title: 'DOTM License Print Updates & Sync Logs',
    description:
      'View real-time synchronization logs, latest batch additions, and printed driving license records across all 35 transport offices in Nepal.',
    url: '/updates',
    siteName: 'Nepal License Checker',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function UpdatesLayout({ children }: { children: React.ReactNode }) {
  return children
}
