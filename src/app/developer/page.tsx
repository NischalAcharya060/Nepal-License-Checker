// src/app/developer/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import type { DeveloperProfile, DeveloperApiKey } from '@/lib/developerAuth'

export default function DeveloperPortalPage() {
  const [profile, setProfile] = useState<DeveloperProfile | null>(null)
  const [keys, setKeys] = useState<DeveloperApiKey[]>([])
  const [maxKeys, setMaxKeys] = useState(3)
  const [loading, setLoading] = useState(true)
  const [creatingKey, setCreatingKey] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKeyModal, setNewKeyModal] = useState<{ rawKey: string; key: DeveloperApiKey } | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [codeTab, setCodeTab] = useState<'sdk' | 'curl' | 'fetch' | 'python'>('sdk')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('error')
    }
    return null
  })

  // Load developer session & API keys
  useEffect(() => {
    let isMounted = true
    if (errorMessage && typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/developer')
    }

    fetch('/api/developer/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then(async (authData) => {
        if (!isMounted) return
        if (authData?.authenticated && authData?.developer) {
          setProfile(authData.developer)
          const keysRes = await fetch('/api/developer/keys')
          const keysData = await keysRes.json()
          if (isMounted && keysData?.keys) {
            setKeys(keysData.keys)
            if (keysData.maxKeys) setMaxKeys(keysData.maxKeys)
          }
        } else {
          setProfile(null)
          setKeys([])
        }
      })
      .catch(() => {
        if (isMounted) setProfile(null)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [errorMessage])

  const handleLogout = async () => {
    try {
      await fetch('/api/developer/auth/logout', { method: 'POST' })
      setProfile(null)
      setKeys([])
      toast.success('Signed out successfully.')
    } catch {
      toast.error('Failed to sign out.')
    }
  }

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (creatingKey) return

    setCreatingKey(true)
    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to create API key.')
        return
      }

      setKeys((prev) => [data.key, ...prev])
      setNewKeyModal({ rawKey: data.rawKey, key: data.key })
      setKeyName('')
      setActivePreset(null)
      toast.success('API key generated successfully!')
    } catch {
      toast.error('Network error. Failed to create API key.')
    } finally {
      setCreatingKey(false)
    }
  }

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke "${name}"? Any applications or bots using this key will immediately be rejected.`)) {
      return
    }

    try {
      const res = await fetch(`/api/developer/keys/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to revoke API key.')
        return
      }

      setKeys((prev) => prev.filter((k) => k.id !== id))
      toast.success('API key revoked successfully.')
    } catch {
      toast.error('Failed to revoke key. Please try again.')
    }
  }

  const copyToClipboard = (text: string, isSnippet = false) => {
    navigator.clipboard.writeText(text)
    if (isSnippet) {
      setCopiedCode(true)
      toast.success('Code snippet copied!')
      setTimeout(() => setCopiedCode(false), 2000)
    } else {
      setCopiedKey(true)
      toast.success('API key copied to clipboard!')
      setTimeout(() => setCopiedKey(false), 2500)
    }
  }

  const activeKeySample = newKeyModal?.rawKey || (keys.length > 0 ? `${keys[0].key_prefix}` : 'nlc_live_your_api_key_here')

  const getCodeSnippet = () => {
    switch (codeTab) {
      case 'sdk':
        return `// 1. Install official SDK: npm install nepal-license-checker
import { checkLicense } from 'nepal-license-checker';

const result = await checkLicense('01-01-12345678', {
  apiKey: '${activeKeySample}', // 60 req/min elevated limit
});

if (result.status === 'success' && result.isReady) {
  console.log('🎉 Ready for pickup!');
  console.log('Holder:', result.data?.holder_name);
  console.log('Office:', result.data?.office);
  console.log('Remaining quota:', result.rateLimit?.remaining);
} else {
  console.log('License not printed yet.');
}`
      case 'curl':
        return `# cURL request with x-api-key header
curl -X GET "https://license-checker.acharyanischal.com.np/api/license?number=01-01-12345678" \\
  -H "Accept: application/json" \\
  -H "x-api-key: ${activeKeySample}"`
      case 'fetch':
        return `// Native Fetch API (Browser or Node 18+)
const response = await fetch('https://license-checker.acharyanischal.com.np/api/license?number=01-01-12345678', {
  headers: {
    'Accept': 'application/json',
    'x-api-key': '${activeKeySample}'
  }
});

const result = await response.json();
console.log('RateLimit Remaining:', response.headers.get('x-ratelimit-remaining'));
console.log('Result:', result);`
      case 'python':
        return `# Python 3 with requests
import requests

url = "https://license-checker.acharyanischal.com.np/api/license"
headers = {
    "Accept": "application/json",
    "x-api-key": "${activeKeySample}"
}
params = {"number": "01-01-12345678"}

response = requests.get(url, headers=headers, params=params)
data = response.json()
print("Status:", data.get("status"))
print("License details:", data.get("data"))`
    }
  }

  const namePresets = ['Production API', 'Mobile App Backend', 'Discord / Telegram Bot', 'Local Development']

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 sm:px-6 sm:py-12 text-[var(--text-primary)] transition-colors">
      {/* Ambient background glows */}
      <div
        className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 h-96 w-full max-w-4xl rounded-full bg-gradient-to-br from-[var(--nepal-blue)]/15 via-[var(--nepal-red)]/10 to-transparent blur-3xl opacity-70"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl space-y-8">
        {/* Navigation Bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-default)] pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition group"
            >
              <span className="transition-transform group-hover:-translate-x-0.5">←</span>
              <span>Back to Home</span>
            </Link>
            <span className="text-[var(--border-default)]">/</span>
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <span className="text-[var(--nepal-blue)]">⚡</span>
              <span>Developer Platform</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1 font-mono text-[10.5px] font-bold text-[var(--text-secondary)] shadow-2xs">
              API v1.1.0 • 60 req/min
            </span>
            <Link
              href="/developer/docs"
              className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition shadow-2xs"
            >
              SDK Docs →
            </Link>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-xs font-medium text-[var(--danger)] flex items-start justify-between gap-3 animate-fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="font-bold hover:underline cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--nepal-blue)] border-t-transparent" />
            <p className="text-xs text-[var(--text-muted)] font-medium">Authenticating developer session...</p>
          </div>
        )}

        {/* ================================================================= */}
        {/* STATE A: GUEST (UNAUTHENTICATED DEVELOPER LANDING)                 */}
        {/* ================================================================= */}
        {!loading && !profile && (
          <div className="space-y-10 animate-rise-in">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-7 sm:p-12 shadow-xl">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-[var(--nepal-blue)]/10 blur-3xl pointer-events-none" />

              <div className="max-w-2xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue)]/10 px-3.5 py-1 text-xs font-bold text-[var(--nepal-blue)]">
                  <span>🚀</span>
                  <span>Dedicated Developer Tier</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
                  Integrate Nepal Driving License Verification with 4x Higher Limits
                </h1>

                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Connect your web applications, mobile apps, and automated workflows directly to the mirrored Department of Transport Management (DOTM) database with sustained <strong>60 requests/minute</strong> quota and zero lockout penalties.
                </p>

                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <a
                    href="/api/developer/auth/github"
                    className="inline-flex items-center gap-2.5 rounded-2xl bg-black dark:bg-white text-white dark:text-black px-6 py-3.5 text-sm font-bold shadow-lg shadow-black/10 dark:shadow-white/10 hover:opacity-90 active:scale-98 transition cursor-pointer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                    <span>Sign In with GitHub</span>
                    <span className="font-mono text-xs opacity-80">→</span>
                  </a>

                  <Link
                    href="/developer/login"
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-3.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shadow-xs"
                  >
                    <span>Direct Login Portal</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-2 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] font-bold text-lg">
                  ⚡
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">60 Requests / Minute</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  4x higher than standard public searches. Standard sliding window throttling with zero lockout penalties.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-2 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success)]/10 text-[var(--success)] font-bold text-lg">
                  🔑
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Hashed API Keys</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Manage up to 3 live keys. Keys are hashed with SHA-256 for military-grade storage security.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-2 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-red)]/10 text-[var(--nepal-red)] font-bold text-lg">
                  📦
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Official TypeScript SDK</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Zero-dependency client library available on npm Registry and GitHub Packages with full typing.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-2 shadow-2xs">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-lg">
                  📊
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">RFC Rate Headers</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Responses return standard <code className="font-mono text-[10.5px]">X-RateLimit-*</code> and <code className="font-mono text-[10.5px]">Retry-After</code> HTTP headers.
                </p>
              </div>
            </div>

            {/* Comparison Box */}
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">Access Tier Comparison</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    How developer API keys compare to anonymous public browser queries.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] text-[var(--text-secondary)]">
                      <th className="py-3 px-4 font-bold">Feature</th>
                      <th className="py-3 px-4 font-bold">Public Anonymous</th>
                      <th className="py-3 px-4 font-bold text-[var(--nepal-blue)]">Developer Tier (GitHub)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">Rate Limit</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">15 requests / minute</td>
                      <td className="py-3 px-4 font-bold text-[var(--success)]">60 requests / minute (4x)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">Lockout Penalty</td>
                      <td className="py-3 px-4 text-[var(--danger)]">5-minute IP lockout on breach</td>
                      <td className="py-3 px-4 font-bold text-[var(--success)]">Zero lockout (Clean 429 backoff)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">Identifier</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">Client IP (Shared in cloud)</td>
                      <td className="py-3 px-4 font-bold text-[var(--nepal-blue)]">Dedicated API Key</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">SDK Integration</td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">Basic query only</td>
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">Full support with <code className="font-mono">apiKey</code> option</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STATE B: AUTHENTICATED DEVELOPER DASHBOARD                        */}
        {/* ================================================================= */}
        {!loading && profile && (
          <div className="space-y-8 animate-fade-in">
            {/* Developer Profile Header Card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-7 shadow-sm">
              <div className="flex items-center gap-4">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.username}
                    width={56}
                    height={56}
                    className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-2xs"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--nepal-blue)] text-white font-bold text-xl shadow-sm">
                    {profile.username[0]?.toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                      {profile.name || profile.username}
                    </h1>
                    <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border-default)]">
                      @{profile.username}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[var(--success)]/10 px-2.5 py-0.5 text-[10px] font-bold text-[var(--success)]">
                      Verified Developer
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {profile.email ? profile.email : 'GitHub Developer Account'} • Member since {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* 4 Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 space-y-1 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Quota Limit</span>
                <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">60 <span className="text-xs font-normal text-[var(--text-secondary)]">req/min</span></p>
                <span className="inline-block rounded bg-[var(--nepal-blue)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)]">
                  Elevated Tier
                </span>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 space-y-1 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Rate Window</span>
                <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">60s <span className="text-xs font-normal text-[var(--text-secondary)]">sliding</span></p>
                <span className="inline-block rounded bg-[var(--success)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--success)]">
                  0s Lockout Penalty
                </span>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 space-y-1 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Active Keys</span>
                <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                  {keys.length} <span className="text-xs font-normal text-[var(--text-secondary)]">/ {maxKeys} max</span>
                </p>
                <span className="inline-block rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                  {maxKeys - keys.length} available
                </span>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 space-y-1 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Package SDK</span>
                <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">v1.1.0</p>
                <span className="inline-block rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  Dual ESM & CJS
                </span>
              </div>
            </div>

            {/* API Keys Management Card */}
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">API Keys</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Keys authenticate requests from your servers or via the <code className="font-mono text-[var(--nepal-blue)]">nepal-license-checker</code> SDK.
                  </p>
                </div>

                <span className="text-xs font-semibold text-[var(--text-muted)]">
                  {keys.length} of {maxKeys} active
                </span>
              </div>

              {/* Create Key Form */}
              {keys.length < maxKeys ? (
                <div className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4 sm:p-5">
                  <span className="text-xs font-bold text-[var(--text-primary)] block">Generate New Key</span>
                  <form onSubmit={handleCreateKey} className="flex flex-wrap gap-2.5 items-center">
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. Production Web App, Mobile Backend, Discord Bot"
                      maxLength={50}
                      className="flex-1 min-w-[240px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-hidden transition"
                    />
                    <button
                      type="submit"
                      disabled={creatingKey}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-95 disabled:opacity-50 transition cursor-pointer shrink-0"
                    >
                      {creatingKey ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <span>+</span>
                          <span>Generate API Key</span>
                        </>
                      )}
                    </button>
                  </form>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10.5px] text-[var(--text-muted)]">Suggestions:</span>
                    {namePresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setKeyName(preset)
                          setActivePreset(preset)
                        }}
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-medium transition cursor-pointer ${
                          activePreset === preset
                            ? 'border-[var(--nepal-blue)] bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]'
                            : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-muted)] flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>You have reached the maximum quota of {maxKeys} active API keys. Revoke an unused key below to generate a new one.</span>
                </div>
              )}

              {/* Active Keys List */}
              {keys.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-8 text-center space-y-2">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">No API keys generated yet.</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Generate an API key above to start querying with elevated 60 req/min limits.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-2xs hover:border-[var(--nepal-blue)]/50 transition"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-sm text-[var(--text-primary)]">{k.name}</span>
                          <span className="inline-flex items-center rounded-full bg-[var(--success)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--success)]">
                            Active
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] font-mono">
                          <span className="rounded bg-[var(--bg-secondary)] px-2 py-0.5 border border-[var(--border-default)] font-bold text-[var(--text-primary)]">
                            {k.key_prefix}
                          </span>
                          <span>•</span>
                          <span>{k.rate_limit_per_minute} req/min</span>
                          <span>•</span>
                          <span className="text-[var(--text-muted)]">
                            Created: {new Date(k.created_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span className="text-[var(--text-muted)]">
                            {k.last_used_at ? `Last used: ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used yet'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeKey(k.id, k.name)}
                        className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3 py-1.5 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition cursor-pointer"
                      >
                        Revoke Key
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quickstart Integration Code Card */}
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Quick Integration Guide</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Pre-populated with your active API key. Send via <code className="font-mono text-[var(--nepal-blue)]">apiKey</code> in SDK or <code className="font-mono text-[var(--nepal-blue)]">x-api-key</code> HTTP header.
                  </p>
                </div>

                <div className="flex rounded-xl border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                  {(['sdk', 'curl', 'fetch', 'python'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCodeTab(tab)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        codeTab === tab
                          ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-2xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {tab === 'sdk' ? 'TypeScript SDK' : tab === 'curl' ? 'cURL' : tab === 'fetch' ? 'Fetch API' : 'Python'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Display */}
              <div className="relative">
                <pre className="overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 sm:p-5 font-mono text-xs leading-relaxed text-[var(--text-primary)]">
                  <code>{getCodeSnippet()}</code>
                </pre>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getCodeSnippet(), true)}
                  className="absolute top-3 right-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 cursor-pointer shadow-2xs"
                >
                  {copiedCode ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* HTTP API Reference Table */}
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-4 shadow-sm text-xs">
              <h2 className="text-base font-bold text-[var(--text-primary)]">HTTP Response Headers Specification</h2>
              <p className="text-[var(--text-secondary)]">
                The license API mirrors all standard RFC rate-limiting headers with each request:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] text-[var(--text-secondary)]">
                      <th className="py-2.5 px-3 font-bold">Header</th>
                      <th className="py-2.5 px-3 font-bold">Description</th>
                      <th className="py-2.5 px-3 font-bold">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                    <tr>
                      <td className="py-2.5 px-3 text-[var(--nepal-blue)]">X-RateLimit-Limit</td>
                      <td className="py-2.5 px-3 font-sans">Total requests allowed within the 60s sliding window</td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">60</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-[var(--nepal-blue)]">X-RateLimit-Remaining</td>
                      <td className="py-2.5 px-3 font-sans">Remaining requests before hitting the 429 rate threshold</td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">58</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-[var(--nepal-blue)]">X-RateLimit-Reset</td>
                      <td className="py-2.5 px-3 font-sans">Unix epoch timestamp when the current rate limit window resets</td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">1760688000</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-[var(--nepal-red)]">Retry-After</td>
                      <td className="py-2.5 px-3 font-sans">Returned on HTTP 429 indicating seconds to wait before retry</td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">35</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Reveal New Key (Shown Once) */}
        {newKeyModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md animate-fade-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative w-full max-w-lg rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 shadow-2xl space-y-5 animate-rise-in">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--success)]/15 text-[var(--success)] font-bold text-xl">
                  ✓
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">New API Key Generated</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{newKeyModal.key.name}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--nepal-red)]/30 bg-[var(--nepal-red)]/10 p-3.5 text-xs text-[var(--nepal-red)] font-medium leading-relaxed">
                ⚠️ <strong>Important Security Notice:</strong> Please copy this key now. For your security, this raw key will <strong>never be shown again</strong>. If lost, you will need to revoke it and generate a new key.
              </div>

              {/* Raw Key Display Box */}
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 font-mono text-xs select-all">
                <span className="truncate text-[var(--text-primary)] font-bold">{newKeyModal.rawKey}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(newKeyModal.rawKey)}
                  className="rounded-xl bg-[var(--nepal-blue)] px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer shrink-0"
                >
                  {copiedKey ? '✓ Copied!' : 'Copy Key'}
                </button>
              </div>

              {/* Instant Test Command Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] block">Instant Test cURL:</span>
                <pre className="overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-2.5 font-mono text-[10.5px] text-[var(--text-primary)]">
                  <code>{`curl -H "x-api-key: ${newKeyModal.rawKey}" "https://license-checker.acharyanischal.com.np/api/license?number=01-01-12345678"`}</code>
                </pre>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setNewKeyModal(null)}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-primary)] transition cursor-pointer"
                >
                  I Have Saved My Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer className="pt-8 mt-12 border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
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
            <Link href="/developer/docs" className="text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition font-semibold">
              SDK Docs
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
