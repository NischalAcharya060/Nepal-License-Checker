import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Admin Console · Nepal License Checker',
    description: 'Administrative insights, search query logs, and visitor geolocation.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
