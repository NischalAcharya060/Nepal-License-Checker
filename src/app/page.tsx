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
    <main style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f4fc 0%, #f5f7fc 40%, #fff 100%)' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Header ── */}
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          {/* Nepal flag colors stripe */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '20px' }}>
            <div style={{ width: '40px', height: '6px', background: '#DC143C', borderRadius: '3px 0 0 3px' }} />
            <div style={{ width: '10px', height: '10px', background: 'white', border: '2px solid #e2e6ed', borderRadius: '50%', margin: '0 8px' }} />
            <div style={{ width: '40px', height: '6px', background: '#003893', borderRadius: '0 3px 3px 0' }} />
          </div>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: '#003893', color: 'white',
            fontSize: '11px', fontWeight: '700', letterSpacing: '0.07em',
            padding: '5px 14px', borderRadius: '20px', marginBottom: '16px',
            textTransform: 'uppercase',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Government of Nepal · DOTM
          </div>

          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '28px', fontWeight: '800',
            color: '#1e2533', lineHeight: '1.2', marginBottom: '12px',
          }}>
            License Print Status{' '}
            <span style={{ color: '#003893' }}>Checker</span>
          </h1>

          <p style={{
            fontSize: '15px', color: '#5a6478', lineHeight: '1.65',
            maxWidth: '460px', margin: '0 auto',
          }}>
            Check if your smart card driving license has been printed and is ready for collection from your transport management office.
          </p>
        </header>

        {/* ── Search Form ── */}
        <LicenseForm
          onSubmit={checkLicense}
          onReset={reset}
          loading={searchState === 'loading'}
        />

        {/* ── Result ── */}
        {(searchState === 'found' || searchState === 'not_found' || searchState === 'error') && (
          <div className="animate-slide-up" style={{ marginTop: '20px' }}>
            <LicenseResult
              state={searchState}
              result={result}
              licenseNumber={lastSearched}
              onCheckAnother={reset}
            />
          </div>
        )}

        {/* ── Info tiles ── */}
        {searchState === 'idle' && (
          <div className="animate-fade-in" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '28px'
          }}>
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
              <div key={i} style={{
                background: 'white', border: '1px solid #e2e6ed', borderRadius: '12px',
                padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: '32px', height: '32px', background: '#f0f4fc',
                  borderRadius: '8px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: '#003893', marginBottom: '10px',
                }}>
                  {tile.icon}
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e2533', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '5px' }}>
                  {tile.title}
                </div>
                <div style={{ fontSize: '12px', color: '#5a6478', lineHeight: '1.6' }}>
                  {tile.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <p style={{ textAlign: 'center', marginTop: '36px', fontSize: '12px', color: '#9aa3b0' }}>
          Official data from{' '}
          <a href="https://dotm.gov.np/category/details-of-printed-licenses/" target="_blank" rel="noopener noreferrer"
            style={{ color: '#003893', fontWeight: '600', textDecoration: 'none' }}>
            dotm.gov.np
          </a>
          {' '}· Department of Transport Management, Nepal
        </p>

      </div>
    </main>
  )
}
