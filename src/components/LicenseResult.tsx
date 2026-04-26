'use client'

import { formatDate } from '@/utils/helpers'
import { SearchState, LicenseData } from '@/app/page'

interface LicenseResultProps {
  state: SearchState
  result: LicenseData | null
  licenseNumber: string
  onCheckAnother: () => void
}

function Field({ label, value, mono = false, fullWidth = false }: {
  label: string; value: string; mono?: boolean; fullWidth?: boolean
}) {
  return (
    <div style={{
      background: '#f8f9fb',
      border: '1px solid #e2e6ed',
      borderRadius: '10px',
      padding: '14px 16px',
      gridColumn: fullWidth ? '1 / -1' : undefined,
    }}>
      <div style={{
        fontSize: '10px', fontWeight: '800', color: '#9aa3b0',
        letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: mono ? '14px' : '15px',
        fontFamily: mono ? "'JetBrains Mono', 'Fira Code', monospace" : "'Plus Jakarta Sans', sans-serif",
        fontWeight: '600',
        color: '#1e2533',
        letterSpacing: mono ? '0.06em' : undefined,
        lineHeight: 1.3,
      }}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function LicenseResult({ state, result, licenseNumber, onCheckAnother }: LicenseResultProps) {

  if (state === 'error') {
    return (
      <div style={{
        background: 'white', borderRadius: '16px',
        border: '1px solid #f5c6c1',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
          padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{
            width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Connection Error</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>Unable to reach DOTM records at this time</p>
          </div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <div style={{ background: '#fef9e7', border: '1px solid #f9e4a0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#7d5e00', lineHeight: 1.6 }}>
              Please try again in a moment. If the problem persists, visit{' '}
              <a href="https://dotm.gov.np/category/details-of-printed-licenses/" target="_blank" rel="noopener noreferrer" style={{ color: '#003893', fontWeight: '600' }}>
                dotm.gov.np
              </a>{' '}
              directly.
            </p>
          </div>
          <CheckAnotherBtn onClick={onCheckAnother} />
        </div>
      </div>
    )
  }

  if (state === 'not_found') {
    return (
      <div style={{
        background: 'white', borderRadius: '16px',
        border: '1px solid #e2e6ed',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
          padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{
            width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
              Not Yet Printed
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
              Not found in current DOTM printed records
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px'
          }}>
            <Field label="Searched License Number" value={licenseNumber} mono fullWidth />
            <div style={{
              background: '#fdf3f2', border: '1px solid #f5c6c1', borderRadius: '10px', padding: '14px 16px',
              gridColumn: '1 / -1',
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#e57373', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Print Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', background: '#c0392b', borderRadius: '50%' }} />
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#c0392b' }}>Not in printed records</span>
              </div>
            </div>
          </div>

          <div style={{
            background: '#fef9e7', border: '1px solid #f9e4a0',
            borderRadius: '10px', padding: '16px', marginBottom: '16px',
          }}>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#7d5e00', marginBottom: '10px' }}>
              Possible reasons:
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {[
                'Your license printing is still in progress',
                'The license number entered may be incorrect',
                'DOTM may not have published the latest batch yet',
                'Your district office may have a separate list',
              ].map((reason, i) => (
                <li key={i} style={{ fontSize: '13px', color: '#7d5e00', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '4px', background: '#b8860b', borderRadius: '50%', flexShrink: 0, opacity: 0.7 }} />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div style={{
            background: '#f0f4fc', border: '1px solid #c8d8f0',
            borderRadius: '10px', padding: '14px 16px',
            display: 'flex', gap: '12px', marginBottom: '20px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#003893" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style={{ fontSize: '13px', color: '#2d5fa8', lineHeight: 1.6 }}>
              Check again in a few days or contact your local transport office directly. You can also view the full printed list at{' '}
              <a href="https://dotm.gov.np/category/details-of-printed-licenses/" target="_blank" rel="noopener noreferrer" style={{ fontWeight: '700', color: '#003893' }}>
                dotm.gov.np
              </a>
            </p>
          </div>

          <CheckAnotherBtn onClick={onCheckAnother} />
        </div>
      </div>
    )
  }

  if (state === 'found' && result) {
    return (
      <div style={{
        background: 'white', borderRadius: '16px',
        border: '1px solid #b3dece',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {/* Success header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f7b4d 0%, #14a366 100%)',
          padding: '24px 28px', display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{
            width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <h2 style={{ color: 'white', fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
              License Printed & Ready!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
              Your smart card license has been printed
            </p>
          </div>
        </div>

        {/* Details */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <Field label="License Holder" value={result.holder_name} fullWidth />
            <Field label="License Number" value={result.license_number} mono />
            <div style={{
              background: '#edf7f2', border: '1px solid #b3dece',
              borderRadius: '10px', padding: '14px 16px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: '#4caf8a', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px' }}>
                Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', background: '#0f7b4d', borderRadius: '50%',
                  boxShadow: '0 0 0 3px rgba(15,123,77,0.2)',
                }} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f7b4d', letterSpacing: '0.04em' }}>
                  PRINTED
                </span>
              </div>
            </div>
            {result.office && <Field label="Issuing Office" value={result.office} />}
            {result.category && <Field label="Vehicle Category" value={result.category} />}
            {result.updatedAt && (
              <div style={{
                background: '#f8f9fb', border: '1px solid #e2e6ed', borderRadius: '10px', padding: '14px 16px',
                gridColumn: result.office && result.category ? undefined : '1 / -1',
              }}>
                <div style={{ fontSize: '10px', fontWeight: '800', color: '#9aa3b0', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Record Updated
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#5a6478' }}>
                  {formatDate(result.updatedAt)}
                </div>
              </div>
            )}
          </div>

          {/* Collection notice */}
          <div style={{
            background: '#f0f4fc', border: '1px solid #c8d8f0',
            borderRadius: '10px', padding: '16px',
            display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '20px',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003893" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#2d5fa8', marginBottom: '4px' }}>
                Ready for Collection
              </p>
              <p style={{ fontSize: '13px', color: '#2d5fa8', lineHeight: 1.6 }}>
                Visit your transport management office with original documents (citizenship card, old license, and payment receipt) to collect your smart card driving license.
              </p>
            </div>
          </div>

          <CheckAnotherBtn onClick={onCheckAnother} />
        </div>
      </div>
    )
  }

  return null
}

function CheckAnotherBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px',
        background: 'transparent',
        border: '1.5px solid #e2e6ed',
        borderRadius: '10px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: '14px',
        fontWeight: '600',
        color: '#5a6478',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
      onMouseEnter={e => {
        const btn = e.currentTarget as HTMLButtonElement
        btn.style.borderColor = '#003893'
        btn.style.color = '#003893'
        btn.style.background = '#f0f4fc'
      }}
      onMouseLeave={e => {
        const btn = e.currentTarget as HTMLButtonElement
        btn.style.borderColor = '#e2e6ed'
        btn.style.color = '#5a6478'
        btn.style.background = 'transparent'
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      Check Another License
    </button>
  )
}
