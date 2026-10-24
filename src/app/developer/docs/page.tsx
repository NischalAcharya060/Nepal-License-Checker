// src/app/developer/docs/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  validateLicenseNumber,
  formatLicenseNumber,
  devanagariToAsciiDigits,
  asciiToDevanagariDigits,
} from '../../../../packages/sdk/src/utils'
import { useNpmStats } from '@/components/developer/NpmStatsProvider'
import {
  formatBytes,
  formatDownloads,
  NPM_BUNDLEPHOBIA_URL,
  NPM_REGISTRY_URL,
  SDK_LICENSE_URL,
} from '@/lib/sdkMeta'

/**
 * Self-contained shields-style badge.
 * Rendered locally (instead of an external shields.io <img>) so it can never
 * break, show raw alt text, or display upstream errors such as
 * "rate limited by upstream service".
 */
function FlatBadge({
  label,
  value,
  color,
  href,
  title,
}: {
  label: string
  value: string
  color: string
  href?: string
  title?: string
}) {
  const badge = (
    <span
      className="inline-flex h-5 items-stretch overflow-hidden rounded-[3px] text-[11px] font-semibold leading-none shadow-2xs ring-1 ring-black/10 dark:ring-white/10"
      title={title}
    >
      <span className="flex items-center bg-[#555] px-1.5 text-white/90">{label}</span>
      <span className="flex items-center px-1.5 text-white" style={{ backgroundColor: color }}>
        {value}
      </span>
    </span>
  )

  if (!href) return badge

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:opacity-85 transition"
      title={title}
      aria-label={title}
    >
      {badge}
    </a>
  )
}

