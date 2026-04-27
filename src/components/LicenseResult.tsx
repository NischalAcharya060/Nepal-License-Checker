'use client'

import { formatDate } from '@/utils/helpers'
import { SearchState, LicenseData } from '@/app/page'
import type { LicenseResultCopy } from '@/lib/uiCopy'

interface LicenseResultProps {
  state: SearchState
  result: LicenseData | null
  licenseNumber: string
  onCheckAnother: () => void
  copy: LicenseResultCopy
  dateLocale: string
}

function Field({ label, value, mono = false, fullWidth = false }: {
  label: string; value: string; mono?: boolean; fullWidth?: boolean
}) {
  return (
    <div className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 sm:p-4 ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className={`font-semibold leading-snug text-[var(--text-primary)] ${mono ? 'font-mono text-[14px] tracking-[0.06em]' : 'text-[15px]'}`}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function LicenseResult({ state, result, licenseNumber, onCheckAnother, copy, dateLocale }: LicenseResultProps) {

  if (state === 'error') {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--error-border)] bg-[var(--surface-primary)] shadow-sm">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[var(--error)] to-[#e74c3c] px-4 py-5 sm:px-6">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{copy.errorTitle}</h2>
            <p className="text-sm text-white/85">{copy.errorDescription}</p>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="mb-4 rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4">
            <p className="text-sm leading-6 text-[var(--warning-text)]">
              {copy.errorHintPrefix}{' '}
              <a href="https://dotm.gov.np/category/details-of-printed-licenses/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--nepal-blue)]">
                dotm.gov.np
              </a>{' '}
              {copy.errorHintSuffix}
            </p>
          </div>
          <CheckAnotherBtn onClick={onCheckAnother} label={copy.checkAnotherLabel} />
        </div>
      </div>
    )
  }

  if (state === 'not_found') {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[var(--error)] to-[#e74c3c] px-4 py-5 sm:px-6">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{copy.notFoundTitle}</h2>
            <p className="text-sm text-white/85">{copy.notFoundDescription}</p>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={copy.searchedLicenseLabel} value={licenseNumber} mono fullWidth />
            <div className="rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3.5 sm:col-span-2 sm:p-4">
              <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[#e57373]">
                {copy.printStatusLabel}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[var(--error)]" />
                <span className="text-sm font-bold text-[var(--error)]">{copy.notPrintedStatus}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4">
            <p className="mb-2 text-sm font-bold text-[var(--warning-text)]">
              {copy.possibleReasonsLabel}
            </p>
            <ul className="flex list-none flex-col gap-1.5">
              {copy.possibleReasons.map((reason, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[var(--warning-text)]">
                  <div className="h-1 w-1 flex-shrink-0 rounded-full bg-[#b8860b]/70" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nepal-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm leading-6 text-[var(--info-text)]">
              {copy.notFoundHintPrefix}{' '}
              <a href="https://dotm.gov.np/category/details-of-printed-licenses/" target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--nepal-blue)]">
                dotm.gov.np
              </a>
              {' '}{copy.notFoundHintSuffix}
            </p>
          </div>

          <CheckAnotherBtn onClick={onCheckAnother} label={copy.checkAnotherLabel} />
        </div>
      </div>
    )
  }

  if (state === 'found' && result) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--success-border)] bg-[var(--surface-primary)] shadow-sm">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[var(--success)] to-[#14a366] px-4 py-5 sm:px-6">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{copy.foundTitle}</h2>
            <p className="text-sm text-white/90">{copy.foundDescription}</p>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={copy.licenseHolderLabel} value={result.holder_name} fullWidth />
            <Field label={copy.licenseNumberLabel} value={result.license_number} mono />
            <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-3.5 sm:p-4">
              <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[#4caf8a]">
                {copy.statusLabel}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[var(--success)] shadow-[0_0_0_3px_rgba(15,123,77,0.2)]" />
                <span className="text-sm font-bold tracking-[0.04em] text-[var(--success)]">
                  {copy.printedStatus}
                </span>
              </div>
            </div>
            {result.office && <Field label={copy.issuingOfficeLabel} value={result.office} />}
            {result.category && <Field label={copy.vehicleCategoryLabel} value={result.category} />}
            {result.updatedAt && (
              <div className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 sm:p-4 ${result.office && result.category ? '' : 'sm:col-span-2'}`}>
                <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--text-muted)]">
                  {copy.recordUpdatedLabel}
                </div>
                <div className="text-sm font-semibold text-[var(--text-secondary)]">
                  {formatDate(result.updatedAt, dateLocale)}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nepal-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <div>
              <p className="mb-1 text-sm font-bold text-[var(--info-text)]">
                {copy.readyForCollectionTitle}
              </p>
              <p className="text-sm leading-6 text-[var(--info-text)]">
                {copy.readyForCollectionDescription}
              </p>
            </div>
          </div>

          <CheckAnotherBtn onClick={onCheckAnother} label={copy.checkAnotherLabel} />
        </div>
      </div>
    )
  }

  return null
}

function CheckAnotherBtn({ onClick, label }: { onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)]"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      {label}
    </button>
  )
}
