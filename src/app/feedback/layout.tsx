import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Feedback & Support | Nepal License Checker',
  description:
    'Submit feedback, report missing license numbers, or suggest improvements for Nepal License Checker.',
  alternates: {
    canonical: '/feedback',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children
}
