// src/app/layout.tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nepal License Print Status Checker | Check Driving License Status',
  description: 'Check if your Nepal driving license smart card is printed and ready for collection. Official status checker for DOTM printed licenses.',
  keywords: 'Nepal license check, driving license status, DOTM license print, smart card license Nepal',
  authors: [{ name: 'Nepal License Checker' }],
  openGraph: {
    title: 'Nepal License Print Status Checker',
    description: 'Check your driving license printing status online',
    type: 'website',
  },
  robots: 'index, follow',
}

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode
}) {
  return (
      <html lang="en">
      <body className={inter.className}>
      {children}
      <Toaster position="top-center" />
      </body>
      </html>
  )
}