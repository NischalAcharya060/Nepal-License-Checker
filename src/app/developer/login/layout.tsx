import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Developer Sign In | Nepal License Checker',
  description:
    'Sign in with GitHub to access the Nepal License Checker developer portal and generate API keys with elevated 60 req/min rate limits.',
  alternates: {
    canonical: '/developer/login',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function DeveloperLoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
