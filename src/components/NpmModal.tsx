'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { Language } from '@/lib/i18n'

interface NpmModalProps {
  isOpen: boolean
  onClose: () => void
  language: Language
}

type Registry = 'npm' | 'github'
type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'

export default function NpmModal({ isOpen, onClose, language }: NpmModalProps) {
  const [registry, setRegistry] = useState<Registry>('npm')
  const [packageManager, setPackageManager] = useState<PackageManager>('npm')
  const [copiedCmd, setCopiedCmd] = useState(false)
  const [copiedNpmrc, setCopiedNpmrc] = useState(false)
  const [activeTab, setActiveTab] = useState<'esm' | 'cjs'>('esm')

  if (!isOpen) return null

  const isNe = language === 'ne'
  const isGithub = registry === 'github'

  const pkgName = isGithub
    ? '@nischalacharya060/nepal-license-checker'
    : 'nepal-license-checker'

  const getInstallCmd = (pm: PackageManager) => {
    switch (pm) {
      case 'pnpm':
        return `pnpm add ${pkgName}`
      case 'yarn':
        return `yarn add ${pkgName}`
      case 'bun':
        return `bun add ${pkgName}`
      case 'npm':
      default:
        return `npm install ${pkgName}`
    }
  }

  const installCommand = getInstallCmd(packageManager)
  const npmrcContent = '@nischalacharya060:registry=https://npm.pkg.github.com'

  const copyInstall = () => {
    navigator.clipboard.writeText(installCommand)
    setCopiedCmd(true)
    toast.success(isNe ? 'कमान्ड कपी गरियो!' : 'Copied install command!')
    setTimeout(() => setCopiedCmd(false), 2000)
  }

  const copyNpmrc = () => {
    navigator.clipboard.writeText(npmrcContent)
    setCopiedNpmrc(true)
    toast.success(isNe ? '.npmrc कन्फिग कपी गरियो!' : 'Copied .npmrc config!')
    setTimeout(() => setCopiedNpmrc(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="npm-modal-title"
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-2xl animate-rise-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-red)]/10 via-[var(--nepal-blue)]/10 to-transparent p-5 sm:p-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--nepal-red)] text-white font-mono font-black text-sm shadow-sm shrink-0">
              {isGithub ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              ) : (
                'npm'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="npm-modal-title" className="text-base font-extrabold text-[var(--text-primary)] sm:text-lg">
                  {isNe ? 'विकासकर्ता SDK प्याकेज' : 'Developer SDK Packages'}
                </h2>
                <span className="rounded-full bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20">
                  v1.0.0
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {isNe
                  ? 'NPM वा GitHub Packages मार्फत नेपाल लाइसेन्स प्रमाणीकरण जोड्नुहोस्'
                  : 'Zero-dependency SDK available on both npm Registry and GitHub Packages'}
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
              🛡️ TypeScript (.d.ts)
            </span>
            <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-default)]">
              🇳🇵 Nepali (०-९) Numeral Support
            </span>
            <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)] border border-[var(--border-default)]">
              🌐 Node.js & Browser
            </span>
          </div>

          {/* Registry Source Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
              {isNe ? 'प्याकेज स्रोत (Package Registry):' : 'Package Registry:'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRegistry('npm')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition cursor-pointer ${
                  registry === 'npm'
                    ? 'border-[var(--nepal-red)] bg-[var(--nepal-red)]/10 text-[var(--nepal-red)] shadow-2xs'
                    : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="font-mono text-xs font-black">npm</span>
                <span>npm Registry</span>
                <span className="rounded bg-[var(--nepal-red)]/15 px-1.5 py-0.2 text-[9px] font-semibold">
                  Default
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRegistry('github')}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition cursor-pointer ${
                  registry === 'github'
                    ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] shadow-2xs'
                    : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub Packages</span>
              </button>
            </div>
          </div>

          {/* Install Command Box & Package Manager Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {isNe ? 'स्थापना (Installation):' : 'Installation Command:'}
              </label>
              <div className="flex rounded-lg border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                {(['npm', 'pnpm', 'yarn', 'bun'] as const).map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPackageManager(pm)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                      packageManager === pm
                        ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

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

          {/* GitHub Packages Extra Config Tip */}
          {isGithub && (
            <div className="rounded-xl border border-[var(--nepal-blue)]/20 bg-[var(--nepal-blue)]/5 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--nepal-blue)] flex items-center gap-1.5">
                  <span>ℹ️</span>
                  <span>{isNe ? '.npmrc कन्फिगरेसन (GitHub Packages को लागि)' : 'Optional .npmrc Configuration'}</span>
                </span>
                <button
                  type="button"
                  onClick={copyNpmrc}
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-primary)] border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] transition hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer"
                >
                  {copiedNpmrc ? '✓ Copied' : 'Copy line'}
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {isNe
                  ? 'आफ्नो प्रोजेक्टको .npmrc फाइलमा यो लाइन थप्नुहोस्:'
                  : 'Add this line to your project\'s .npmrc file to point the scope to GitHub Packages:'}
              </p>
              <pre className="overflow-x-auto rounded-lg bg-[var(--bg-secondary)] p-2 font-mono text-[10px] text-[var(--text-primary)] border border-[var(--border-default)]">
                <code>{npmrcContent}</code>
              </pre>
            </div>
          )}

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
{`import { checkLicense } from '${pkgName}';

const result = await checkLicense('01-01-12345678');

if (result.isReady) {
  console.log('Holder:', result.data.holder_name);
  console.log('Office:', result.data.office);
} else {
  console.log('License not printed yet.');
}`}
                </code>
              ) : (
                <code>
{`const { checkLicense } = require('${pkgName}');

checkLicense('01-01-12345678').then((result) => {
  if (result.isReady) {
    console.log('Holder:', result.data.holder_name);
  }
});`}
                </code>
              )}
            </pre>
          </div>

          {/* Action Links */}
          <div className="pt-2 flex flex-wrap gap-2 sm:gap-2.5">
            <a
              href="https://www.npmjs.com/package/nepal-license-checker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-xl bg-[var(--nepal-red)] px-3.5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95"
            >
              <span className="font-mono text-xs font-black">npm</span>
              <span>npm Registry ↗</span>
            </a>
            <a
              href="https://github.com/NischalAcharya060/Nepal-License-Checker/pkgs/npm/nepal-license-checker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 min-w-[140px] items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-xs font-bold text-[var(--text-primary)] shadow-xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub Packages ↗</span>
            </a>
            <a
              href="https://github.com/NischalAcharya060/Nepal-License-Checker/tree/master/packages/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-xs font-bold text-[var(--text-secondary)] shadow-xs transition hover:text-[var(--text-primary)] active:scale-95"
            >
              <span>Source & Docs ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
