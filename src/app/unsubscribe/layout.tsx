import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Unsubscribe | Nepal License Checker',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return children
}