export default function SdkDocumentationPage() {
  const npmStats = useNpmStats()
  const [selectedLang, setSelectedLang] = useState<'ts' | 'php' | 'python'>('ts')
  const [activeInstallTab, setActiveInstallTab] = useState<'npm' | 'pnpm' | 'yarn' | 'bun' | 'github'>('npm')
  const [activeUsageTab, setActiveUsageTab] = useState<'esm' | 'cjs' | 'nextjs'>('esm')
  const [activePhpTab, setActivePhpTab] = useState<'pure' | 'laravel'>('pure')
  const [activePythonTab, setActivePythonTab] = useState<'basic' | 'fastapi'>('basic')
  const [copiedSection, setCopiedSection] = useState<string | null>(null)

  // Interactive Live Playground states
  const [testInput, setTestInput] = useState('०१-०२-१२३४५६७८')

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedSection(id)
    toast.success('Snippet copied to clipboard!')
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const getInstallCmd = () => {
    switch (activeInstallTab) {
      case 'pnpm':
        return 'pnpm add nepal-license-checker'
      case 'yarn':
        return 'yarn add nepal-license-checker'
      case 'bun':
        return 'bun add nepal-license-checker'
      case 'github':
        return 'npm install @nischalacharya060/nepal-license-checker'
      case 'npm':
      default:
        return 'npm install nepal-license-checker'
    }
  }

  const normalizedInput = devanagariToAsciiDigits(testInput).trim()
  const isValidFormat = validateLicenseNumber(testInput)
  const formattedExample = formatLicenseNumber(testInput)
  const nepaliDigits = asciiToDevanagariDigits(normalizedInput)

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 sm:px-6 sm:py-12 text-[var(--text-primary)] transition-colors">
      {/* Ambient Glow */}
      <div
        className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 h-96 w-full max-w-5xl rounded-full bg-gradient-to-br from-[var(--nepal-blue)]/15 via-[var(--nepal-red)]/10 to-transparent blur-3xl opacity-75"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl space-y-10">
        {/* Navigation Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-default)] pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition group"
            >
              <span className="transition-transform group-hover:-translate-x-0.5">←</span>
              <span>Home</span>
            </Link>
            <span className="text-[var(--border-default)]">/</span>
            <Link
              href="/developer"
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition"
            >
              Developer Platform
            </Link>
            <span className="text-[var(--border-default)]">/</span>
            <span className="text-xs font-bold text-[var(--text-primary)]">SDK Documentation</span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/developer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10 px-3 py-1.5 text-xs font-bold text-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)] hover:text-white transition shadow-2xs"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>Get API Key (60 req/min)</span>
            </Link>
            <a
              href="https://www.npmjs.com/package/nepal-license-checker"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shadow-2xs"
            >
              npm Registry ↗
            </a>
          </div>
        </header>

        {/* Hero Title Section */}
        <div className="space-y-4">
          {/* Live npm Badges & Ecosystem Tags */}
          <div className="flex flex-wrap items-center gap-2">
            <FlatBadge
              label="npm"
              value={`v${npmStats.version}`}
              color="#cb3837"
              href={NPM_REGISTRY_URL}
              title={`npm version ${npmStats.version}`}
            />
            <FlatBadge
              label="downloads"
              value={formatDownloads(npmStats.weeklyDownloads)}
              color="#0066cc"
              href={NPM_REGISTRY_URL}
              title="Weekly npm downloads"
            />
            <FlatBadge
              label="minzipped"
              value={formatBytes(npmStats.minzippedBytes)}
              color="#2ea44f"
              href={NPM_BUNDLEPHOBIA_URL}
              title="Bundle size (minzipped)"
            />
            <FlatBadge
              label="license"
              value={npmStats.license}
              color="#8957e5"
              href={SDK_LICENSE_URL}
              title={`${npmStats.license} License`}
            />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] shadow-2xs">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--nepal-blue)]" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>
                {npmStats.dependencyCount === 0
                  ? 'Zero Dependencies'
                  : `${npmStats.dependencyCount} Dependencies`}
              </span>
            </span>
            <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)] shadow-2xs">
              Nepali (०-९) Digits
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Official SDKs & API Developer Documentation
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Production-ready zero-dependency client SDKs for <strong>TypeScript/Node.js</strong>, <strong>PHP/Laravel</strong>, and <strong>Python</strong> to query smart driving license print status via the mirrored Department of Transport Management (DOTM) database in Nepal. Includes full <strong>OpenAPI 3.1</strong> specifications and a 1-click <strong>Postman Collection</strong>.
          </p>
        </div>

        {/* Quick Jump Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs shadow-2xs">
          <span className="font-bold text-[var(--text-muted)] text-[11px] uppercase tracking-wider mr-1">Jump to:</span>
          <a href="#openapi-postman" className="rounded-lg bg-orange-500/10 px-2.5 py-1 font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition">Postman & OpenAPI</a>
          <a href="#installation" className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition">Installation</a>
          <a href="#quickstart" className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition">Quickstart</a>
          <a href="#api-key" className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition">API Key & Limits</a>
          <a href="#utilities" className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition">Offline Utilities</a>
          <a href="#playground" className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition">Live Tester</a>
          <a href="#types" className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition">Types & Interfaces</a>
          <a href="#http-api" className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 font-medium text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition">HTTP REST API</a>
        </div>

        {/* Section 0: Interactive OpenAPI 3.1 & Postman Suite */}
        <section id="openapi-postman" className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-7 shadow-sm space-y-4 scroll-mt-20">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 opacity-80" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-bold text-orange-600 dark:text-orange-400">
                <span className="font-mono text-xs font-black">P</span>
                <span>Instant API Testing & Tools</span>
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                One-Click Postman Collection & OpenAPI 3.1 Suite
              </h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-xl leading-relaxed">
                Test our endpoints with zero configuration. Import our pre-configured Postman collection with environment variables, or download the formal OpenAPI 3.1 JSON specification.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href="/api/developer/openapi?format=postman&download=1"
                download="nepal-license-checker-postman.json"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3.5 py-2 text-xs font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-500 hover:text-white transition active:scale-95 shadow-2xs cursor-pointer"
                title="Download Postman Collection v2.1"
              >
                <span className="font-mono text-sm font-black leading-none">P</span>
                <span>Download Postman (.json)</span>
              </a>

              <a
                href="/api/developer/openapi?download=1"
                download="nepal-license-checker-openapi.json"
                className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white transition active:scale-95 shadow-2xs cursor-pointer"
                title="Download OpenAPI 3.1 Spec in JSON"
              >
                <span className="font-mono text-xs font-black leading-none">&#123;&#125;</span>
                <span>Download OpenAPI 3.1 (.json)</span>
              </a>

              <a
                href="/api/developer/openapi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition shadow-2xs"
                title="View Raw OpenAPI JSON schema in browser"
              >
                <span>Raw Spec ↗</span>
              </a>
            </div>
          </div>
        </section>

        {/* Multi-Language SDK Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2 sm:p-2.5 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-2">SDK Ecosystem:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedLang('ts')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedLang === 'ts'
                    ? 'bg-[var(--nepal-blue)] text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span>TypeScript / Node.js</span>
                <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${selectedLang === 'ts' ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}`}>npm</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLang('php')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedLang === 'php'
                    ? 'bg-[var(--nepal-blue)] text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span>PHP & Laravel</span>
                <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${selectedLang === 'php' ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}`}>Composer</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLang('python')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  selectedLang === 'python'
                    ? 'bg-[var(--nepal-blue)] text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
              >
                <span>Python</span>
                <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${selectedLang === 'python' ? 'bg-white/20' : 'bg-[var(--bg-secondary)]'}`}>pip</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 1: Installation */}
        <section id="installation" className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-4 shadow-sm scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>1.</span>
                <span>
                  {selectedLang === 'ts'
                    ? 'Installation (Node.js & TypeScript)'
                    : selectedLang === 'php'
                    ? 'Installation (PHP & Laravel)'
                    : 'Installation (Python)'}
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {selectedLang === 'ts'
                  ? 'Install from the official npm Registry or GitHub Packages.'
                  : selectedLang === 'php'
                  ? 'Install via Composer for standard PHP or Laravel applications.'
                  : 'Install from PyPI using pip.'}
              </p>
            </div>

            {selectedLang === 'ts' && (
              <div className="flex rounded-xl border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                {(['npm', 'pnpm', 'yarn', 'bun', 'github'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveInstallTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                      activeInstallTab === tab
                        ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab === 'github' ? 'GitHub Pkg' : tab}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 font-mono text-xs select-all text-[var(--text-primary)]">
              <span>
                <span className="text-[var(--text-muted)] select-none mr-2">$</span>
                {selectedLang === 'ts'
                  ? getInstallCmd()
                  : selectedLang === 'php'
                  ? 'composer require nepal-license-checker/nepal-license-checker'
                  : 'pip install nepal-license-checker'}
              </span>
              <button
                type="button"
                onClick={() =>
                  copyCode(
                    selectedLang === 'ts'
                      ? getInstallCmd()
                      : selectedLang === 'php'
                      ? 'composer require nepal-license-checker/nepal-license-checker'
                      : 'pip install nepal-license-checker',
                    'install'
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer"
              >
                {copiedSection === 'install' ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)]" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-[var(--success)]">Copied</span>
                  </>
                ) : (
                  <span>Copy</span>
                )}
              </button>
            </div>
          </div>

          {selectedLang === 'ts' && activeInstallTab === 'github' && (
            <div className="rounded-2xl border border-[var(--nepal-blue)]/20 bg-[var(--nepal-blue)]/5 p-4 text-xs space-y-2">
              <span className="font-bold text-[var(--nepal-blue)] block">GitHub Packages Scope Configuration:</span>
              <p className="text-[var(--text-secondary)]">
                Add this line to your project&apos;s <code className="font-mono bg-[var(--surface-primary)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">.npmrc</code> file to route the scope to GitHub Packages:
              </p>
              <pre className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-2.5 font-mono text-[11px]">
                <code>@nischalacharya060:registry=https://npm.pkg.github.com</code>
              </pre>
            </div>
          )}
        </section>

        {/* Section 2: Quickstart */}
        <section id="quickstart" className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-5 shadow-sm scroll-mt-20">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span>2.</span>
                <span>
                  {selectedLang === 'ts'
                    ? 'Quickstart & Usage (JavaScript / TypeScript)'
                    : selectedLang === 'php'
                    ? 'Quickstart & Usage (PHP & Laravel)'
                    : 'Quickstart & Usage (Python)'}
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {selectedLang === 'ts'
                  ? 'Core client function checkLicense() normalizes numerals and verifies print status.'
                  : selectedLang === 'php'
                  ? 'Use LicenseChecker::check() or native Laravel Facade LicenseChecker::checkLicense().'
                  : 'Call check_license() with standard library zero-dependency networking.'}
              </p>
            </div>

            {selectedLang === 'ts' && (
              <div className="flex rounded-xl border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                {(['esm', 'cjs', 'nextjs'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveUsageTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeUsageTab === tab
                        ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab === 'esm' ? 'ESM / TypeScript' : tab === 'cjs' ? 'CommonJS' : 'Next.js / React'}
                  </button>
                ))}
              </div>
            )}

            {selectedLang === 'php' && (
              <div className="flex rounded-xl border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                {(['pure', 'laravel'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivePhpTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activePhpTab === tab
                        ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab === 'pure' ? 'Pure PHP 8+' : 'Laravel 10 / 11'}
                  </button>
                ))}
              </div>
            )}

            {selectedLang === 'python' && (
              <div className="flex rounded-xl border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                {(['basic', 'fastapi'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivePythonTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activePythonTab === tab
                        ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab === 'basic' ? 'Standard Python' : 'FastAPI / Web'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <pre className="overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 sm:p-5 font-mono text-xs leading-relaxed text-[var(--text-primary)]">
              {selectedLang === 'ts' && activeUsageTab === 'esm' && (
                <code>
{`import { checkLicense } from 'nepal-license-checker';

async function checkMyLicense() {
  // Supports English (01-01-12345678) or Nepali digits (०१-०१-१२३४५६७८)
  const result = await checkLicense('01-01-12345678', {
    apiKey: 'nlc_live_your_api_key_here', // Optional: unlocks 60 req/min
  });

  if (result.status === 'success') {
    if (result.isReady && result.data) {
      console.log('🎉 License is printed and ready for pickup!');
      console.log('Holder Name:', result.data.holder_name);
      console.log('Office:     ', result.data.office);
      console.log('Category:   ', result.data.category);
    } else {
      console.log('⏳ License is not yet printed by DOTM.');
    }
  } else {
    console.error('Error:', result.error);
    if (result.statusCode === 429) {
      console.log('Wait seconds before retrying:', result.retryAfter);
    }
  }
}

checkMyLicense();`}
                </code>
              )}

              {selectedLang === 'ts' && activeUsageTab === 'cjs' && (
                <code>
{`const { checkLicense } = require('nepal-license-checker');

checkLicense('०१-०१-१२३४५६७८', {
  apiKey: 'nlc_live_your_api_key_here',
}).then((result) => {
  if (result.status === 'success' && result.isReady) {
    console.log('Holder:', result.data.holder_name);
    console.log('Office:', result.data.office);
  } else {
    console.log(result.message || result.error);
  }
});`}
                </code>
              )}

              {selectedLang === 'ts' && activeUsageTab === 'nextjs' && (
                <code>
{`// app/actions.ts (Next.js Server Action)
'use server'

import { checkLicense } from 'nepal-license-checker';

export async function lookupLicense(licenseNumber: string) {
  return await checkLicense(licenseNumber, {
    apiKey: process.env.LICENSE_CHECKER_API_KEY,
  });
}`}
                </code>
              )}

              {selectedLang === 'php' && activePhpTab === 'pure' && (
                <code>
{`<?php
require_once __DIR__ . '/vendor/autoload.php';

use NepalLicenseChecker\\LicenseChecker;

// 1. Basic lookup (accepts English or Devanagari numerals)
$result = LicenseChecker::check('01-01-12345678', 'nlc_live_your_api_key_here');

if ($result['is_ready']) {
    echo "🎉 Ready for pickup!\\n";
    echo "Holder: " . $result['data']['holder_name'] . "\\n";
    echo "Office: " . $result['data']['office'] . "\\n";
} else {
    echo "⏳ License is not printed yet by DOTM.\\n";
}`}
                </code>
              )}

              {selectedLang === 'php' && activePhpTab === 'laravel' && (
                <code>
{`<?php
namespace App\\Http\\Controllers;

use Illuminate\\Http\\Request;
use NepalLicenseChecker\\Laravel\\Facades\\LicenseChecker;

class LicenseVerificationController extends Controller
{
    public function verify(Request $request)
    {
        $validated = $request->validate([
            'number' => 'required|string',
        ]);

        $res = LicenseChecker::checkLicense($validated['number']);

        if ($res['is_ready']) {
            return response()->json([
                'status' => 'verified',
                'holder' => $res['data']['holder_name'],
                'office' => $res['data']['office'],
            ]);
        }

        return response()->json([
            'status' => 'pending',
            'message' => 'License card not printed yet.',
        ], 404);
    }
}`}
                </code>
              )}

              {selectedLang === 'python' && activePythonTab === 'basic' && (
                <code>
{`from nepal_license_checker import check_license

# Zero dependencies! Standard library urllib powered.
result = check_license(
    "01-01-12345678",
    api_key="nlc_live_your_api_key_here"  # Optional elevated quota
)

if result["is_ready"]:
    data = result["data"]
    print("🎉 License is ready for pickup!")
    print(f"Holder: {data.get('holder_name')}")
    print(f"Office: {data.get('office')}")
    if result.get("rate_limit"):
        print(f"Quota Remaining: {result['rate_limit']['remaining']}")
else:
    print("⏳ License is not printed yet.")`}
                </code>
              )}

              {selectedLang === 'python' && activePythonTab === 'fastapi' && (
                <code>
{`from fastapi import FastAPI, HTTPException
from nepal_license_checker import check_license, validate_license_number

app = FastAPI(title="Nepal License Gateway")

@app.get("/verify/{license_number}")
def verify_license(license_number: str):
    if not validate_license_number(license_number):
        raise HTTPException(status_code=400, detail="Invalid license format. Expected XX-XX-XXXXXXXX")

    res = check_license(license_number)
    if not res["is_ready"]:
        return {"status": "pending", "message": "License not ready yet"}
    
    return {"status": "ready", "data": res["data"]}`}
                </code>
              )}
            </pre>
            <button
              type="button"
              onClick={() => {
                let snippet = ''
                if (selectedLang === 'ts') {
                  snippet = `import { checkLicense } from 'nepal-license-checker';\nconst result = await checkLicense('01-01-12345678');\nconsole.log(result);`
                } else if (selectedLang === 'php') {
                  snippet = `use NepalLicenseChecker\\LicenseChecker;\n$res = LicenseChecker::check('01-01-12345678');\nprint_r($res);`
                } else {
                  snippet = `from nepal_license_checker import check_license\nres = check_license('01-01-12345678')\nprint(res)`
                }
                copyCode(snippet, 'quickstart')
              }}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer shadow-2xs"
            >
              {copiedSection === 'quickstart' ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)]" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-[var(--success)]">Copied</span>
                </>
              ) : (
                <span>Copy</span>
              )}
            </button>
          </div>
        </section>

        {/* Section 3: API Key & Rate Limits */}
        <section id="api-key" className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-5 shadow-sm scroll-mt-20">
          <div className="border-b border-[var(--border-default)] pb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>3.</span>
              <span>API Key Authentication & Rate Limits</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Unlock higher throughput for production apps and bots.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 space-y-2">
              <span className="font-bold text-xs text-[var(--text-muted)] uppercase tracking-wider">Public Anonymous Tier</span>
              <p className="text-xl font-black text-[var(--text-primary)]">15 req / min</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Applied per client IP. If exceeded, a 5-minute spam lockout is applied. Ideal for individual manual lookups.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--nepal-blue)]/40 bg-[var(--nepal-blue)]/5 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--nepal-blue)] uppercase tracking-wider">Developer API Key Tier</span>
                <span className="rounded bg-[var(--nepal-blue)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)]">
                  Elevated
                </span>
              </div>
              <p className="text-xl font-black text-[var(--text-primary)]">60 req / min</p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Key-based quota with zero lockout penalty. Returns RFC-compliant rate limit response headers.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-bold text-xs text-[var(--text-primary)]">Need an API Key?</span>
              <p className="text-xs text-[var(--text-secondary)]">
                Sign in with GitHub on our Developer Portal to generate up to 3 keys instantly.
              </p>
            </div>
            <Link
              href="/developer"
              className="rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-95 transition"
            >
              Open Developer Portal →
            </Link>
          </div>
        </section>

        {/* Section 4: Offline Utility Functions */}
        <section id="utilities" className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-5 shadow-sm scroll-mt-20">
          <div className="border-b border-[var(--border-default)] pb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>4.</span>
              <span>Offline Utility Functions</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              These helpers run 100% locally with zero network calls and zero dependencies.
            </p>
          </div>

          <div className="space-y-4">
            {/* Utility 1 */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-[var(--nepal-blue)]">
                  {selectedLang === 'ts'
                    ? 'validateLicenseNumber(license: string): boolean'
                    : selectedLang === 'php'
                    ? 'LicenseChecker::validate(string $number): bool'
                    : 'validate_license_number(license: str) -> bool'}
                </code>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Offline Regex</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Validates whether a string matches the required Nepal driving license pattern <code className="font-mono">XX-XX-XXXXXXXX</code>. Seamlessly supports both English (<code className="font-mono">0-9</code>) and Nepali Devanagari numerals (<code className="font-mono">०-९</code>).
              </p>
              <pre className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 font-mono text-xs">
                {selectedLang === 'ts' && (
                  <code>
{`validateLicenseNumber('01-01-12345678');  // true
validateLicenseNumber('०१-०१-१२३४५६७८');  // true
validateLicenseNumber('12-34-5678');        // false`}
                  </code>
                )}
                {selectedLang === 'php' && (
                  <code>
{`use NepalLicenseChecker\\LicenseChecker;

LicenseChecker::validate('01-01-12345678');  // true
LicenseChecker::validate('०१-०१-१२३४५६७८');  // true
LicenseChecker::validate('12-34-5678');        // false`}
                  </code>
                )}
                {selectedLang === 'python' && (
                  <code>
{`from nepal_license_checker import validate_license_number

validate_license_number('01-01-12345678')  # True
validate_license_number('०१-०१-१२३४५६७८')  # True
validate_license_number('12-34-5678')        # False`}
                  </code>
                )}
              </pre>
            </div>

            {/* Utility 2 */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-[var(--nepal-blue)]">
                  {selectedLang === 'ts'
                    ? 'formatLicenseNumber(input: string): string'
                    : selectedLang === 'php'
                    ? 'LicenseChecker::format(string $raw): string'
                    : 'format_license_number(raw: str) -> str'}
                </code>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Input Masking</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Formats raw numeric inputs into the standard hyphenated <code className="font-mono">XX-XX-XXXXXXXX</code> pattern. Perfect for form auto-formatting on user input.
              </p>
              <pre className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 font-mono text-xs">
                {selectedLang === 'ts' && (
                  <code>
{`formatLicenseNumber('010112345678');  // '01-01-12345678'
formatLicenseNumber('०१०११२३४५६७८');  // '01-01-12345678'`}
                  </code>
                )}
                {selectedLang === 'php' && (
                  <code>
{`LicenseChecker::format('010112345678');  // '01-01-12345678'
LicenseChecker::format('०१०११२३४५६७८');  // '01-01-12345678'`}
                  </code>
                )}
                {selectedLang === 'python' && (
                  <code>
{`format_license_number('010112345678')  # '01-01-12345678'
format_license_number('०१०११२३४५६७८')  # '01-01-12345678'`}
                  </code>
                )}
              </pre>
            </div>

            {/* Utility 3 */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between">
                <code className="font-mono text-xs font-bold text-[var(--nepal-blue)]">
                  {selectedLang === 'ts'
                    ? 'devanagariToAsciiDigits(str) / asciiToDevanagariDigits(str)'
                    : selectedLang === 'php'
                    ? 'LicenseChecker::devanagariToAscii() / asciiToDevanagari()'
                    : 'devanagari_to_ascii_digits() / ascii_to_devanagari_digits()'}
                </code>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">Numeral Converter</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Bidirectional numeral conversion between Nepali Devanagari (<code className="font-mono">०-९</code>) and Western ASCII (<code className="font-mono">0-9</code>).
              </p>
              <pre className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 font-mono text-xs">
                {selectedLang === 'ts' && (
                  <code>
{`devanagariToAsciiDigits('०१-०१-१२३४५६७८'); // '01-01-12345678'
asciiToDevanagariDigits('01-01-12345678'); // '०१-०१-१२३४५६७८'`}
                  </code>
                )}
                {selectedLang === 'php' && (
                  <code>
{`LicenseChecker::devanagariToAscii('०१-०१-१२३४५६७८'); // '01-01-12345678'
LicenseChecker::asciiToDevanagari('01-01-12345678'); // '०१-०१-१२३४५६७८'`}
                  </code>
                )}
                {selectedLang === 'python' && (
                  <code>
{`devanagari_to_ascii_digits('०१-०१-१२३४५६७८') # '01-01-12345678'
ascii_to_devanagari_digits('01-01-12345678') # '०१-०१-१२३४५६७८'`}
                  </code>
                )}
              </pre>
            </div>
          </div>
        </section>

        {/* Section 5: Live Interactive Playground */}
        <section id="playground" className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-5 shadow-sm scroll-mt-20">
          <div className="border-b border-[var(--border-default)] pb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>5.</span>
              <span>Live Utilities Playground</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Test how the offline SDK functions format and validate numbers in real-time.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">
                Type any license number (English or Nepali):
              </label>
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="e.g. 010112345678 or ०१-०१-१२३४५६७८"
                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 font-mono text-xs text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-hidden transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 space-y-1">
                <span className="text-[10.5px] font-bold text-[var(--text-muted)] font-sans">Format Validity</span>
                <p className={`font-bold inline-flex items-center gap-1.5 ${isValidFormat ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                  {isValidFormat ? (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Valid (XX-XX-XXXXXXXX)</span>
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      <span>Invalid Format</span>
                    </>
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 space-y-1">
                <span className="text-[10.5px] font-bold text-[var(--text-muted)] font-sans">ASCII Normalized</span>
                <p className="font-bold text-[var(--text-primary)] truncate">{normalizedInput || '-'}</p>
              </div>

              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 space-y-1">
                <span className="text-[10.5px] font-bold text-[var(--text-muted)] font-sans">Devanagari Numerals</span>
                <p className="font-bold text-[var(--text-primary)] truncate">{nepaliDigits || '-'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3 space-y-1">
              <span className="text-[10.5px] font-bold text-[var(--text-muted)]">Auto-Masked Output:</span>
              <p className="font-mono text-xs font-bold text-[var(--nepal-blue)]">{formattedExample || '-'}</p>
            </div>
          </div>
        </section>

        {/* Section 6: TypeScript Types */}
        <section id="types" className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-5 shadow-sm scroll-mt-20">
          <div className="border-b border-[var(--border-default)] pb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>6.</span>
              <span>TypeScript Interfaces & Types</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              The package includes full <code className="font-mono text-[var(--nepal-blue)]">.d.ts</code> typings out of the box.
            </p>
          </div>

          <pre className="overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 sm:p-5 font-mono text-xs leading-relaxed text-[var(--text-primary)]">
{`export interface LicenseData {
  holder_name: string;    // Full name of driver
  license_number: string; // Formatted license number
  office: string;         // Yatayat Karyalaya issued
  category: string;       // Categories (e.g. "A, B")
  createdAt: string;      // Indexed date timestamp
  updatedAt: string;      // Last sync date timestamp
}

export interface RateLimitInfo {
  limit?: number;         // Rate limit ceiling (e.g. 60)
  remaining?: number;     // Remaining requests in window
  reset?: number;         // Unix epoch reset timestamp
}

export type CheckLicenseResult =
  | {
      status: 'success';
      isReady: boolean;
      data: LicenseData | null;
      message?: string;
      statusCode: number;
      rateLimit?: RateLimitInfo;
    }
  | {
      status: 'error';
      isReady: false;
      data: null;
      error: string;
      retryAfter?: number;
      statusCode?: number;
      rateLimit?: RateLimitInfo;
    };`}
          </pre>
        </section>

        {/* Section 7: HTTP REST API Reference */}
        <section id="http-api" className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-5 shadow-sm scroll-mt-20">
          <div className="border-b border-[var(--border-default)] pb-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span>7.</span>
              <span>Direct HTTP REST API Reference</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              For applications written in Python, Go, PHP, Java, or Rust.
            </p>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3">
              <span className="rounded bg-green-500/10 text-green-600 dark:text-green-400 font-bold px-2 py-0.5 mr-2">GET</span>
              <span className="text-[var(--text-primary)]">https://license-checker.acharyanischal.com.np/api/license</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] text-[var(--text-secondary)]">
                    <th className="py-2.5 px-3 font-bold">Parameter / Header</th>
                    <th className="py-2.5 px-3 font-bold">Type</th>
                    <th className="py-2.5 px-3 font-bold">Required</th>
                    <th className="py-2.5 px-3 font-bold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)] font-sans">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-[var(--nepal-blue)]">number</td>
                    <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">query string</td>
                    <td className="py-2.5 px-3 text-[var(--danger)] font-bold">Yes</td>
                    <td className="py-2.5 px-3">License number in <code className="font-mono">XX-XX-XXXXXXXX</code> format</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-[var(--nepal-blue)]">x-api-key</td>
                    <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">header</td>
                    <td className="py-2.5 px-3 text-[var(--text-muted)]">Optional</td>
                    <td className="py-2.5 px-3">Developer key for 60 req/min rate limit quota</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-[var(--nepal-blue)]">Authorization</td>
                    <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">header</td>
                    <td className="py-2.5 px-3 text-[var(--text-muted)]">Optional</td>
                    <td className="py-2.5 px-3"><code className="font-mono">Bearer &lt;apiKey&gt;</code> alternative</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quick Export Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-default)]">
              <div>
                <span className="text-xs font-bold text-[var(--text-primary)] block">Export Schema & Collections</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Import into Postman, Insomnia, Swagger UI, or Bruno:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/api/developer/openapi?format=postman&download=1"
                  download="nepal-license-checker-postman.json"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition shadow-2xs"
                >
                  <span className="font-mono text-orange-500 font-black">P</span>
                  <span>Postman Collection (.json)</span>
                </a>
                <a
                  href="/api/developer/openapi?download=1"
                  download="nepal-license-checker-openapi.json"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition shadow-2xs"
                >
                  <span className="font-mono text-emerald-500 font-black">&#123;&#125;</span>
                  <span>OpenAPI 3.1 Spec (.json)</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer info */}
        <footer className="pt-6 border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-[var(--text-primary)]">
              © {new Date().getFullYear()} Nepal License Checker
            </span>
            <span>·</span>
            <span className="font-mono text-[10px] rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 border border-[var(--border-default)]">
              v2.0.0
            </span>
            <span>·</span>
            <span>Developed by</span>
            <a
              href="https://acharyanischal.com.np/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--nepal-blue)] hover:underline inline-flex items-center gap-0.5"
            >
              Nischal Acharya
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/developer" className="text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition font-semibold">
              Developer Portal
            </Link>
            <Link href="/" className="text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition font-semibold">
              Public Search
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
