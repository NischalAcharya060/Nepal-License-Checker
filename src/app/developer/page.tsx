// src/app/developer/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import toast from 'react-hot-toast'
import type { DeveloperProfile, DeveloperApiKey } from '@/lib/developerAuth'
import DeveloperSidebar from '@/components/developer/DeveloperSidebar'
import DeveloperTrafficChart from '@/components/developer/DeveloperTrafficChart'
import DeveloperQuotaGauge from '@/components/developer/DeveloperQuotaGauge'
import DeveloperKeyDistribution from '@/components/developer/DeveloperKeyDistribution'
import LiveConsoleSparkline, { type LiveRequestEntry } from '@/components/developer/LiveConsoleSparkline'
import DeveloperShowcaseChart from '@/components/developer/DeveloperShowcaseChart'
import DeveloperMobileDeviceWarning from '@/components/developer/DeveloperMobileDeviceWarning'
import type { DeveloperAnalyticsResponse } from '@/app/api/developer/analytics/route'

export default function DeveloperPortalPage() {
  const [profile, setProfile] = useState<DeveloperProfile | null>(null)
  const [keys, setKeys] = useState<DeveloperApiKey[]>([])
  const [maxKeys, setMaxKeys] = useState(3)
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<DeveloperAnalyticsResponse | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d')
  const [consoleHistory, setConsoleHistory] = useState<LiveRequestEntry[]>([])
  const [creatingKey, setCreatingKey] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [newKeyModal, setNewKeyModal] = useState<{ rawKey: string; key: DeveloperApiKey } | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedNpm, setCopiedNpm] = useState(false)
  const [codeTab, setCodeTab] = useState<'sdk' | 'curl' | 'fetch' | 'python'>('sdk')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const copyNpm = () => {
    navigator.clipboard.writeText('npm install nepal-license-checker')
    setCopiedNpm(true)
    toast.success('npm install command copied!')
    setTimeout(() => setCopiedNpm(false), 2000)
  }
  const [activeSection, setActiveSection] = useState('section-overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('nlc_dev_sidebar_collapsed') === 'true'
      } catch {
        return false
      }
    }
    return false
  })

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('nlc_dev_sidebar_collapsed', String(next))
      } catch {}
      return next
    })
  }

  // ScrollSpy listener to sync active sidebar section smoothly (including HTTP Specs)
  useEffect(() => {
    if (!profile) return

    const sectionIds = [
      'section-overview',
      'section-analytics',
      'section-keys',
      'section-quickstart',
      'section-console',
      'section-specs',
    ]

    let ticking = false

    const handleScroll = () => {
      if (ticking) return
      ticking = true

      requestAnimationFrame(() => {
        ticking = false

        const scrollY = window.scrollY || window.pageYOffset || 0

        // 1. If at or near the top of the page, it's ALWAYS Overview
        if (scrollY < 160) {
          setActiveSection('section-overview')
          return
        }

        // 2. Detect if scrolled near the bottom of the page (activates last section 'section-specs')
        // Only valid if the user has actually scrolled down significantly and the page is scrollable
        const scrollBottom = window.innerHeight + scrollY
        const docHeight = document.documentElement.scrollHeight
        if (scrollY > 400 && docHeight > window.innerHeight + 250 && scrollBottom >= docHeight - 80) {
          setActiveSection('section-specs')
          return
        }

        // 3. Viewport-based threshold (bounding rect)
        for (let i = sectionIds.length - 1; i >= 0; i--) {
          const id = sectionIds[i]
          const el = document.getElementById(id)
          if (el) {
            const rect = el.getBoundingClientRect()
            if (rect.top <= 200) {
              setActiveSection(id)
              return
            }
          }
        }
        setActiveSection('section-overview')
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [profile])

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    if (sectionId === 'section-overview') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Key Renaming & Rotation states
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingRename, setSavingRename] = useState(false)
  const [rotatingKeyId, setRotatingKeyId] = useState<string | null>(null)

  // In-Dashboard Live API Console states
  const [testApiKey, setTestApiKey] = useState('')
  const [testLicenseNumber, setTestLicenseNumber] = useState('01-01-12345678')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null)
  const [testStatus, setTestStatus] = useState<number | null>(null)
  const [testHeaders, setTestHeaders] = useState<{
    limit?: string | null
    remaining?: string | null
    reset?: string | null
  } | null>(null)
  const [testDuration, setTestDuration] = useState<number | null>(null)

  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('error')
    }
    return null
  })

  const [autoRefresh, setAutoRefresh] = useState(false)
  const [copiedEnv, setCopiedEnv] = useState(false)

  const loadAnalytics = async (tf: '24h' | '7d' | '30d', forceRefresh = false) => {
    setAnalyticsLoading(true)
    try {
      const res = await fetch(`/api/developer/analytics?timeframe=${tf}${forceRefresh ? '&refresh=true' : ''}`)
      if (res.ok) {
        const data: DeveloperAnalyticsResponse = await res.json()
        setAnalyticsData(data)
      }
    } catch (err) {
      console.error('Failed to load analytics:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  const handleTimeframeChange = (tf: '24h' | '7d' | '30d') => {
    setTimeframe(tf)
    void loadAnalytics(tf)
  }

  // Smart auto-refresh: OFF by default. Completely freezes when tab is hidden to save Turso reads!
  useEffect(() => {
    if (!autoRefresh || !profile) return

    const interval = setInterval(() => {
      // Skip query if tab is hidden/minimized
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      void loadAnalytics(timeframe, false)
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, profile, timeframe])

  const copyEnvSnippet = (rawKey: string) => {
    const text = `NEPAL_LICENSE_API_KEY=${rawKey}`
    navigator.clipboard.writeText(text)
    setCopiedEnv(true)
    toast.success('.env snippet copied to clipboard!')
    setTimeout(() => setCopiedEnv(false), 2500)
  }

  const downloadEnvFile = (rawKey: string) => {
    const text = `# Nepal License Checker API Configuration\nNEPAL_LICENSE_API_KEY=${rawKey}\n`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '.env.local'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('.env.local downloaded!')
  }

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
            void loadAnalytics('7d')
          }
        } else {
          setProfile(null)
          setKeys([])
          setAnalyticsData(null)
        }
      })
      .catch(() => {
        if (isMounted) {
          setProfile(null)
          setAnalyticsData(null)
        }
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
      setAnalyticsData(null)
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

  const handleStartRename = (id: string, currentName: string) => {
    setEditingKeyId(id)
    setEditingName(currentName)
  }

  const handleCancelRename = () => {
    setEditingKeyId(null)
    setEditingName('')
  }

  const handleSaveRename = async (id: string) => {
    const trimmed = editingName.trim()
    if (!trimmed) {
      toast.error('Key name cannot be empty.')
      return
    }

    setSavingRename(true)
    try {
      const res = await fetch(`/api/developer/keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to rename key.')
        return
      }

      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, name: data.name } : k)))
      setEditingKeyId(null)
      toast.success('Key renamed successfully!')
    } catch {
      toast.error('Failed to rename key.')
    } finally {
      setSavingRename(false)
    }
  }

  const handleRotateKey = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to rotate the secret for "${name}"?\n\nThe current key will stop working immediately. You will be provided with a fresh secret key.`
      )
    ) {
      return
    }

    setRotatingKeyId(id)
    try {
      const res = await fetch(`/api/developer/keys/${id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to rotate key.')
        return
      }

      setKeys((prev) => prev.map((k) => (k.id === id ? data.key : k)))
      setNewKeyModal({ rawKey: data.rawKey, key: data.key })
      setTestApiKey(data.rawKey)
      toast.success('Key rotated! Please copy your new secret.')
    } catch {
      toast.error('Failed to rotate key.')
    } finally {
      setRotatingKeyId(null)
    }
  }

  const handleRunApiTest = async () => {
    const num = testLicenseNumber.trim()
    if (!num) {
      toast.error('Please enter a license number to test.')
      return
    }

    setTestLoading(true)
    setTestResult(null)
    setTestStatus(null)
    setTestHeaders(null)
    setTestDuration(null)

    const t0 = performance.now()
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (testApiKey.trim()) {
        headers['x-api-key'] = testApiKey.trim()
      }

      const res = await fetch(`/api/license?number=${encodeURIComponent(num)}`, { headers })
      const duration = Math.round(performance.now() - t0)
      setTestDuration(duration)
      setTestStatus(res.status)

      setTestHeaders({
        limit: res.headers.get('x-ratelimit-limit'),
        remaining: res.headers.get('x-ratelimit-remaining'),
        reset: res.headers.get('x-ratelimit-reset'),
      })

      const data = await res.json()
      setTestResult(data)

      setConsoleHistory((prev) => [
        {
          id: Math.random().toString(36).slice(2),
          duration,
          status: res.status,
          timestamp: Date.now(),
          number: num,
        },
        ...prev,
      ].slice(0, 10))

      void loadAnalytics(timeframe)
    } catch (err: unknown) {
      const duration = Math.round(performance.now() - t0)
      setTestDuration(duration)
      setTestStatus(500)
      setTestResult({ error: 'Network request failed or server unreachable.', details: String(err) })

      setConsoleHistory((prev) => [
        {
          id: Math.random().toString(36).slice(2),
          duration,
          status: 500,
          timestamp: Date.now(),
          number: num,
        },
        ...prev,
      ].slice(0, 10))
    } finally {
      setTestLoading(false)
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

  const activeKeySample =
    newKeyModal?.rawKey ||
    (keys.find((k) => k.is_active)?.key_prefix || (keys.length > 0 ? `${keys[0].key_prefix}` : 'nlc_live_your_api_key_here'))

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 sm:px-6 sm:py-12 flex flex-col items-center justify-center text-[var(--text-primary)] transition-colors">
        <div className="h-9 w-9 animate-spin rounded-full border-3 border-[var(--nepal-blue)] border-t-transparent" />
        <p className="text-xs text-[var(--text-muted)] font-medium mt-3">Authenticating developer session...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 sm:px-6 sm:py-12 text-[var(--text-primary)] transition-colors">
        <div className="relative mx-auto max-w-5xl space-y-8">
          {/* Navigation Bar */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-default)] pb-5">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition group"
              >
                <span className="transition-transform group-hover:-translate-x-0.5">←</span>
                <span>Back to Home</span>
              </Link>
              <span className="text-[var(--border-default)]">/</span>
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--nepal-blue)]" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Developer Platform</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1 font-mono text-xs font-bold text-[var(--text-secondary)] shadow-2xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>API v1.1.0 • 60 req/min</span>
              </span>
              <Link
                href="/developer/docs"
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition shadow-2xs"
              >
                <span>SDK Docs</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl font-bold hover:bg-[var(--danger)]/20 transition cursor-pointer"
                aria-label="Dismiss error banner"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* STATE A: GUEST (UNAUTHENTICATED DEVELOPER LANDING) */}
          <div className="space-y-10 animate-rise-in">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-7 sm:p-10 lg:p-12 shadow-sm">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-90" />
              <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[var(--nepal-blue)]/8 blur-3xl -z-0" aria-hidden="true" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                {/* Left Column: Copy & Actions */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue)]/10 px-3.5 py-1 text-xs font-bold text-[var(--nepal-blue)] shadow-2xs">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                      <path d="M12 9V4s3.03.55 4 2c1.08 1.62 0 5 0 5" />
                    </svg>
                    <span>Dedicated Developer Tier</span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
                    Integrate Nepal Driving License Verification with 4x Higher Limits
                  </h1>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Connect your web applications, mobile apps, and automated workflows directly to the mirrored Department of Transport Management (DOTM) database with sustained <strong>60 requests/minute</strong> quota and zero lockout penalties.
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <a
                      href="/api/developer/auth/github"
                      onClick={() => setRedirecting(true)}
                      className="inline-flex min-h-[44px] items-center gap-2.5 rounded-2xl bg-black dark:bg-white text-white dark:text-black px-6 py-3.5 text-sm font-bold shadow-lg shadow-black/10 dark:shadow-white/10 hover:opacity-90 active:scale-98 transition cursor-pointer"
                    >
                      {redirecting ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white dark:border-black border-t-transparent" />
                          <span>Connecting to GitHub...</span>
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                            />
                          </svg>
                          <span>Sign In with GitHub</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </>
                      )}
                    </a>

                    <Link
                      href="/developer/login"
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-3.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition shadow-xs"
                    >
                      <span>Direct Login Portal</span>
                    </Link>
                  </div>

                  {/* Quick-Install SDK Command Bar */}
                  <div className="pt-2">
                    <div className="inline-flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/80 px-3.5 py-2 font-mono text-xs shadow-2xs max-w-full">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[var(--text-muted)] select-none">$</span>
                        <span className="text-[var(--text-primary)] font-bold truncate">npm i nepal-license-checker</span>
                      </div>
                      <button
                        type="button"
                        onClick={copyNpm}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
                        title="Copy npm install command"
                      >
                        {copiedNpm ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)]" aria-hidden="true">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span className="text-[var(--success)]">Copied</span>
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                            </svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Spatial Glass Terminal Preview */}
                <div className="lg:col-span-5 perspective-container">
                  <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/90 backdrop-blur-md shadow-2xl overflow-hidden text-xs font-mono">
                    {/* Window Titlebar */}
                    <div className="flex items-center justify-between border-b border-[var(--border-default)] px-3.5 py-2.5 bg-[var(--surface-primary)]/80">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
                        GET /api/license
                      </span>
                    </div>

                    {/* Terminal Body */}
                    <div className="p-3.5 space-y-2.5 text-[11px] leading-relaxed select-none">
                      <div className="flex items-center justify-between pb-2 border-b border-[var(--border-default)]/60 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5">
                            HTTP 200 OK
                          </span>
                          <span className="text-[var(--text-muted)]">~38ms edge</span>
                        </div>
                        <div className="flex items-center gap-1 text-[var(--text-muted)]">
                          <span>Limit:</span>
                          <span className="text-[var(--nepal-blue)] font-bold">60</span>
                          <span className="ml-1">Remaining:</span>
                          <span className="text-[var(--success)] font-bold">59</span>
                        </div>
                      </div>

                      <pre className="text-[10.5px] leading-relaxed text-[var(--text-primary)] overflow-x-auto">
{`{
  "status": "success",
  "isReady": true,
  "data": {
    "license_number": "01-01-12345678",
    "holder_name": "Nischal Acharya",
    "license_status": "PRINTED_READY",
    "office": "Jhapa"
  }
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-2.5 shadow-2xs hover-lift dev-glass-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">60 Requests / Minute</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  4x higher than standard public searches. Standard sliding window throttling with zero lockout penalties.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-2.5 shadow-2xs hover-lift dev-glass-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--success)]/10 text-[var(--success)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1-1-1.5 1.5L7 8l-5 5a4 4 0 0 0 6 6l5-5-1.5-1.5L13 11l1.5 1.5 3.5-3.5" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Hashed API Keys</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Manage up to 3 live keys. Keys are hashed with SHA-256 for military-grade storage security.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-2.5 shadow-2xs hover-lift dev-glass-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-red)]/10 text-[var(--nepal-red)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="16.5 9.4 7.55 4.24" />
                    <polyline points="21 16 12 21 3 16" />
                    <polyline points="3.29 7 12 12 20.71 7" />
                    <line x1="12" y1="22" x2="12" y2="12" />
                    <path d="m12 2 9 5-9 5-9-5 9-5z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Official TypeScript SDK</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Zero-dependency client library available on npm Registry and GitHub Packages with full typing.
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 space-y-2.5 shadow-2xs hover-lift dev-glass-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">RFC Rate Headers</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Responses return standard <code className="font-mono text-[10.5px]">X-RateLimit-*</code> and <code className="font-mono text-[10.5px]">Retry-After</code> HTTP headers.
                </p>
              </div>
            </div>

            {/* Visual Performance Showcase */}
            <DeveloperShowcaseChart />

            {/* Comparison Box */}
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-8 space-y-5 shadow-sm dev-glass-card">
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

          {/* Landing Footer */}
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

  // =================================================================
  // STATE B: AUTHENTICATED DEVELOPER DASHBOARD WITH SIDEBAR
  // =================================================================
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors">
      <DeveloperMobileDeviceWarning />
      {/* Ambient background glows */}
      <div
        className="pointer-events-none fixed -top-40 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-[var(--nepal-blue)]/10 via-[var(--nepal-red)]/5 to-transparent blur-3xl opacity-60"
        aria-hidden
      />

      {/* Persistent Left Sidebar (Desktop) & Slide-Over Drawer (Mobile) */}
      <DeveloperSidebar
        profile={profile}
        keys={keys}
        activeSection={activeSection}
        onSectionClick={scrollToSection}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Content Viewport (offset on desktop by md:pl-20 or md:pl-64) */}
      <div className={`${sidebarCollapsed ? 'md:pl-20' : 'md:pl-64'} flex flex-col min-h-screen transition-all duration-300 ease-in-out`}>
        {/* Sticky Utility Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-primary)]/85 px-4 sm:px-8 backdrop-blur-md transition-all shadow-2xs">
          {/* Mobile Toggle & Active Breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition shadow-2xs cursor-pointer shrink-0"
              aria-label="Open navigation sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="flex items-center gap-2 text-xs truncate">
              <span className="font-extrabold tracking-tight text-[var(--nepal-blue)] hidden sm:inline-flex items-center gap-1.5 shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Developer Portal</span>
              </span>
              <span className="text-[var(--border-default)] hidden sm:inline">/</span>
              <span className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                {activeSection === 'section-overview'
                  ? 'Overview & Metrics'
                  : activeSection === 'section-analytics'
                  ? 'Telemetry & Graphs'
                  : activeSection === 'section-keys'
                  ? 'API Keys Management'
                  : activeSection === 'section-quickstart'
                  ? 'Code Integration'
                  : activeSection === 'section-console'
                  ? 'Live API Sandbox'
                  : 'HTTP Response Specs'}
              </span>
            </div>
          </div>

          {/* Quick Actions & Telemetry Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Live Tier Badge */}
            <div className="hidden lg:flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>60 req/min Tier</span>
            </div>

            {/* Active Keys Pill */}
            {keys.length > 0 && (
              <button
                type="button"
                onClick={() => scrollToSection('section-keys')}
                className="hidden xl:inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer shadow-2xs"
                title="Manage active API keys"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]" aria-hidden="true">
                  <path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1-1-1.5 1.5L7 8l-5 5a4 4 0 0 0 6 6l5-5-1.5-1.5L13 11l1.5 1.5 3.5-3.5" />
                </svg>
                <span className="text-[var(--nepal-blue)]">
                  {keys.filter((k) => k.is_active).length} Active
                </span>
                {keys.some((k) => !k.is_active) && (
                  <span className="rounded-md bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[10px] text-rose-600 dark:text-rose-400 font-extrabold">
                    {keys.filter((k) => !k.is_active).length} Suspended
                  </span>
                )}
              </button>
            )}

            {/* SDK Docs Link */}
            <Link
              href="/developer/docs"
              className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition shadow-2xs shrink-0 flex items-center gap-1.5"
            >
              <span>Docs</span>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </Link>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mx-4 sm:mx-8 mt-4 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-xs font-medium text-[var(--danger)] flex items-start justify-between gap-3 animate-fade-in shadow-sm">
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
              aria-label="Dismiss error banner"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Suspended Keys Notice Banner */}
        {keys.some((k) => !k.is_active) && (
          <div className="mx-4 sm:mx-8 mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-3 animate-fade-in shadow-xs">
            <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0 text-sm font-bold">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div className="flex-1 space-y-0.5">
              <p className="font-bold text-rose-800 dark:text-rose-200">
                Action Notice: API Key Suspended by Administrator
              </p>
              <p className="leading-relaxed opacity-95">
                {keys.filter((k) => !k.is_active).length === 1
                  ? `One of your API keys ("${keys.find((k) => !k.is_active)?.name}") has been suspended by an administrator.`
                  : `${keys.filter((k) => !k.is_active).length} of your API keys have been suspended by an administrator.`}{' '}
                Any API requests utilizing suspended keys will fail with <code className="font-mono bg-rose-500/20 px-1 py-0.5 rounded font-bold text-[11px]">403 Forbidden (API_KEY_SUSPENDED)</code>. Review details in the{' '}
                <button
                  type="button"
                  onClick={() => scrollToSection('section-keys')}
                  className="font-bold underline hover:text-rose-950 dark:hover:text-white cursor-pointer"
                >
                  API Keys section
                </button>{' '}
                below or contact support for reactivation.
              </p>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 max-w-6xl w-full mx-auto space-y-8 animate-fade-in">
          {/* SECTION 1: OVERVIEW */}
          <div id="section-overview" className="space-y-6 scroll-mt-24">

            {/* Quick-Start Onboarding Checklist for New Developers (shown if 0 keys) */}
            {keys.length === 0 && (
              <div className="rounded-3xl border border-[var(--nepal-blue)]/30 bg-gradient-to-br from-[var(--nepal-blue)]/10 via-[var(--surface-primary)] to-[var(--surface-primary)] p-6 sm:p-7 shadow-sm space-y-4 animate-rise-in dev-glass-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--nepal-blue)] text-white text-sm font-bold shadow-xs">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Quick Setup Checklist</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Get your first API request running in under 2 minutes.</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[var(--nepal-blue)]/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20">
                    1 of 3 Complete
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 shadow-2xs">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)] text-white text-xs font-bold">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">1. GitHub Connected</span>
                      <span className="text-[10.5px] text-[var(--text-muted)]">@{profile.username} verified</span>
                    </div>
                  </div>

                  <a
                    href="#section-keys"
                    className="flex items-center gap-3 rounded-2xl border border-[var(--nepal-blue)]/40 bg-[var(--nepal-blue)]/5 p-3.5 shadow-2xs hover:border-[var(--nepal-blue)] transition cursor-pointer group"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--nepal-blue)] text-[var(--nepal-blue)] text-xs font-bold group-hover:bg-[var(--nepal-blue)] group-hover:text-white transition">
                      2
                    </span>
                    <div>
                      <span className="text-xs font-bold text-[var(--nepal-blue)] block">2. Generate API Key</span>
                      <span className="text-[10.5px] text-[var(--text-muted)]">Click to create first key →</span>
                    </div>
                  </a>

                  <a
                    href="#section-console"
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3.5 shadow-2xs hover:border-[var(--text-secondary)] transition cursor-pointer"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--border-default)] text-[var(--text-muted)] text-xs font-bold">
                      3
                    </span>
                    <div>
                      <span className="text-xs font-bold text-[var(--text-primary)] block">3. Run Test Query</span>
                      <span className="text-[10.5px] text-[var(--text-muted)]">Try Live Console below</span>
                    </div>
                  </a>
                </div>
              </div>
            )}

            {/* Developer Profile Header Card */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 sm:p-7 shadow-sm dev-glass-card">
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success)]/10 px-2.5 py-0.5 text-[10px] font-bold text-[var(--success)]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Verified Developer</span>
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
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--danger)] hover:border-[var(--danger)]/40 transition cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* 4 Metric KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
              <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 space-y-2 shadow-2xs hover-lift transition-all duration-200 hover:border-[var(--nepal-blue)]/40 hover:shadow-sm dev-glass-card">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-80" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Quota Limit</span>
                  <div className="h-7 w-7 rounded-lg bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">60 <span className="text-xs font-normal text-[var(--text-secondary)]">req/min</span></p>
                <span className="inline-flex items-center gap-1 rounded bg-[var(--nepal-blue)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--nepal-blue)]" />
                  <span>Elevated Tier</span>
                </span>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 space-y-2 shadow-2xs hover-lift transition-all duration-200 hover:border-[var(--success)]/40 hover:shadow-sm dev-glass-card">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--success)] to-transparent opacity-80" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Rate Window</span>
                  <div className="h-7 w-7 rounded-lg bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">60s <span className="text-xs font-normal text-[var(--text-secondary)]">sliding</span></p>
                <span className="inline-block rounded bg-[var(--success)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--success)]">
                  0s Lockout Penalty
                </span>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 space-y-2 shadow-2xs hover-lift transition-all duration-200 hover:border-[var(--nepal-blue)]/40 hover:shadow-sm dev-glass-card">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Active Keys</span>
                  <div className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1-1-1.5 1.5L7 8l-5 5a4 4 0 0 0 6 6l5-5-1.5-1.5L13 11l1.5 1.5 3.5-3.5" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                  {keys.filter((k) => k.is_active).length} <span className="text-xs font-normal text-[var(--text-secondary)]">/ {maxKeys} max</span>
                </p>
                {keys.some((k) => !k.is_active) ? (
                  <span className="inline-block rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    {keys.filter((k) => !k.is_active).length} suspended by admin
                  </span>
                ) : (
                  <span className="inline-block rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
                    {maxKeys - keys.length} available
                  </span>
                )}
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 space-y-2 shadow-2xs hover-lift transition-all duration-200 hover:border-purple-500/40 hover:shadow-sm dev-glass-card">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-80" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Total Queries</span>
                  <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                  {keys.reduce((sum, k) => sum + (k.total_requests || 0), 0).toLocaleString()}
                </p>
                <span className="inline-block rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  Lifetime Calls
                </span>
              </div>
            </div>
          </div>

          {/* API Analytics & Visual Traffic Section */}
          <div id="section-analytics" className="dev-glass-card rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24 transition-all duration-300 relative overflow-hidden">
            {/* Ambient decorative backdrop blur */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[var(--nepal-blue)]/5 blur-3xl" />

            <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    API Analytics & Traffic Visualizer
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--nepal-blue)]/10 px-2.5 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--nepal-blue)] animate-pulse" />
                    Live Telemetry
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Monitor request throughput, rate limits, status distribution, and edge response latency.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {analyticsData && (
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[var(--text-muted)]">Success Rate:</span>
                      <span className="font-bold text-[var(--success)]">{analyticsData.summary.successRate}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500" aria-hidden="true">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      <span className="text-[var(--text-muted)]">Avg Latency:</span>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        {analyticsData.summary.avgLatencyMs}ms
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Controls Group (Refresh + Auto Toggle) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void loadAnalytics(timeframe, true)}
                    disabled={analyticsLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)]/40 transition cursor-pointer active:scale-95 shadow-2xs shrink-0"
                    title="Force refresh telemetry from server (bypasses cache)"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`text-[var(--text-muted)] ${analyticsLoading ? 'animate-spin text-[var(--nepal-blue)]' : ''}`}
                      aria-hidden="true"
                    >
                      <path d="M21 2v6h-6" />
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                      <path d="M3 22v-6h6" />
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                    </svg>
                    <span>Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAutoRefresh((prev) => !prev)}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium transition cursor-pointer shadow-2xs w-[86px] min-w-[86px] shrink-0 ${
                      autoRefresh
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--nepal-blue)]/30'
                    }`}
                    title={autoRefresh ? '30s auto-refresh active (pauses when tab is hidden to save DB reads)' : 'Enable 30s auto-refresh'}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                    <span>{autoRefresh ? 'Auto: 30s' : 'Auto: Off'}</span>
                  </button>
                </div>
              </div>
            </div>

              {/* Responsive Grid: Main Chart (left) and Gauges/Breakdown (right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Traffic Volume & Status Chart (2 cols) */}
                <div className="lg:col-span-2">
                  <DeveloperTrafficChart
                    timeline={analyticsData?.timeline || []}
                    timeframe={timeframe}
                    onTimeframeChange={handleTimeframeChange}
                    isSampleData={analyticsData?.isSampleData}
                    loading={analyticsLoading}
                  />
                </div>

                {/* Quota Gauge and Key Distribution (1 col) */}
                <div className="space-y-6">
                  <DeveloperQuotaGauge
                    limit={analyticsData?.quota.limit ?? 60}
                    used={analyticsData?.quota.used ?? 0}
                    remaining={analyticsData?.quota.remaining ?? 60}
                    resetInSeconds={analyticsData?.quota.resetInSeconds ?? 0}
                  />

                  <DeveloperKeyDistribution
                    keysBreakdown={analyticsData?.keysBreakdown || []}
                  />
                </div>
              </div>
            </div>

            {/* API Keys Management Card */}
            <div id="section-keys" className="dev-glass-card rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 scroll-mt-24 transition-all duration-300 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-default)] pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="7.5" cy="15.5" r="5.5" />
                      <path d="m21 2-9.6 9.6" />
                      <path d="m15.5 7.5 3 3L22 7l-3-3" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">API Keys</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Keys authenticate requests from your servers or via the <code className="font-mono text-[var(--nepal-blue)]">nepal-license-checker</code> SDK.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{keys.filter((k) => k.is_active).length} of {maxKeys} active</span>
                  </span>
                  {keys.some((k) => !k.is_active) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      <span>{keys.filter((k) => !k.is_active).length} suspended</span>
                    </span>
                  )}
                </div>
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
                      className="flex-1 min-w-[240px] rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-hidden transition shadow-2xs"
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
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
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
                            : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)]/30'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-muted)] flex items-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)] shrink-0" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
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
                      className={`hover-lift flex flex-col gap-3.5 rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all duration-300 ${
                        k.is_active
                          ? 'border-[var(--border-default)] bg-[var(--surface-primary)] hover:border-[var(--nepal-blue)]/50'
                          : 'border-rose-500/40 bg-rose-500/[0.03] hover:border-rose-500/60'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3.5">
                        <div className="space-y-2 flex-1 min-w-[260px]">
                          {editingKeyId === k.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    void handleSaveRename(k.id)
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault()
                                    handleCancelRename()
                                  }
                                }}
                                maxLength={50}
                                className="rounded-lg border border-[var(--nepal-blue)] bg-[var(--surface-primary)] px-2.5 py-1 text-xs font-bold text-[var(--text-primary)] focus:outline-hidden"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(k.id)}
                                disabled={savingRename}
                                className="rounded-lg bg-[var(--nepal-blue)] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90 transition cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelRename}
                                className="rounded-lg border border-[var(--border-default)] px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="font-bold text-sm text-[var(--text-primary)]">{k.name}</span>
                              <button
                                type="button"
                                onClick={() => handleStartRename(k.id, k.name)}
                                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                title="Rename this key"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                </svg>
                                <span>Rename</span>
                              </button>
                              {k.is_active ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success)]/10 px-2.5 py-0.5 text-xs font-bold text-[var(--success)] border border-[var(--success)]/20">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                  </svg>
                                  Suspended by Admin
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[var(--text-secondary)] font-mono">
                            <span className="rounded-lg bg-[var(--bg-secondary)] px-2.5 py-1 border border-[var(--border-default)] font-bold text-[var(--text-primary)]">
                              {k.key_prefix}
                            </span>
                            <span className="text-[var(--border-default)]">•</span>
                            <span className="text-[var(--nepal-blue)] font-bold tabular-nums">
                              {(k.total_requests || 0).toLocaleString()} queries
                            </span>
                            <span className="text-[var(--border-default)]">•</span>
                            <span className="tabular-nums">{k.rate_limit_per_minute} req/min</span>
                            <span className="text-[var(--border-default)]">•</span>
                            <span className="text-[var(--text-muted)] text-[11px]">
                              Created: {new Date(k.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-[var(--border-default)]">•</span>
                            <span className="text-[var(--text-muted)] text-[11px]">
                              {k.last_used_at ? `Last used: ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used yet'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRotateKey(k.id, k.name)}
                            disabled={rotatingKeyId === k.id || !k.is_active}
                            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition shadow-2xs ${
                              !k.is_active
                                ? 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-muted)] opacity-50 cursor-not-allowed'
                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)]/50 cursor-pointer active:scale-95'
                            }`}
                            title={!k.is_active ? 'Suspended keys cannot be rotated' : 'Generate a fresh secret key while keeping this key configuration'}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className={rotatingKeyId === k.id ? 'animate-spin text-[var(--nepal-blue)]' : ''}
                              aria-hidden="true"
                            >
                              <path d="M21 2v6h-6" />
                              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                              <path d="M3 22v-6h6" />
                              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                            </svg>
                            <span>{rotatingKeyId === k.id ? 'Rotating...' : 'Rotate Secret'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(k.id, k.name)}
                            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3.5 py-2 text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)] hover:text-white transition active:scale-95 cursor-pointer shadow-2xs"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Revoke Key</span>
                          </button>
                        </div>
                      </div>

                      {/* Suspended Alert Banner inside Key Card */}
                      {!k.is_active && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 shrink-0 mt-0.5" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                          <div className="space-y-0.5">
                            <p className="font-bold">This API key was suspended by an administrator.</p>
                            <p className="text-[11px] opacity-90 leading-relaxed">
                              All API requests attempting to authorize with this key will fail with <code className="font-mono font-bold bg-rose-500/20 px-1 py-0.5 rounded text-[11px]">HTTP 403 (API_KEY_SUSPENDED)</code>. If you need reactivation or believe this was done in error, please reach out to admin support or revoke this key and generate a fresh one.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quickstart Integration Code Card */}
            <div id="section-quickstart" className="dev-glass-card rounded-3xl p-6 sm:p-8 shadow-sm space-y-5 scroll-mt-24 transition-all duration-300 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Quick Integration Guide</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Pre-populated with your active API key. Send via <code className="font-mono text-[var(--nepal-blue)]">apiKey</code> in SDK or <code className="font-mono text-[var(--nepal-blue)]">x-api-key</code> HTTP header.
                    </p>
                  </div>
                </div>

                <div className="flex rounded-xl border border-[var(--border-default)] p-1 bg-[var(--bg-secondary)] shadow-2xs">
                  {(['sdk', 'curl', 'fetch', 'python'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCodeTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        codeTab === tab
                          ? 'bg-[var(--surface-primary)] text-[var(--nepal-blue)] shadow-xs'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {tab === 'sdk' ? 'TypeScript SDK' : tab === 'curl' ? 'cURL' : tab === 'fetch' ? 'Fetch API' : 'Python'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Display with Terminal Chrome */}
              <div className="relative rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--surface-primary)]/80 px-4 py-2.5 backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-[#ff5f56] border border-black/10" />
                      <div className="h-3 w-3 rounded-full bg-[#ffbd2e] border border-black/10" />
                      <div className="h-3 w-3 rounded-full bg-[#27c93f] border border-black/10" />
                    </div>
                    <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">
                      {codeTab === 'sdk' ? 'license-client.ts' : codeTab === 'curl' ? 'request.sh' : codeTab === 'fetch' ? 'fetch-example.js' : 'verify.py'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(getCodeSnippet(), true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)]/40 transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    {copiedCode ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="overflow-x-auto p-4 sm:p-5 font-mono text-xs leading-relaxed text-[var(--text-primary)]">
                  <code>{getCodeSnippet()}</code>
                </pre>
              </div>
            </div>

            {/* Live Interactive API Tester & Console */}
            <div id="section-console" className="dev-glass-card rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm scroll-mt-24 transition-all duration-300 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)] pb-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mt-0.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">Live API Tester & Console</h2>
                      <span className="rounded-full bg-[var(--nepal-blue)]/10 px-2.5 py-0.5 text-[10px] font-bold text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20">
                        Interactive Sandbox
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Execute live test queries against the mirrored DOTM database with your active API key and inspect RFC rate-limit headers in real-time.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 shadow-2xs font-mono text-xs">
                  <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    GET
                  </span>
                  <span className="text-[var(--text-muted)]">/api/license</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left Column: Request Form */}
                <div className="space-y-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4 sm:p-5">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                      Authorization Key:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={testApiKey}
                        onChange={(e) => setTestApiKey(e.target.value)}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault()
                            void handleRunApiTest()
                          }
                        }}
                        placeholder={newKeyModal?.rawKey || 'Paste raw nlc_live_... key (or leave empty for public search)'}
                        className="flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-hidden transition shadow-2xs"
                      />
                      {newKeyModal && (
                        <button
                          type="button"
                          onClick={() => setTestApiKey(newKeyModal.rawKey)}
                          className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition shrink-0 cursor-pointer shadow-2xs active:scale-95"
                        >
                          Use Fresh Key
                        </button>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1.5 block">
                      Leave blank to test anonymous public search (15 req/min with lockout), or paste your API key for elevated 60 req/min limits.
                    </span>
                    {keys.length > 0 && keys.every((k) => !k.is_active) && (
                      <div className="mt-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 shrink-0" aria-hidden="true">
                          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>All your API keys are suspended by an administrator. Live sandbox queries with these keys will fail with HTTP 403.</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                      Driving License Number:
                    </label>
                    <input
                      type="text"
                      value={testLicenseNumber}
                      onChange={(e) => setTestLicenseNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault()
                          void handleRunApiTest()
                        }
                      }}
                      placeholder="e.g. 01-01-12345678 or ०१-०१-१२३४५६७८"
                      className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:border-[var(--nepal-blue)] focus:outline-hidden transition shadow-2xs"
                    />

                    {/* Pre-filled Sample Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      <span className="text-[10.5px] text-[var(--text-muted)]">Test Samples:</span>
                      {[
                        { label: 'Sample 1', val: '01-01-12345678' },
                        { label: 'Nepali Digits', val: '०१-०१-१२३४५६७८' },
                        { label: 'Sample 2', val: '01-02-87654321' },
                      ].map((sample) => (
                        <button
                          key={sample.label}
                          type="button"
                          onClick={() => setTestLicenseNumber(sample.val)}
                          className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                        >
                          {sample.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleRunApiTest}
                      disabled={testLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-90 active:scale-98 disabled:opacity-50 transition cursor-pointer"
                    >
                      {testLoading ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Querying Database Mirror...</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>Send Test Request</span>
                        </>
                      )}
                    </button>
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--text-muted)] pt-1.5 font-medium">
                      <span>Pro-tip: Press</span>
                      <kbd className="rounded border border-[var(--border-default)] bg-[var(--surface-primary)] px-1.5 py-0.5 font-mono text-[9px] font-bold shadow-2xs">
                        Ctrl / ⌘
                      </kbd>
                      <span>+</span>
                      <kbd className="rounded border border-[var(--border-default)] bg-[var(--surface-primary)] px-1.5 py-0.5 font-mono text-[9px] font-bold shadow-2xs">
                        Enter
                      </kbd>
                      <span>to execute</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Response & Header Inspector */}
                <div className="space-y-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-default)]">
                      <span className="text-xs font-bold text-[var(--text-primary)]">Response Inspector</span>
                      {testResult && (
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span
                            className={`rounded px-1.5 py-0.5 font-bold ${
                              testStatus && testStatus < 300
                                ? 'bg-[var(--success)]/15 text-[var(--success)]'
                                : testStatus === 429
                                ? 'bg-[var(--danger)]/15 text-[var(--danger)]'
                                : testStatus === 403
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            HTTP {testStatus} {testStatus === 403 && '(Suspended)'}
                          </span>
                          {testDuration !== null && (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 text-[var(--text-muted)] font-medium">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500" aria-hidden="true">
                                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                </svg>
                                <span>{testDuration}ms</span>
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9.5px] font-bold ${
                                  testDuration < 60
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : testDuration < 150
                                    ? 'bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]'
                                    : 'bg-zinc-500/10 text-[var(--text-muted)]'
                                }`}
                              >
                                {testDuration < 60 ? '⚡ Ultra-Fast (<60ms)' : testDuration < 150 ? '⚡ Fast Edge' : 'Standard'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Live Header Metrics */}
                    {testHeaders && (
                      <div className="grid grid-cols-3 gap-2 py-2.5 text-[10.5px] font-mono border-b border-[var(--border-default)]">
                        <div>
                          <span className="text-[var(--text-muted)] block">Quota Limit</span>
                          <span className="font-bold text-[var(--text-primary)]">{testHeaders.limit || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Remaining</span>
                          <span className="font-bold text-[var(--nepal-blue)]">{testHeaders.remaining || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Reset Timestamp</span>
                          <span className="font-bold text-[var(--text-primary)]">{testHeaders.reset || '-'}</span>
                        </div>
                      </div>
                    )}

                    {/* Suspended Key Callout if 403 received */}
                    {testStatus === 403 && (
                      <div className="mt-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-500 shrink-0 mt-0.5" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        <div className="space-y-0.5">
                          <p className="font-bold">Key Suspended by Administrator</p>
                          <p className="text-[11px] opacity-90 leading-relaxed">
                            {(testResult as { error?: string })?.error ||
                              'This API key has been suspended by an administrator. Requests cannot be completed.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {consoleHistory.length > 0 && (
                      <div className="mt-2.5">
                        <LiveConsoleSparkline history={consoleHistory} />
                      </div>
                    )}

                    <div className="mt-2.5">
                      <pre className="overflow-x-auto max-h-56 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 font-mono text-[11px] text-[var(--text-primary)] leading-relaxed select-all">
                        <code>
                          {testResult
                            ? JSON.stringify(testResult, null, 2)
                            : '// Click "Send Test Request" to execute a live query against /api/license'}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* HTTP API Reference Table */}
            <div id="section-specs" className="dev-glass-card rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm text-xs scroll-mt-24 transition-all duration-300 relative overflow-hidden">
              <div className="flex items-start gap-3 border-b border-[var(--border-default)] pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)] border border-[var(--nepal-blue)]/20 mt-0.5">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                    <path d="M6 6h10" />
                    <path d="M6 10h10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">HTTP Response Headers Specification</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    The license API mirrors all standard RFC rate-limiting headers with each request:
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/40">
                <table className="w-full text-left font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--surface-primary)]/80 text-[var(--text-secondary)]">
                      <th className="py-3 px-4 font-bold">Header</th>
                      <th className="py-3 px-4 font-bold">Description</th>
                      <th className="py-3 px-4 font-bold">Example Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                    <tr className="hover:bg-[var(--surface-primary)]/40 transition">
                      <td className="py-3 px-4 font-semibold text-[var(--nepal-blue)]">
                        <span className="rounded-md bg-[var(--nepal-blue)]/10 px-2 py-0.5 border border-[var(--nepal-blue)]/20">
                          X-RateLimit-Limit
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-[var(--text-secondary)]">Total requests allowed within the 60s sliding window</td>
                      <td className="py-3 px-4 text-[var(--text-primary)] font-bold">60</td>
                    </tr>
                    <tr className="hover:bg-[var(--surface-primary)]/40 transition">
                      <td className="py-3 px-4 font-semibold text-[var(--nepal-blue)]">
                        <span className="rounded-md bg-[var(--nepal-blue)]/10 px-2 py-0.5 border border-[var(--nepal-blue)]/20">
                          X-RateLimit-Remaining
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-[var(--text-secondary)]">Remaining requests before hitting the 429 rate threshold</td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">58</td>
                    </tr>
                    <tr className="hover:bg-[var(--surface-primary)]/40 transition">
                      <td className="py-3 px-4 font-semibold text-[var(--nepal-blue)]">
                        <span className="rounded-md bg-[var(--nepal-blue)]/10 px-2 py-0.5 border border-[var(--nepal-blue)]/20">
                          X-RateLimit-Reset
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-[var(--text-secondary)]">Unix epoch timestamp when current rate limit window resets</td>
                      <td className="py-3 px-4 text-[var(--text-muted)]">1760688000</td>
                    </tr>
                    <tr className="hover:bg-[var(--surface-primary)]/40 transition">
                      <td className="py-3 px-4 font-semibold text-[var(--nepal-red)]">
                        <span className="rounded-md bg-rose-500/10 px-2 py-0.5 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                          Retry-After
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-[var(--text-secondary)]">Returned on HTTP 429 indicating seconds to wait before retry</td>
                      <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-bold">35</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Developer Dashboard Footer */}
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
          </main>
        </div>

        {/* Modal: Reveal New Key (Shown Once) */}
        {newKeyModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="dev-glass-card relative w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-rise-in border border-[var(--border-default)] overflow-hidden">
              {/* Top ambient highlight */}
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl" />

              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">New API Key Generated</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{newKeyModal.key.name}</p>
                </div>
              </div>

              <div className="relative rounded-2xl border border-[var(--nepal-red)]/30 bg-[var(--nepal-red)]/10 p-3.5 text-xs text-[var(--nepal-red)] font-medium leading-relaxed flex items-start gap-2.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-red)] shrink-0 mt-0.5" aria-hidden="true">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <strong>Important Security Notice:</strong> Please copy this key now. For your security, this raw key will <strong>never be shown again</strong>. If lost, you will need to revoke it and generate a new key.
                </div>
              </div>

              {/* Raw Key Display Box */}
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 font-mono text-xs select-all shadow-inner">
                <span className="truncate text-[var(--text-primary)] font-bold">{newKeyModal.rawKey}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(newKeyModal.rawKey)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer shrink-0 shadow-xs"
                >
                  {copiedKey ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      <span>Copy Key</span>
                    </>
                  )}
                </button>
              </div>

              {/* One-Click .env Snippet Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => copyEnvSnippet(newKeyModal.rawKey)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] transition cursor-pointer shadow-2xs active:scale-95"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  </svg>
                  <span>{copiedEnv ? '✓ Copied .env!' : 'Copy .env Snippet'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadEnvFile(newKeyModal.rawKey)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer shadow-2xs active:scale-95"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download .env.local</span>
                </button>
              </div>

              {/* Instant Test Command Preview with Terminal Chrome */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] block">Instant Test cURL:</span>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[var(--border-default)] bg-[var(--surface-primary)]/60">
                    <div className="h-2 w-2 rounded-full bg-[#ff5f56]" />
                    <div className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
                    <div className="h-2 w-2 rounded-full bg-[#27c93f]" />
                    <span className="ml-1 font-mono text-[9.5px] text-[var(--text-muted)]">bash</span>
                  </div>
                  <pre className="overflow-x-auto p-2.5 font-mono text-[10.5px] text-[var(--text-primary)] leading-relaxed">
                    <code>{`curl -H "x-api-key: ${newKeyModal.rawKey}" "https://license-checker.acharyanischal.com.np/api/license?number=01-01-12345678"`}</code>
                  </pre>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setNewKeyModal(null)}
                  className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-primary)] hover:border-[var(--nepal-blue)]/40 transition cursor-pointer shadow-2xs active:scale-95"
                >
                  I Have Saved My Key
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
