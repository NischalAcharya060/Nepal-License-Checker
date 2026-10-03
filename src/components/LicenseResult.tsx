'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { formatDate } from '@/utils/helpers'
import { getTransportOfficeByOfficeName } from '@/lib/offices'
import { parseCategoryCodes } from '@/lib/categories'
import { SearchState, LicenseData } from '@/app/page'
import type { LicenseResultCopy } from '@/lib/i18n'

interface LicenseResultProps {
  state: SearchState
  result: LicenseData | null
  licenseNumber: string
  onCheckAnother: () => void
  copy: LicenseResultCopy
  dateLocale: string
  language?: 'en' | 'ne'
}

function Field({
  label,
  value,
  mono = false,
  fullWidth = false,
  action,
}: {
  label: string
  value: string
  mono?: boolean
  fullWidth?: boolean
  action?: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 sm:p-4 ${fullWidth ? 'sm:col-span-2' : ''}`}>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--text-muted)]">
        <span>{label}</span>
        {action}
      </div>
      <div className={`font-semibold leading-snug text-[var(--text-primary)] ${mono ? 'font-mono text-[15px] tracking-[0.06em]' : 'text-[15px]'}`}>
        {value || '—'}
      </div>
    </div>
  )
}

export default function LicenseResult({
  state,
  result,
  licenseNumber,
  onCheckAnother,
  copy,
  dateLocale,
  language = 'en',
}: LicenseResultProps) {
  const [copied, setCopied] = useState(false)

  const officeInfo = getTransportOfficeByOfficeName(result?.office)
  const categoryList = parseCategoryCodes(result?.category || '')

  const displayOfficeName = officeInfo
    ? (language === 'ne' ? officeInfo.nameNe : officeInfo.nameEn)
    : (result?.office && result.office !== 'Unknown'
        ? result.office
        : (language === 'ne' ? 'यातायात व्यवस्था विभाग' : 'Department of Transport Management (DOTM)'))

  const handleCopyDetails = () => {
    if (!result) return
    const details = [
      `🇳🇵 Nepal Driving License Verification`,
      `License Number: ${result.license_number}`,
      `Name: ${result.holder_name}`,
      `Status: PRINTED & READY TO COLLECT`,
      `Office: ${displayOfficeName}`,
      `Category: ${result.category}`,
      `Verified via: license-checker.acharyanischal.com.np`,
    ].join('\n')

    navigator.clipboard.writeText(details).then(() => {
      setCopied(true)
      toast.success(copy.copyDetailsLabel + ' ' + (language === 'ne' ? 'भयो' : 'copied!'))
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleShare = async () => {
    if (!result) return
    const shareText = `🇳🇵 Nepal Smart Driving License Update:\nLicense No: ${result.license_number}\nHolder: ${result.holder_name}\nStatus: PRINTED & READY TO COLLECT!\nOffice: ${displayOfficeName}\n\nCheck your license at: https://license-checker.acharyanischal.com.np/?number=${encodeURIComponent(result.license_number)}`

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Nepal Driving License Status',
          text: shareText,
          url: `https://license-checker.acharyanischal.com.np/?number=${encodeURIComponent(result.license_number)}`,
        })
        return
      } catch {
        // User dismissed share
      }
    }

    navigator.clipboard.writeText(shareText)
    toast.success(language === 'ne' ? 'साझा गर्न लिङ्क प्रतिलिपि गरियो!' : 'Shareable link copied to clipboard!')
  }

  const handlePrint = () => {
    toast.dismiss()
    window.print()
  }

  // 1. Error state
  if (state === 'error') {
    return (
      <div className="animate-rise-in overflow-hidden rounded-2xl border border-[var(--error-border)] bg-[var(--surface-primary)] shadow-sm print:hidden">
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
        <div className="space-y-4 p-4 sm:p-6">
          <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4">
            <p className="text-sm leading-6 text-[var(--warning-text)]">
              {copy.errorHintPrefix}{' '}
              <a href="https://dotm.gov.np/category/details-of-printed-licenses/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--nepal-blue)] underline">
                dotm.gov.np
              </a>{' '}
              {copy.errorHintSuffix}
            </p>
          </div>
          <button
            onClick={onCheckAnother}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {copy.checkAnotherLabel}
          </button>
        </div>
      </div>
    )
  }

  // 2. Not Found state
  if (state === 'not_found') {
    return (
      <div className="animate-rise-in overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm print:hidden">
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#c0392b] to-[#d35400] px-4 py-5 sm:px-6">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/20">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{copy.notFoundTitle}</h2>
            <p className="text-sm text-white/90">{copy.notFoundDescription}</p>
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
                <span className="h-2 w-2 rounded-full bg-[var(--error)]" />
                <span className="text-sm font-bold text-[var(--error)]">{copy.notPrintedStatus}</span>
              </div>
            </div>
            {officeInfo && (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 sm:col-span-2 sm:p-4">
                <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--text-muted)]">
                  {copy.issuingOfficeLabel}
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {language === 'ne' ? officeInfo.nameNe : officeInfo.nameEn} ({language === 'ne' ? officeInfo.locationNe : officeInfo.locationEn})
                </div>
                {officeInfo.phone && (
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    {copy.officePhoneLabel}: <span className="font-mono">{officeInfo.phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4">
            <p className="mb-2.5 text-sm font-bold text-[var(--warning-text)]">
              {copy.possibleReasonsLabel}
            </p>
            <ul className="flex list-none flex-col gap-2">
              {copy.possibleReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-xs leading-5 text-[var(--warning-text)] sm:text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#b8860b]" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3 rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nepal-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs leading-5 text-[var(--info-text)] sm:text-sm">
              {copy.notFoundHintPrefix}{' '}
              <a href="https://dotm.gov.np/category/details-of-printed-licenses/" target="_blank" rel="noopener noreferrer" className="font-bold text-[var(--nepal-blue)] underline">
                dotm.gov.np
              </a>
              {' '}{copy.notFoundHintSuffix}
            </p>
          </div>

          <button
            onClick={onCheckAnother}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {copy.checkAnotherLabel}
          </button>
        </div>
      </div>
    )
  }

  // 3. Found state (Card is Printed!)
  if (state === 'found' && result) {
    const verifiedTimestamp = new Date().toLocaleString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    return (
      <>
        {/* ─── 1. INTERACTIVE SCREEN CARD (Visible on Screen, Hidden during Print) ─── */}
        <div className="animate-rise-in overflow-hidden rounded-2xl border border-[var(--success-border)] bg-[var(--surface-primary)] shadow-md print:hidden">
          {/* Verification banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[var(--success)] via-[#14a366] to-[#0d7348] px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/20 shadow-inner">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    {language === 'ne' ? 'प्रमाणीकृत' : 'OFFICIAL VERIFICATION'}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-white sm:text-xl">{copy.foundTitle}</h2>
                <p className="text-xs text-white/90 sm:text-sm">{copy.foundDescription}</p>
              </div>
            </div>

            <div className="hidden rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-right sm:block">
              <div className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                {language === 'ne' ? 'जाँच समय' : 'Verified At'}
              </div>
              <div className="font-mono text-xs font-semibold text-white">
                {verifiedTimestamp}
              </div>
            </div>
          </div>

          {/* Content Details */}
          <div className="space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label={copy.licenseHolderLabel}
                value={result.holder_name}
                fullWidth
                action={
                  <button
                    type="button"
                    onClick={handleCopyDetails}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--nepal-blue)] transition hover:underline"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    {copied ? (language === 'ne' ? 'प्रतिलिपि गरियो' : 'Copied!') : copy.copyDetailsLabel}
                  </button>
                }
              />
              <Field label={copy.licenseNumberLabel} value={result.license_number} mono />

              <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] p-3.5 sm:p-4">
                <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[#0f7b4d] dark:text-[#47c28a]">
                  {copy.statusLabel}
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)] shadow-[0_0_0_4px_rgba(15,123,77,0.2)] animate-glow-pulse" />
                  <span className="text-sm font-bold tracking-[0.04em] text-[var(--success)]">
                    {copy.printedStatus}
                  </span>
                </div>
              </div>

              {/* Issuing Office with full details */}
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 sm:col-span-2 sm:p-4">
                <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--text-muted)]">
                  {copy.issuingOfficeLabel}
                </div>
                <div className="text-[15px] font-bold text-[var(--text-primary)]">
                  {displayOfficeName}
                </div>
                {officeInfo && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                    <span>📍 {language === 'ne' ? officeInfo.addressNe : officeInfo.addressEn}</span>
                    {officeInfo.phone && <span>📞 {officeInfo.phone}</span>}
                    <span className="rounded bg-[var(--nepal-blue-soft)] px-2 py-0.5 font-semibold text-[var(--nepal-blue)]">
                      {language === 'ne' ? officeInfo.provinceNe : officeInfo.provinceEn}
                    </span>
                  </div>
                )}
              </div>

              {/* Category breakdown with icons and descriptions */}
              {categoryList.length > 0 && (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 sm:col-span-2 sm:p-4">
                  <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--text-muted)]">
                    {copy.categoryBreakdownTitle}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {categoryList.map((cat) => (
                      <div key={cat.code} className="flex items-center gap-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] p-2.5">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[var(--nepal-blue)] font-mono text-sm font-bold text-white">
                          {cat.code}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-[var(--text-primary)]">
                            {language === 'ne' ? cat.nameNe : cat.nameEn}
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] truncate">
                            {language === 'ne' ? cat.vehiclesNe : cat.vehiclesEn}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.updatedAt && (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 sm:col-span-2 sm:p-4">
                  <div className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.09em] text-[var(--text-muted)]">
                    {copy.recordUpdatedLabel}
                  </div>
                  <div className="text-sm font-semibold text-[var(--text-secondary)]">
                    {formatDate(result.updatedAt, dateLocale)}
                  </div>
                </div>
              )}
            </div>

            {/* Mandatory Documents Checklist */}
            <div className="rounded-xl border border-[var(--info-border)] bg-[var(--info-bg)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--nepal-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3 className="text-sm font-bold text-[var(--info-text)]">{copy.whatToBringTitle}</h3>
              </div>
              <ul className="space-y-1.5 pl-6 text-xs text-[var(--info-text)] sm:text-sm">
                {copy.requiredDocs.map((doc, idx) => (
                  <li key={idx} className="list-disc">
                    {doc}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action buttons toolbar: Print Slip, Share, Check Another */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl border border-[var(--nepal-blue)] bg-[var(--nepal-blue)] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-mid)] sm:text-sm"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                <span>{copy.printSlipLabel}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] shadow-sm transition hover:border-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] hover:text-[var(--nepal-blue)] sm:text-sm"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                <span>{copy.shareResultLabel}</span>
              </button>

              <button
                type="button"
                onClick={onCheckAnother}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-transparent px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] sm:text-sm"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>{copy.checkAnotherLabel}</span>
              </button>
            </div>

            {/* Quick non-official advisory */}
            <p className="pt-2 text-center text-[11px] text-[var(--text-muted)]">
              {language === 'ne'
                ? '⚠️ सूचना: यो गैर-सरकारी पोर्टल हो। प्रिन्ट गरिएको रसिद व्यक्तिगत जानकारीका लागि मात्र हो र यसलाई सवारी चालक अनुमतिपत्रको रूपमा ट्राफिक प्रहरीलाई देखाउन मिल्दैन।'
                : '⚠️ Notice: This is an unofficial portal. The printed slip is for personal reference only and cannot be presented to traffic police as a driving license.'}
            </p>
          </div>
        </div>

        {/* ─── 2. DEDICATED PRINT SLIP (Visible ONLY during print/PDF generation) ─── */}
        <div
          id="printable-verification-slip"
          className="hidden print:block w-full bg-white text-black p-0 font-sans"
          style={{ color: '#000000' }}
        >
          {/* Slip Header with Logo & Titles */}
          <div
            className="flex items-center justify-between pb-2 mb-2 border-b-2"
            style={{ borderColor: '#003893' }}
          >
            <div className="flex items-center gap-2.5">
              {/* Logo / Emblem */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/License-Checker-Nepal-logo.png"
                alt="Nepal License Checker Logo"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#003893' }}>
                  Public Record Search (dotm.gov.np) · गैर-सरकारी सूचना पोर्टल
                </div>
                <div className="text-sm font-black text-black leading-tight">
                  नेपाल सवारी चालक अनुमतिपत्र छपाइ स्थिति रसिद
                </div>
                <div className="text-[11px] font-bold text-gray-700 leading-tight">
                  Driving License Print Status Slip (Non-Official Personal Reference)
                </div>
              </div>
            </div>

            <div
              className="text-right py-1 px-2 rounded border"
              style={{ borderColor: '#000000', backgroundColor: '#f8fafc' }}
            >
              <div className="text-[8px] font-bold uppercase text-gray-600">Verification Date</div>
              <div className="font-mono text-[11px] font-bold text-black">{verifiedTimestamp}</div>
              <div className="text-[8px] font-bold text-red-700">Non-Government Portal</div>
            </div>
          </div>

          {/* CRITICAL LEGAL NOTICE / DISCLAIMER: NOT OFFICIAL & CANNOT BE SHOWN TO OFFICIALS */}
          <div
            className="py-1.5 px-2.5 rounded-md mb-2 border-2"
            style={{ borderColor: '#b91c1c', backgroundColor: '#fff5f5' }}
          >
            <div
              className="text-[11px] font-black uppercase tracking-wide flex items-center gap-1 pb-0.5 mb-1 border-b"
              style={{ borderColor: '#fca5a5', color: '#991b1b' }}
            >
              <span>⚠️</span>
              <span>महत्वपूर्ण कानूनी सूचना तथा अस्वीकरण (LEGAL NOTICE - NOT AN OFFICIAL DOCUMENT)</span>
            </div>
            <div className="space-y-0.5 text-[10px] leading-tight" style={{ color: '#111827' }}>
              <div className="flex items-start gap-1">
                <span className="font-bold text-red-700">१.</span>
                <span>
                  <strong className="text-red-900">गैर-सरकारी वेबसाइट:</strong> यो पोर्टल नेपाल सरकार वा यातायात व्यवस्था विभाग (DOTM) को आधिकारिक वेबसाइट होइन। यो केवल dotm.gov.np को सार्वजनिक छपाइ सूची खोज्न बनाइएको गैर-सरकारी पोर्टल हो।
                </span>
              </div>
              <div className="flex items-start gap-1">
                <span className="font-bold text-red-700">२.</span>
                <span>
                  <strong className="text-red-900">अधिकारी/ट्राफिकलाई देखाउन पूर्णतया अमान्य:</strong> यो रसिद वा प्रिन्ट गरिएको PDF लाई <u>आधिकारिक सवारी चालक अनुमतिपत्र (Driving License), अस्थायी परमिट, वा कानूनी कागजातको रूपमा कुनै पनि ट्राफिक प्रहरी वा सरकारी अधिकारीलाई देखाउन वा प्रयोग गर्न पाइँदैन</u>।
                </span>
              </div>
              <div className="flex items-start gap-1">
                <span className="font-bold text-red-700">3.</span>
                <span className="text-gray-800">
                  <strong className="text-black">Informational Use Only:</strong> Holds NO legal validity. Cannot substitute a physical smart driving license or be shown to traffic police as a driving permit.
                </span>
              </div>
            </div>
          </div>

          {/* Prominent Verification Status Box */}
          <div
            className="py-1.5 px-2.5 rounded-lg mb-2 flex items-center justify-between border-2"
            style={{ borderColor: '#0f7b4d', backgroundColor: '#edf7f2' }}
          >
            <div>
              <div className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: '#0f7b4d' }}>
                DOTM Public Record Status (छपाइ अवस्था)
              </div>
              <div className="text-xs font-black text-black mt-0.5">
                ✓ PRINTED & READY FOR COLLECTION (छापिएको छ · बुझिलिन तयार)
              </div>
            </div>
            <div
              className="text-[11px] font-black px-2 py-0.5 rounded border"
              style={{ borderColor: '#0f7b4d', backgroundColor: '#ffffff', color: '#0f7b4d' }}
            >
              RECORD FOUND
            </div>
          </div>

          {/* Main License Data Table */}
          <table
            className="w-full border-collapse mb-2 text-[11px]"
            style={{ border: '1.5px solid #000000', tableLayout: 'fixed', width: '100%', boxSizing: 'border-box' }}
          >
            <tbody>
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <td
                  className="py-1.5 px-2 font-bold w-[32%] break-words"
                  style={{ backgroundColor: '#f1f5f9', borderRight: '1px solid #d1d5db', color: '#1e293b' }}
                >
                  License Number (अनुमतिपत्र नम्बर)
                </td>
                <td className="py-1.5 px-2 font-mono text-sm font-black tracking-wider text-black w-[68%] break-words">
                  {result.license_number}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <td
                  className="py-1.5 px-2 font-bold w-[32%] break-words"
                  style={{ backgroundColor: '#f1f5f9', borderRight: '1px solid #d1d5db', color: '#1e293b' }}
                >
                  License Holder Name (अनुमतिपत्र बाहकको नाम)
                </td>
                <td className="py-1.5 px-2 font-bold text-xs text-black uppercase w-[68%] break-words">
                  {result.holder_name}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <td
                  className="py-1.5 px-2 font-bold w-[32%] break-words"
                  style={{ backgroundColor: '#f1f5f9', borderRight: '1px solid #d1d5db', color: '#1e293b' }}
                >
                  Issuing Transport Office (यातायात कार्यालय)
                </td>
                <td className="py-1.5 px-2 text-black w-[68%] break-words">
                  <div className="font-bold text-xs">{displayOfficeName}</div>
                  {officeInfo && (
                    <div className="text-[10px] text-gray-700 mt-0.5 break-words leading-tight">
                      📍 {officeInfo.addressEn} ({officeInfo.addressNe})
                      {officeInfo.phone && ` · 📞 ${officeInfo.phone}`}
                      {officeInfo.provinceEn && ` · 🏛️ ${officeInfo.provinceEn}`}
                    </div>
                  )}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                <td
                  className="py-1.5 px-2 font-bold w-[32%] break-words"
                  style={{ backgroundColor: '#f1f5f9', borderRight: '1px solid #d1d5db', color: '#1e293b' }}
                >
                  Vehicle Category (स्वीकृत सवारी वर्ग)
                </td>
                <td className="py-1.5 px-2 text-black w-[68%] break-words">
                  <div className="font-mono text-xs font-black text-black">
                    {result.category || '—'}
                  </div>
                  {categoryList.length > 0 && (
                    <ul className="text-[10px] text-gray-800 list-disc pl-3.5 space-y-0.5 mt-0.5">
                      {categoryList.map((cat) => (
                        <li key={cat.code}>
                          <strong>Category {cat.code}:</strong> {cat.nameEn} ({cat.nameNe})
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
              {result.updatedAt && (
                <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                  <td
                    className="py-1.5 px-2 font-bold w-[32%] break-words"
                    style={{ backgroundColor: '#f1f5f9', borderRight: '1px solid #d1d5db', color: '#1e293b' }}
                  >
                    DOTM Record Date (अभिलेख मिति)
                  </td>
                  <td className="py-1.5 px-2 font-medium text-black w-[68%] break-words">
                    {formatDate(result.updatedAt, 'en-NP')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mandatory Documents Checklist */}
          <div
            className="py-1.5 px-2.5 rounded-lg mb-2 border"
            style={{ borderColor: '#000000', backgroundColor: '#fafafa' }}
          >
            <div className="font-bold text-[11px] uppercase tracking-wide text-black mb-1">
              Mandatory Documents Required for Collection (लाइसेन्स बुझ्दा अनिवार्य लैजानुपर्ने कागजातहरू):
            </div>
            <div className="space-y-0.5 text-[10px] text-black">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 border rounded-sm"
                  style={{ borderColor: '#000000' }}
                />
                <span>1. Original Nepali Citizenship Card (सक्कल नेपाली नागरिकता प्रमाणपत्र)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 border rounded-sm"
                  style={{ borderColor: '#000000' }}
                />
                <span>2. Original Revenue / Payment Receipt (राजस्व दस्तुर तिरेको सक्कल रसिद)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-3 h-3 border rounded-sm"
                  style={{ borderColor: '#000000' }}
                />
                <span>3. Previous Driving License Card (पुरानो सवारी चालक अनुमतिपत्र - नवीकरण वा वर्ग थप भएमा)</span>
              </div>
            </div>
          </div>

          {/* Slip Footer with Verification URL and Legal Disclaimer */}
          <div
            className="pt-1.5 text-[8.5px] text-gray-700 flex justify-between items-end border-t"
            style={{ borderColor: '#94a3b8' }}
          >
            <div>
              <p className="font-bold text-red-800">
                ⚠️ कानूनी सूचना: यो गैर-सरकारी रसिद सवारी साधन चलाउन, कानूनी प्रमाणको रूपमा, वा ट्राफिक प्रहरीलाई देखाउन अमान्य छ।
              </p>
              <p className="font-semibold text-gray-800 mt-0.5">
                Public Data Source: Department of Transport Management (DOTM, dotm.gov.np) · Online: https://license-checker.acharyanischal.com.np/?number={result.license_number}
              </p>
            </div>
            <div className="text-right font-mono text-[8.5px] text-gray-600 whitespace-nowrap pl-2">
              Slip Generated: {verifiedTimestamp}
            </div>
          </div>
        </div>
      </>
    )
  }

  return null
}
