'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { Language } from '@/lib/i18n'

interface NpmModalProps {
  isOpen: boolean
  onClose: () => void
  language: Language
}

export default function NpmModal({ isOpen, onClose, language }: NpmModalProps) {
  const [copiedCmd, setCopiedCmd] = useState(false)
  const [activeTab, setActiveTab] = useState<'esm' | 'cjs'>('esm')

  if (!isOpen) return null

  const installCommand = 'npm install nepal-license-checker'

  const copyInstall = () => {
    navigator.clipboard.writeText(installCommand)
    setCopiedCmd(true)
    toast.success(language === 'ne' ? 'कमान्ड कपी गरियो!' : 'Copied to clipboard!')
    setTimeout(() => setCopiedCmd(false), 2000)
  }

  const isNe = language === 'ne'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="npm-modal-title"
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-2xl animate-rise-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-red)]/10 via-[var(--nepal-blue)]/10 to-transparent p-5 sm:p-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--nepal-red)] text-white font-mono font-black text-sm shadow-sm shrink-0">
              npm
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="npm-modal-title" className="text-base font-extrabold text-[var(--text-primary)] sm:text-lg">
                  {isNe ? 'विकासकर्ता (Developer) NPM प्याकेज' : 'Developer NPM Package'}
                </h2>
                <span className="rounded-full bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20">
                  v1.0.0
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {isNe
                  ? 'आफ्नो वेबसाइट वा एपमा नेपाल लाइसेन्स प्रमाणीकरण सिधै जोड्नुहोस्'
                  : 'Zero-dependency JavaScript & TypeScript SDK for checking Nepal licenses'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition border border-[var(--border-default)] cursor-pointer"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {/* Quick Badges */}
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-default)]">
              ⚡ Zero Dependencies
            </span>
            <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-default)]">
              🛡️ TypeScript (.d.ts) Included
            </span>
            <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-default)]">
              🇳🇵 Nepali (०-९) Numeral Support
            </span>
            <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-default)]">
              🌐 Node.js & Browser
            </span>
          </div>

          {/* Install Command Box */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
              {isNe ? 'स्थापना (Installation):' : 'Installation:'}
            </label>
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 font-mono text-xs text-[var(--text-primary)] shadow-2xs">
              <span className="select-all truncate">
                <span className="text-[var(--text-muted)] select-none mr-2">$</span>
                {installCommand}
              </span>
              <button
                type="button"
                onClick={copyInstall}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-default)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-primary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 shrink-0 cursor-pointer"
              >
                {copiedCmd ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)]">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{isNe ? 'कपी भयो' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{isNe ? 'कपी' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code Example Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {isNe ? 'प्रयोगको उदाहरण (Quickstart):' : 'Usage Example:'}
              </span>
              <div className="flex rounded-lg border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                <button
                  type="button"
                  onClick={() => setActiveTab('esm')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    activeTab === 'esm'
                      ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  ESM / TypeScript
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cjs')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    activeTab === 'cjs'
                      ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  CommonJS
                </button>
              </div>
            </div>

            <pre className="overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 font-mono text-[11px] leading-relaxed text-[var(--text-primary)]">
              {activeTab === 'esm' ? (
                <code>
{`import { checkLicense } from 'nepal-license-checker';

const result = await checkLicense('01-01-12345678');

if (result.isReady) {
  console.log('Printed for:', result.data.holder_name);
  console.log('Office:', result.data.office);
} else {
  console.log('License not printed yet.');
}`}
                </code>
              ) : (
                <code>
{`const { checkLicense } = require('nepal-license-checker');

checkLicense('01-01-12345678').then((result) => {
  if (result.isReady) {
    console.log('Printed for:', result.data.holder_name);
  }
});`}
                </code>
              )}
            </pre>
          </div>

          {/* Action Links */}
          <div className="pt-2 flex flex-wrap gap-2.5">
            <a
              href="https://www.npmjs.com/package/nepal-license-checker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--nepal-red)] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95"
            >
              <span>View on npmjs.com ↗</span>
            </a>
            <a
              href="https://github.com/NischalAcharya060/Nepal-License-Checker/tree/master/packages/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2.5 text-xs font-bold text-[var(--text-primary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95"
            >
              <span>GitHub SDK Docs ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
