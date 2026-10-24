// src/app/developer/login/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DeveloperLoginPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [redirecting, setRedirecting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('error')
    }
    return null
  })

  // If already logged in, redirect straight to /developer dashboard
  useEffect(() => {
    let isMounted = true
    if (errorMessage && typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/developer/login')
    }

    fetch('/api/developer/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return
        if (data?.authenticated) {
          router.replace('/developer')
        } else {
          setCheckingAuth(false)
        }
      })
      .catch(() => {
        if (isMounted) setCheckingAuth(false)
      })

    return () => {
      isMounted = false
    }
  }, [router, errorMessage])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-4 py-12 text-[var(--text-primary)] transition-colors overflow-hidden">
      {/* Refined Ambient Background Gradient Glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[var(--nepal-blue)]/12 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg space-y-6 animate-rise-in">
        {/* Top Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition group"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">←</span>
            <span>Back to Public Search</span>
          </Link>
          <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-0.5 font-mono text-xs font-bold text-[var(--text-muted)] shadow-2xs">
            v1.1.0 API
          </span>
        </div>

        {/* Global Error Notice if redirected from OAuth error */}
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl font-bold hover:bg-[var(--danger)]/20 transition cursor-pointer text-xs"
              aria-label="Dismiss error notice"
            >
              ✕
            </button>
          </div>
        )}

        {/* Premium Developer Login Card */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)]/90 backdrop-blur-xl p-7 sm:p-9 shadow-xl transition-all">
          {/* Subtle top accent gradient */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-90" />

          {/* Brand & Badge Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-2.5 shadow-sm">
              <Image
                src="/License-Checker-Nepal-logo.png"
                alt="Nepal License Checker"
                width={48}
                height={48}
                priority
              />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue)]/10 px-3 py-0.5 text-[11px] font-bold text-[var(--nepal-blue)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                <span>Developer Portal</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                Sign In to Developer Platform
              </h1>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed">
                Unlock elevated query rate limits (60 searches/min) and provision cryptographic API keys for your applications.
              </p>
            </div>
          </div>

          {/* Main Action: GitHub OAuth Button */}
          <div className="mt-8 space-y-4">
            {checkingAuth ? (
              <div className="flex items-center justify-center py-4 space-x-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                <span className="text-xs text-[var(--text-muted)] font-medium">Checking session...</span>
              </div>
            ) : (
              <a
                href="/api/developer/auth/github"
                onClick={() => setRedirecting(true)}
                className="group relative flex min-h-[44px] w-full items-center justify-center gap-3 rounded-2xl bg-black dark:bg-white text-white dark:text-black px-6 py-3.5 text-sm font-bold shadow-lg shadow-black/10 dark:shadow-white/10 hover:opacity-90 active:scale-98 transition duration-200 cursor-pointer"
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
                    <span>Continue with GitHub</span>
                    <span className="font-mono text-xs opacity-75 group-hover:translate-x-0.5 transition-transform">→</span>
                  </>
                )}
              </a>
            )}

            {/* Why GitHub notice */}
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/80 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--nepal-blue)]" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span>Why GitHub Authentication Only?</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                General citizens in Nepal do not require an account to check driving license status. We restrict sign-in to GitHub to verify software engineers, prevent bot abuse, and guarantee 100% spam-free developer quotas.
              </p>
            </div>
          </div>

          {/* Perks Grid */}
          <div className="mt-6 pt-5 border-t border-[var(--border-default)] grid grid-cols-2 gap-3 text-[11px]">
            <div className="flex items-start gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)] shrink-0 mt-0.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[var(--text-secondary)]"><strong>60 req/min</strong> (4x higher limit)</span>
            </div>
            <div className="flex items-start gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)] shrink-0 mt-0.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[var(--text-secondary)]"><strong>Up to 3</strong> live API keys</span>
            </div>
            <div className="flex items-start gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)] shrink-0 mt-0.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[var(--text-secondary)]"><strong>Zero lockout</strong> penalties</span>
            </div>
            <div className="flex items-start gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)] shrink-0 mt-0.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[var(--text-secondary)]"><strong>SDK support</strong> (Node & Browser)</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="space-y-4 pt-2 text-center text-xs">
          <p className="text-[11px] text-[var(--text-muted)]">
            Need help integrating? Check our{' '}
            <Link
              href="/developer/docs"
              className="text-[var(--nepal-blue)] font-semibold hover:underline"
            >
              TypeScript SDK Docs
            </Link>
            .
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)] pt-3 border-t border-[var(--border-default)]">
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
        </div>
      </div>
    </main>
  )
}
