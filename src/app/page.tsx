'use client'

import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import LicenseForm from '@/components/LicenseForm'
import LicenseResult from '@/components/LicenseResult'

export type LicenseData = {
  license_number: string
  holder_name: string
  office: string
  category: string
  createdAt: any
  updatedAt: any
}

export type SearchState = 'idle' | 'loading' | 'found' | 'not_found' | 'error'

export default function Home() {
  const [searchState, setSearchState] = useState<SearchState>('idle')
  const [result, setResult] = useState<LicenseData | null>(null)
  const [lastSearched, setLastSearched] = useState<string>('')

  const checkLicense = useCallback(async (licenseNumber: string) => {
    setSearchState('loading')
    setResult(null)
    setLastSearched(licenseNumber)

    try {
      const response = await fetch(`/api/license?number=${encodeURIComponent(licenseNumber)}`)
      const data = await response.json()

      if (response.status === 429) {
        toast.error('Too many requests. Please wait a moment.')
        setSearchState('error')
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Server error')
      }

      if (data.status === 'success' && data.data) {
        setResult(data.data)
        setSearchState('found')
        toast.success('License found in printed records!')
      } else {
        setSearchState('not_found')
        toast.error('License not found in printed records')
      }
    } catch (error) {
      console.error('Error checking license:', error)
      setSearchState('error')
      toast.error('Failed to check license. Please try again.')
    }
  }, [])

  const reset = useCallback(() => {
    setSearchState('idle')
    setResult(null)
    setLastSearched('')
  }, [])

  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12">
        <header className="mb-8 text-center sm:mb-10">
          <div className="mb-5 flex items-center justify-center gap-2">
            <div className="h-1.5 w-10 rounded-l-full bg-[var(--nepal-red)]" />
            <div className="h-2.5 w-2.5 rounded-full border-2 border-[var(--border-default)] bg-white" />
            <div className="h-1.5 w-10 rounded-r-full bg-[var(--nepal-blue)]" />
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--nepal-blue)] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.09em] text-white sm:text-[11px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Government of Nepal · DOTM
          </div>

          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            License Print Status <span className="text-[var(--nepal-blue)]">Checker</span>
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Check if your smart card driving license has been printed and is ready for collection from your transport management office.
          </p>
        </header>

        <LicenseForm
          onSubmit={checkLicense}
          onReset={reset}
          loading={searchState === 'loading'}
        />

        {(searchState === 'found' || searchState === 'not_found' || searchState === 'error') && (
          <div className="animate-slide-up mt-5">
            <LicenseResult
              state={searchState}
              result={result}
              licenseNumber={lastSearched}
              onCheckAnother={reset}
            />
          </div>
        )}

        {searchState === 'idle' && (
          <div className="animate-fade-in mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
                title: 'License Format',
                text: 'Enter in format XX-XX-XXXXXXXX (Office–District–Unique). Example: 01-01-12345678',
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                title: 'Collection',
                text: 'Visit your transport management office with citizenship, old license and payment receipt',
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
                title: 'Data Source',
                text: 'Data is fetched from official DOTM Nepal published license records on dotm.gov.np',
              },
              {
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                title: 'Update Frequency',
                text: 'DOTM publishes new batches periodically. Check again in a few days if not found',
              },
            ].map((tile, i) => (
              <div key={i} className="rounded-xl border border-[var(--border-default)] bg-white p-4 shadow-sm">
                <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)]">
                  {tile.icon}
                </div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-primary)]">
                  {tile.title}
                </div>
                <div className="text-xs leading-5 text-[var(--text-secondary)]">
                  {tile.text}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-9 text-center text-xs text-[var(--text-muted)]">
          Official data from{' '}
          <a href="https://dotm.gov.np/category/details-of-printed-licenses/" target="_blank" rel="noopener noreferrer"
            className="font-semibold text-[var(--nepal-blue)] no-underline">
            dotm.gov.np
          </a>
          {' '}· Department of Transport Management, Nepal
        </p>
      </div>
    </main>
  )
}
