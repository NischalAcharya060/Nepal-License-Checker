'use client'

import Image from 'next/image'
import Link from 'next/link'

export interface AdminLoginProps {
    inactivityNotice?: string | null
    setInactivityNotice?: (val: string | null) => void
    isConfigured?: boolean
    passkeysSupported?: boolean
    passkeyCount?: number
    passkeyLoading?: boolean
    loginSubmitting?: boolean
    handlePasskeyLogin?: () => Promise<void>
    handleLogin?: (e: React.FormEvent) => Promise<void>
    passwordInput?: string
    setPasswordInput?: (val: string) => void
    loginError?: string
    setLoginError?: (val: string) => void
    showPassword?: boolean
    setShowPassword?: (val: boolean) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminLogin(props: any) {
    const {
        inactivityNotice = null,
        setInactivityNotice = () => {},
        isConfigured = true,
        passkeysSupported = false,
        passkeyCount = 0,
        passkeyLoading = false,
        loginSubmitting = false,
        handlePasskeyLogin = async () => {},
        handleLogin = async (e) => e.preventDefault(),
        passwordInput = '',
        setPasswordInput = () => {},
        loginError = '',
        setLoginError = () => {},
        showPassword = false,
        setShowPassword = () => {},
    }: AdminLoginProps = props || {}
    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-4 py-8 overflow-hidden">
            {/* Refined Ambient Background Gradient Glow */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[var(--nepal-blue)]/12 blur-3xl" />
                <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-red-500/8 blur-3xl" />
            </div>

            <div className="relative w-full max-w-md animate-rise-in">
                {/* Brand header */}

                <div className="mb-8 flex flex-col items-center text-center">
                    {/* Logo */}
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] shadow-sm">
                        <Image
                            src="/License-Checker-Nepal-logo.png"
                            alt="Nepal License Checker"
                            width={48}
                            height={48}
                            priority
                            className="h-12 w-12 object-contain"
                        />
                    </div>

                    {/* Security Badge */}
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--nepal-blue)]/15 bg-[var(--nepal-blue)]/[0.06] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--nepal-blue)]">
                        <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Secure Admin Access</span>
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                        Admin Portal
                    </h1>

                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
                        Manage license records and system operations.
                    </p>
                </div>

                {/* Login Card */}
                <div className="relative overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)]/90 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-90" />

                    {inactivityNotice && (
                        <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-3.5 text-xs text-[var(--warning-text)] shadow-xs">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <div className="min-w-0 flex-1">
                                <strong className="block font-bold">Session Timed Out</strong>
                                <p className="mt-0.5 leading-relaxed">{inactivityNotice}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInactivityNotice(null)}
                                className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                                aria-label="Dismiss notice"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {!isConfigured ? (
                        <div className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-xs text-[var(--warning-text)]">
                            <strong className="block font-bold">Admin password is not set.</strong>
                            <p className="mt-1 leading-relaxed">
                                Please set <code className="font-mono font-bold">ADMIN_PASSWORD</code> or <code className="font-mono font-bold">MAINTENANCE_PASSWORD</code> in your environment variables.
                            </p>
                        </div>
                    ) : (
                        <div>
                            {/* Passkey Sign-In Option */}
                            {passkeysSupported && passkeyCount > 0 && (
                                <div className="mb-5">
                                    <button
                                        type="button"
                                        disabled={passkeyLoading || loginSubmitting}
                                        onClick={handlePasskeyLogin}
                                        className="relative flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-[var(--nepal-blue)]/50 bg-gradient-to-r from-[var(--nepal-blue-soft)] to-[var(--nepal-blue)]/10 font-bold text-[var(--nepal-blue)] shadow-sm transition hover:bg-[var(--nepal-blue)] hover:text-white active:scale-98 disabled:opacity-50 cursor-pointer overflow-hidden group"
                                    >
                                        {passkeyLoading ? (
                                            <>
                                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                <span className="text-sm">Verifying Passkey...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--surface-primary)] group-hover:bg-white/20 text-current shadow-2xs">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <circle cx="12" cy="12" r="3" />
                                                        <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0" />
                                                        <path d="M15.54 8.46a5 5 0 0 0-7.08 0M8.46 15.54a5 5 0 0 0 7.08 0" />
                                                    </svg>
                                                </span>
                                                <span className="text-sm">Sign In with Passkey / Biometrics</span>
                                            </>
                                        )}
                                    </button>

                                    <div className="relative my-4 flex items-center justify-center">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-[var(--border-default)]/70" />
                                        </div>
                                        <span className="relative bg-[var(--surface-primary)] px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                            Or sign in with password
                                        </span>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="admin-password"
                                        className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                                    >
                                        Administrator Password
                                    </label>
                                    <div className="relative mt-1.5">
                                        <input
                                            id="admin-password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={passwordInput}
                                            onChange={(e) => {
                                                setPasswordInput(e.target.value)
                                                if (loginError) setLoginError('')
                                                if (inactivityNotice) setInactivityNotice(null)
                                            }}
                                            placeholder="Enter administrator password..."
                                            autoFocus
                                            autoComplete="current-password"
                                            className="h-11 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/70 px-3.5 pr-10 text-sm text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            ) : (
                                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {loginError && (
                                    <div className="flex items-center gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-bg)] p-3 text-xs font-semibold text-[var(--error)] animate-shake shadow-2xs">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <span>{loginError}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loginSubmitting || !passwordInput.trim()}
                                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] font-bold text-white shadow-sm transition hover:bg-[var(--nepal-blue-mid)] active:scale-98 disabled:cursor-not-allowed disabled:bg-[var(--text-muted)] cursor-pointer"
                                >
                                    {loginSubmitting ? (
                                        <>
                                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            <span>Authenticating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Sign In to Dashboard</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                                <polyline points="12 5 19 12 12 19" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="mt-5 border-t border-[var(--border-default)]/60 pt-4 text-center">
                        <Link
                            href="/"
                            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--nepal-blue)]"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            <span>Back to License Checker</span>
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
