'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import type { Language } from '@/lib/i18n'
import { TypeScriptLogo, PythonLogo, PhpLogo, PostmanLogo } from '@/components/SdkLogos'

interface NpmModalProps {
  isOpen: boolean
  onClose: () => void
  language: Language
}

type SdkLanguage = 'ts' | 'python' | 'php'
type Registry = 'npm' | 'github'
type TsPackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
type PythonPackageManager = 'pip' | 'poetry' | 'uv'
type PhpPackageManager = 'composer' | 'laravel'

export default function NpmModal({ isOpen, onClose, language }: NpmModalProps) {
  const [sdkLang, setSdkLang] = useState<SdkLanguage>('ts')
  const [registry, setRegistry] = useState<Registry>('npm')
  const [tsPm, setTsPm] = useState<TsPackageManager>('npm')
  const [pythonPm, setPythonPm] = useState<PythonPackageManager>('pip')
  const [phpPm, setPhpPm] = useState<PhpPackageManager>('composer')
  const [copiedCmd, setCopiedCmd] = useState(false)
  const [copiedNpmrc, setCopiedNpmrc] = useState(false)
  const [tsTab, setTsTab] = useState<'esm' | 'cjs'>('esm')
  const [pythonTab, setPythonTab] = useState<'basic' | 'fastapi'>('basic')
  const [phpTab, setPhpTab] = useState<'pure' | 'laravel'>('pure')

  if (!isOpen) return null

  const isNe = language === 'ne'
  const isGithub = registry === 'github'

  const tsPkgName = isGithub
    ? '@nischalacharya060/nepal-license-checker'
    : 'nepal-license-checker'

  const getTsInstallCmd = (pm: TsPackageManager) => {
    switch (pm) {
      case 'pnpm':
        return `pnpm add ${tsPkgName}`
      case 'yarn':
        return `yarn add ${tsPkgName}`
      case 'bun':
        return `bun add ${tsPkgName}`
      case 'npm':
      default:
        return `npm install ${tsPkgName}`
    }
  }

  const getPythonInstallCmd = (pm: PythonPackageManager) => {
    switch (pm) {
      case 'poetry':
        return 'poetry add nepal-license-checker'
      case 'uv':
        return 'uv add nepal-license-checker'
      case 'pip':
      default:
        return 'pip install nepal-license-checker'
    }
  }

  const getPhpInstallCmd = (pm: PhpPackageManager) => {
    switch (pm) {
      case 'laravel':
        return 'composer require nepal-license-checker/nepal-license-checker'
      case 'composer':
      default:
        return 'composer require nepal-license-checker/nepal-license-checker'
    }
  }

  const currentInstallCmd =
    sdkLang === 'ts'
      ? getTsInstallCmd(tsPm)
      : sdkLang === 'python'
        ? getPythonInstallCmd(pythonPm)
        : getPhpInstallCmd(phpPm)

  const npmrcContent = '@nischalacharya060:registry=https://npm.pkg.github.com'

  const copyInstall = () => {
    navigator.clipboard.writeText(currentInstallCmd)
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 lg:p-6 backdrop-blur-md animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sdk-modal-title"
    >
      <div
        className="relative flex max-h-[94vh] w-full max-w-5xl xl:max-w-[1080px] flex-col overflow-hidden rounded-t-[28px] sm:rounded-3xl dev-glass-card shadow-2xl animate-rise-in border border-[var(--border-default)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-[var(--border-default)] rounded-full mx-auto my-2 sm:hidden" aria-hidden />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-gradient-to-r from-[var(--nepal-red)]/10 via-[var(--nepal-blue)]/10 to-transparent px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl p-2 shadow-sm shrink-0 transition-all duration-300 ${
                sdkLang === 'ts'
                  ? 'bg-blue-600/10 border border-blue-500/30'
                  : sdkLang === 'python'
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'bg-indigo-600/10 border border-indigo-500/30'
              }`}
            >
              {sdkLang === 'ts' ? (
                <TypeScriptLogo className="h-7 w-7" />
              ) : sdkLang === 'python' ? (
                <PythonLogo className="h-7 w-7" />
              ) : (
                <PhpLogo className="h-7 w-7" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="sdk-modal-title" className="text-base font-extrabold text-[var(--text-primary)] sm:text-lg tracking-tight">
                  {isNe ? 'विकासकर्ता SDK तथा लाइब्रेरीहरू' : 'Developer SDK Packages'}
                </h2>
                <span className="rounded-full bg-[var(--nepal-blue)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 font-mono">
                  {sdkLang === 'ts' ? 'v1.1.0' : 'v1.0.0'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {isNe
                  ? 'शून्य बाह्य निर्भरता भएको औपचारिक SDK बाट सिधै नेपाल लाइसेन्स प्रमाणीकरण जोड्नुहोस्'
                  : 'Zero-dependency official SDKs for TypeScript, Python, and PHP & Laravel'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            aria-label={isNe ? 'मोडाल बन्द गर्नुहोस्' : 'Close modal'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Primary Language Selector Tabs */}
        <div className="border-b border-[var(--border-default)] bg-[var(--surface-primary)] px-5 sm:px-7 py-2.5 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1 hidden sm:inline">
              {isNe ? 'भाषा चयन:' : 'Language:'}
            </span>

            <button
              type="button"
              onClick={() => setSdkLang('ts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                sdkLang === 'ts'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
              }`}
            >
              <TypeScriptLogo className="h-4 w-4 shrink-0 rounded-xs" />
              <span>TypeScript / Node.js</span>
            </button>

            <button
              type="button"
              onClick={() => setSdkLang('python')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                sdkLang === 'python'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
              }`}
            >
              <PythonLogo className="h-4 w-4 shrink-0" />
              <span>Python (PyPI)</span>
            </button>

            <button
              type="button"
              onClick={() => setSdkLang('php')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                sdkLang === 'php'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
              }`}
            >
              <PhpLogo className="h-4 w-4 shrink-0 rounded-xs" />
              <span>PHP & Laravel</span>
            </button>
          </div>

          <a
            href="/developer/docs"
            className="text-xs font-semibold text-[var(--nepal-blue)] hover:underline shrink-0 hidden md:inline-flex items-center gap-1"
          >
            <span>{isNe ? 'सम्पूर्ण कागजात' : 'Full Docs'}</span>
            <span>→</span>
          </a>
        </div>

        {/* Modal Body: 2-Column Wide Layout */}
        <div className="overflow-y-auto p-5 sm:p-7 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Left Column: Installation & Config (col-span-5) */}
            <div className="md:col-span-5 space-y-4">
              {/* TypeScript Registry Selector */}
              {sdkLang === 'ts' && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                    {isNe ? 'प्याकेज स्रोत (Registry):' : 'Package Registry:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRegistry('npm')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition cursor-pointer ${
                        registry === 'npm'
                          ? 'border-[var(--nepal-red)] bg-[var(--nepal-red)]/10 text-[var(--nepal-red)] shadow-2xs'
                          : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="font-mono text-xs font-black">npm</span>
                      <span>npm Registry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegistry('github')}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition cursor-pointer ${
                        registry === 'github'
                          ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] shadow-2xs'
                          : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      <span>GitHub</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Install Command Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {isNe ? 'स्थापना कमान्ड:' : 'Installation Command:'}
                  </label>
                  <div className="flex rounded-lg border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                    {sdkLang === 'ts' &&
                      (['npm', 'pnpm', 'yarn', 'bun'] as const).map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setTsPm(pm)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                            tsPm === pm
                              ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {pm}
                        </button>
                      ))}

                    {sdkLang === 'python' &&
                      (['pip', 'poetry', 'uv'] as const).map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPythonPm(pm)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                            pythonPm === pm
                              ? 'bg-[var(--surface-primary)] text-amber-600 dark:text-amber-400 shadow-2xs'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {pm}
                        </button>
                      ))}

                    {sdkLang === 'php' &&
                      (['composer', 'laravel'] as const).map((pm) => (
                        <button
                          key={pm}
                          type="button"
                          onClick={() => setPhpPm(pm)}
                          className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                            phpPm === pm
                              ? 'bg-[var(--surface-primary)] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {pm === 'composer' ? 'Composer' : 'Laravel'}
                        </button>
                      ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2.5 font-mono text-xs text-[var(--text-primary)] shadow-2xs">
                  <span className="select-all truncate">
                    <span className="text-[var(--text-muted)] select-none mr-2">$</span>
                    {currentInstallCmd}
                  </span>
                  <button
                    type="button"
                    onClick={copyInstall}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-default)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-primary)] transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 shrink-0 cursor-pointer"
                  >
                    {copiedCmd ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)]">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{isNe ? 'कपी' : 'Copied'}</span>
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

              {/* GitHub Packages Config Tip for TS */}
              {sdkLang === 'ts' && isGithub && (
                <div className="rounded-xl border border-[var(--nepal-blue)]/20 bg-[var(--nepal-blue)]/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--nepal-blue)] flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <span>.npmrc Config</span>
                    </span>
                    <button
                      type="button"
                      onClick={copyNpmrc}
                      className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-primary)] border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-secondary)] transition hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer"
                    >
                      {copiedNpmrc ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-[var(--bg-secondary)] p-2 font-mono text-[10px] text-[var(--text-primary)] border border-[var(--border-default)]">
                    <code>{npmrcContent}</code>
                  </pre>
                </div>
              )}

              {/* Laravel Facade Note */}
              {sdkLang === 'php' && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span>Laravel Package Auto-Discovery</span>
                  </div>
                  <p className="text-[10.5px] text-[var(--text-secondary)] leading-relaxed">
                    ServiceProvider and <code className="font-mono text-indigo-500">LicenseChecker</code> Facade register automatically. Zero manual config required.
                  </p>
                </div>
              )}

              {/* Developer API Key & Higher Limits Card */}
              <div className="rounded-2xl border border-[var(--nepal-blue)]/30 bg-gradient-to-br from-[var(--nepal-blue)]/10 via-[var(--nepal-blue)]/5 to-transparent p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-bold text-[var(--nepal-blue)] flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span>{isNe ? 'विकासकर्ता API Key (६० req/min)' : 'Developer API Key (60 req/min)'}</span>
                  </span>
                  <span className="rounded-full bg-[var(--nepal-blue)]/20 px-2.5 py-0.5 text-[9.5px] font-bold text-[var(--nepal-blue)] font-mono">
                    Elevated Limit
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {isNe
                    ? 'GitHub बाट लगइन गरी समर्पित API Key पाउनुहोस् र उच्च दर (६०/मिनेट) मा खोज्नुहोस्।'
                    : 'Sign in with GitHub on our Developer Portal to generate an API key for 4x higher throughput.'}
                </p>
                <a
                  href="/developer"
                  className="inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-[var(--nepal-blue)] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:opacity-90 active:scale-95 transition cursor-pointer"
                >
                  <span>{isNe ? 'विकासकर्ता पोर्टल खोल्नुहोस्' : 'Open Developer Portal'}</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            {/* Right Column: Code Usage (col-span-7) */}
            <div className="md:col-span-7 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {isNe ? 'प्रयोगको उदाहरण (Quickstart):' : 'Code Usage Example:'}
                  </span>

                  {sdkLang === 'ts' && (
                    <div className="flex rounded-lg border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                      <button
                        type="button"
                        onClick={() => setTsTab('esm')}
                        className={`px-3 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                          tsTab === 'esm'
                            ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        ESM / TypeScript
                      </button>
                      <button
                        type="button"
                        onClick={() => setTsTab('cjs')}
                        className={`px-3 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                          tsTab === 'cjs'
                            ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        CommonJS
                      </button>
                    </div>
                  )}

                  {sdkLang === 'python' && (
                    <div className="flex rounded-lg border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                      <button
                        type="button"
                        onClick={() => setPythonTab('basic')}
                        className={`px-3 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                          pythonTab === 'basic'
                            ? 'bg-[var(--surface-primary)] text-amber-600 dark:text-amber-400 shadow-2xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Standard Lib
                      </button>
                      <button
                        type="button"
                        onClick={() => setPythonTab('fastapi')}
                        className={`px-3 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                          pythonTab === 'fastapi'
                            ? 'bg-[var(--surface-primary)] text-amber-600 dark:text-amber-400 shadow-2xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        FastAPI
                      </button>
                    </div>
                  )}

                  {sdkLang === 'php' && (
                    <div className="flex rounded-lg border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                      <button
                        type="button"
                        onClick={() => setPhpTab('pure')}
                        className={`px-3 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                          phpTab === 'pure'
                            ? 'bg-[var(--surface-primary)] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Pure PHP
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhpTab('laravel')}
                        className={`px-3 py-0.5 rounded text-[10.5px] font-bold transition cursor-pointer ${
                          phpTab === 'laravel'
                            ? 'bg-[var(--surface-primary)] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Laravel Facade
                      </button>
                    </div>
                  )}
                </div>

                <pre className="overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 font-mono text-[11.5px] leading-relaxed text-[var(--text-primary)] shadow-xs">
                  {sdkLang === 'ts' ? (
                    tsTab === 'esm' ? (
                      <code>
{`import { checkLicense } from '${tsPkgName}';

// Query license print status (supports Nepali ०-९ or English 0-9)
const result = await checkLicense('01-01-12345678', {
  apiKey: 'nlc_live_your_key_here', // Optional: 60 req/min
});

if (result.status === 'success' && result.isReady) {
  console.log('🎉 Ready for pickup!');
  console.log('Holder:', result.data?.holder_name);
  console.log('Office:', result.data?.office);
} else {
  console.log('License not printed yet.');
}`}
                      </code>
                    ) : (
                      <code>
{`const { checkLicense } = require('${tsPkgName}');

checkLicense('01-01-12345678', {
  apiKey: 'nlc_live_your_key_here', // Optional: 60 req/min
}).then((result) => {
  if (result.status === 'success' && result.isReady) {
    console.log('Holder:', result.data?.holder_name);
  }
});`}
                      </code>
                    )
                  ) : sdkLang === 'python' ? (
                    pythonTab === 'basic' ? (
                      <code>
{`from nepal_license_checker import check_license

# Standard library urllib client (zero dependencies)
result = check_license(
    license_no="01-01-12345678",
    api_key="nlc_live_your_key_here"  # Optional
)

if result["status"] == "success" and result["is_ready"]:
    print(f"🎉 Ready: {result['data']['holder_name']}")
    print(f"Office: {result['data']['office']}")
    print(f"Remaining quota: {result['rate_limit']['remaining']}")`}
                      </code>
                    ) : (
                      <code>
{`from fastapi import FastAPI, HTTPException
from nepal_license_checker import check_license

app = FastAPI()

@app.get("/verify-driver/{license_no}")
def verify_driver(license_no: str):
    res = check_license(license_no, api_key="nlc_live_your_key_here")
    if res["status"] != "success":
        raise HTTPException(status_code=400, detail=res["message"])
    return {"ready": res["is_ready"], "details": res["data"]}`}
                      </code>
                    )
                  ) : (
                    phpTab === 'pure' ? (
                      <code>
{`<?php
require_once __DIR__ . '/vendor/autoload.php';

use NepalLicenseChecker\\LicenseChecker;

$result = LicenseChecker::check('01-01-12345678', [
    'apiKey' => 'nlc_live_your_key_here'
]);

if ($result['status'] === 'success' && $result['isReady']) {
    echo "🎉 Ready: " . $result['data']['holder_name'] . "\\n";
    echo "Office: " . $result['data']['office'] . "\\n";
}`}
                      </code>
                    ) : (
                      <code>
{`<?php
namespace App\\Http\\Controllers;

use NepalLicenseChecker\\Laravel\\Facades\\LicenseChecker;

class DriverController extends Controller
{
    public function verify($licenseNo)
    {
        $result = LicenseChecker::check($licenseNo);
        return response()->json([
            'is_ready' => $result['isReady'],
            'data' => $result['data'] ?? null
        ]);
    }
}`}
                      </code>
                    )
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Full-Width Bottom Action Toolbar */}
        <div className="border-t border-[var(--border-default)] bg-[var(--surface-primary)] px-5 sm:px-7 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/developer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10 px-3 py-1.5 text-xs font-bold text-[var(--nepal-blue)] shadow-2xs transition hover:bg-[var(--nepal-blue)] hover:text-white active:scale-95 cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>{isNe ? 'API Key लिनुहोस् ↗' : 'Get API Key ↗'}</span>
            </a>

            {sdkLang === 'ts' && (
              <a
                href="https://www.npmjs.com/package/nepal-license-checker"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-red)] px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:opacity-90 active:scale-95"
              >
                <TypeScriptLogo className="h-3.5 w-3.5 rounded-2xs" />
                <span>npm Registry ↗</span>
              </a>
            )}

            {sdkLang === 'python' && (
              <a
                href="https://pypi.org/project/nepal-license-checker/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-2xs transition hover:opacity-90 active:scale-95"
              >
                <PythonLogo className="h-3.5 w-3.5" />
                <span>PyPI Package ↗</span>
              </a>
            )}

            {sdkLang === 'php' && (
              <>
                <a
                  href="https://packagist.org/packages/nepal-license-checker/nepal-license-checker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:opacity-90 active:scale-95"
                >
                  <PhpLogo className="h-3.5 w-3.5 rounded-2xs" />
                  <span>Composer ↗</span>
                </a>
                <a
                  href="https://github.com/NischalAcharya060/nepal-license-checker-php"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] shadow-2xs transition hover:border-indigo-500 hover:text-indigo-600 active:scale-95"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub ↗</span>
                </a>
              </>
            )}

            <a
              href="/api/developer/openapi?format=postman&download=1"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#FF6C37]/40 bg-[#FF6C37]/10 px-3 py-1.5 text-xs font-bold text-[#FF6C37] shadow-2xs transition hover:bg-[#FF6C37] hover:text-white active:scale-95"
            >
              <PostmanLogo className="h-3.5 w-3.5" />
              <span>Postman Collection ↗</span>
            </a>

            <a
              href="/api/developer/openapi?download=1"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs transition hover:bg-emerald-500 hover:text-white active:scale-95"
            >
              <span className="font-mono text-xs font-black">OpenAPI</span>
              <span>3.1 JSON ↗</span>
            </a>
          </div>

          <a
            href="/developer/docs"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--text-secondary)] shadow-2xs transition hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] active:scale-95"
          >
            <span>{isNe ? 'सम्पूर्ण कागजात' : 'Full Documentation'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
