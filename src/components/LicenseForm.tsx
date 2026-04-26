'use client'

import { useState, useCallback, useRef } from 'react'
import { validateLicenseNumber } from '@/utils/validation'

interface LicenseFormProps {
    onSubmit: (licenseNumber: string) => Promise<void>
    onReset: () => void
    loading: boolean
}

const LOADING_MESSAGES = [
    'Connecting to DOTM records...',
    'Searching printed license lists...',
    'Scanning PDF records...',
    'Almost there...',
]

export default function LicenseForm({ onSubmit, onReset, loading }: LicenseFormProps) {
    const [licenseNumber, setLicenseNumber] = useState('')
    const [error, setError] = useState('')
    const [focused, setFocused] = useState(false)
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
    const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined)
    const loadingInterval = useRef<NodeJS.Timeout | undefined>(undefined)

    // Cycle through loading messages
    const startLoadingMessages = useCallback(() => {
        setLoadingMsgIdx(0)
        loadingInterval.current = setInterval(() => {
            setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length)
        }, 1800)
    }, [])

    const stopLoadingMessages = useCallback(() => {
        if (loadingInterval.current) clearInterval(loadingInterval.current)
    }, [])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow digits, auto-insert hyphens
        let raw = e.target.value.replace(/[^0-9]/g, '')
        if (raw.length > 12) raw = raw.slice(0, 12)

        let formatted = raw
        if (raw.length > 4) {
            formatted = raw.slice(0, 2) + '-' + raw.slice(2, 4) + '-' + raw.slice(4)
        } else if (raw.length > 2) {
            formatted = raw.slice(0, 2) + '-' + raw.slice(2)
        }

        setLicenseNumber(formatted)
        setError('')
        onReset()

        if (debounceTimer.current) clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(() => {
            if (formatted.length === 14 && !validateLicenseNumber(formatted)) {
                setError('Invalid format. Use XX-XX-XXXXXXXX')
            }
        }, 400)
    }, [onReset])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!licenseNumber) { setError('Please enter a license number'); return }
        if (!validateLicenseNumber(licenseNumber)) { setError('Invalid format. Use XX-XX-XXXXXXXX (e.g. 01-01-12345678)'); return }
        setError('')
        startLoadingMessages()
        await onSubmit(licenseNumber)
        stopLoadingMessages()
    }

    const isValid = validateLicenseNumber(licenseNumber)
    const progress = Math.min((licenseNumber.replace(/-/g, '').length / 12) * 100, 100)

    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e6ed',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            padding: '28px',
            marginBottom: '8px',
        }}>
            <form onSubmit={handleSubmit}>
                {/* Label */}
                <label style={{
                    display: 'block', fontSize: '12px', fontWeight: '700',
                    color: '#5a6478', letterSpacing: '0.07em',
                    textTransform: 'uppercase', marginBottom: '10px',
                }}>
                    Driving License Number
                </label>

                {/* Input row */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                    {/* Input with icon */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{
                            position: 'absolute', left: '14px', top: '50%',
                            transform: 'translateY(-50%)', pointerEvents: 'none',
                            color: focused ? '#003893' : '#9aa3b0',
                            transition: 'color 0.2s',
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2"/>
                                <line x1="2" y1="10" x2="22" y2="10"/>
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={licenseNumber}
                            onChange={handleInputChange}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            placeholder="01-01-12345678"
                            disabled={loading}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            maxLength={14}
                            style={{
                                width: '100%',
                                height: '52px',
                                paddingLeft: '44px',
                                paddingRight: '16px',
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                fontSize: '17px',
                                fontWeight: '600',
                                letterSpacing: '0.1em',
                                color: error ? '#c0392b' : '#1e2533',
                                background: error ? '#fdf3f2' : focused ? 'white' : '#f8f9fb',
                                border: `1.5px solid ${error ? '#f5c6c1' : focused ? '#003893' : '#e2e6ed'}`,
                                borderRadius: '10px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxShadow: focused ? '0 0 0 3px rgba(0, 56, 147, 0.1)' : 'none',
                                opacity: loading ? 0.6 : 1,
                            }}
                        />
                    </div>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={loading || !!error || !licenseNumber}
                        style={{
                            height: '52px',
                            padding: '0 24px',
                            background: loading || !!error || !licenseNumber ? '#9aa3b0' : '#003893',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: loading || !!error || !licenseNumber ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexShrink: 0,
                            transform: 'translateY(0)',
                        }}
                        onMouseEnter={e => {
                            if (!loading && !error && licenseNumber) {
                                (e.currentTarget as HTMLButtonElement).style.background = '#1a4da8'
                                ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,56,147,0.35)'
                            }
                        }}
                        onMouseLeave={e => {
                            ;(e.currentTarget as HTMLButtonElement).style.background = loading || error || !licenseNumber ? '#9aa3b0' : '#003893'
                            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
                        }}
                    >
                        {loading ? (
                            <>
                <span style={{
                    width: '16px', height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                    flexShrink: 0,
                }} />
                                Checking...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"/>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>
                                Check Status
                            </>
                        )}
                    </button>
                </div>

                {/* Progress bar */}
                {licenseNumber && !loading && (
                    <div style={{ marginTop: '10px', height: '3px', background: '#f0f4fc', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${progress}%`,
                            background: isValid ? '#0f7b4d' : error ? '#c0392b' : '#003893',
                            borderRadius: '2px',
                            transition: 'width 0.2s, background 0.2s',
                        }} />
                    </div>
                )}

                {/* Error / hint */}
                {error ? (
                    <p style={{ marginTop: '8px', fontSize: '12px', color: '#c0392b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {error}
                    </p>
                ) : loading ? (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} style={{
                                    width: '5px', height: '5px', background: '#003893', borderRadius: '50%',
                                    animation: `dotPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                                }} />
                            ))}
                        </div>
                        <span style={{ fontSize: '12px', color: '#5a6478', fontWeight: '500' }}>
              {LOADING_MESSAGES[loadingMsgIdx]}
            </span>
                    </div>
                ) : (
                    <p style={{ marginTop: '9px', fontSize: '12px', color: '#9aa3b0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        Format:{' '}
                        <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#f0f2f5', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', color: '#5a6478' }}>
                            XX-XX-XXXXXXXX
                        </code>
                        &nbsp;·&nbsp; Office–District–Unique Number
                    </p>
                )}
            </form>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dotPulse {
          0%, 60%, 100% { opacity: 0.3; transform: scale(1); }
          30% { opacity: 1; transform: scale(1.35); }
        }
      `}</style>
        </div>
    )
}