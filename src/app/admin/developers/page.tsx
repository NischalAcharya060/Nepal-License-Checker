// src/app/admin/developers/page.tsx
'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { AdminDeveloper, DeveloperStatsData } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo } from '../helpers'
import AdminPagination from '../AdminPagination'

export interface AdminDevelopersProps {
    developers?: AdminDeveloper[]
    developerStats?: DeveloperStatsData | null
    devTotal?: number
    devPage?: number
    devLimit?: number
    devTotalPages?: number
    devSearchFilter?: string
    devLoading?: boolean
    privacyMode?: boolean
    copiedKey?: string | null
    setDevPage?: (page: number) => void
    setDevLimit?: (limit: number) => void
    setDevSearchFilter?: (filter: string) => void
    copyToClipboard?: (text: string, key: string) => void
    handleToggleKeyActive?: (keyId: string, currentActive: boolean) => Promise<void>
    handleUpdateRateLimit?: (keyId: string, newLimit: number) => Promise<void>
    handleDeleteKey?: (keyId: string, keyName: string) => void
    exportDevelopersCsv?: () => void
    startTransition?: (callback: () => void) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminDevelopers(props: any) {
    const {
        developers = [],
        developerStats = null,
        devTotal = 0,
        devPage = 1,
        devLimit = 10,
        devTotalPages = 1,
        devSearchFilter = '',
        devLoading = false,
        privacyMode = true,
        copiedKey = null,
        setDevPage = () => {},
        setDevLimit = () => {},
        setDevSearchFilter = () => {},
        copyToClipboard = () => {},
        handleToggleKeyActive = async () => {},
        handleUpdateRateLimit = async () => {},
        handleDeleteKey = () => {},
        exportDevelopersCsv = () => {},
        startTransition = (cb) => cb(),
    }: AdminDevelopersProps = props || {}

    const [editingRateKeyId, setEditingRateKeyId] = useState<string | null>(null)
    const [editingRateValue, setEditingRateValue] = useState<number>(60)
    const [savingRate, setSavingRate] = useState(false)

    const handleStartEditRate = (keyId: string, currentRate: number) => {
        setEditingRateKeyId(keyId)
        setEditingRateValue(currentRate)
    }

    const handleSaveRate = async (keyId: string) => {
        setSavingRate(true)
        try {
            await handleUpdateRateLimit(keyId, editingRateValue)
            setEditingRateKeyId(null)
        } finally {
            setSavingRate(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="dev-glass-card hover-lift relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300 space-y-1">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-80" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Registered Devs
                    </span>
                    <div className="flex items-center justify-between">
                        <span className="font-mono tabular-nums text-2xl font-black text-[var(--text-primary)]">
                            {developerStats ? developerStats.totalDevelopers.toLocaleString() : devTotal.toLocaleString()}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-xs shadow-2xs">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                        </span>
                    </div>
                    <span className="text-[10.5px] text-[var(--text-muted)]">OAuth authorized accounts</span>
                </div>

                <div className="dev-glass-card hover-lift relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300 space-y-1">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--success)] to-transparent opacity-80" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Active API Keys
                    </span>
                    <div className="flex items-center justify-between">
                        <span className="font-mono tabular-nums text-2xl font-black text-[var(--success)]">
                            {developerStats ? developerStats.activeKeys.toLocaleString() : 0}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                            / {developerStats ? developerStats.totalKeys.toLocaleString() : 0} total
                        </span>
                    </div>
                    <span className="text-[10.5px] text-[var(--text-muted)]">Elevated rate quotas active</span>
                </div>

                <div className="dev-glass-card hover-lift relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300 space-y-1">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--nepal-blue)] to-transparent opacity-80" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        Total API Queries
                    </span>
                    <div className="flex items-center justify-between">
                        <span className="font-mono tabular-nums text-2xl font-black text-[var(--nepal-blue)]">
                            {developerStats ? developerStats.totalQueries.toLocaleString() : 0}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-2xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                        </span>
                    </div>
                    <span className="text-[10.5px] text-[var(--text-muted)]">Lifetime developer requests</span>
                </div>

                <div className="dev-glass-card hover-lift relative overflow-hidden rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-4 sm:p-5 shadow-sm backdrop-blur-md transition-all duration-300 space-y-1">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                        24h API Volume
                    </span>
                    <div className="flex items-center justify-between">
                        <span className="font-mono tabular-nums text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {developerStats ? developerStats.queriesToday.toLocaleString() : 0}
                        </span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs shadow-2xs">
                            Today
                        </span>
                    </div>
                    <span className="text-[10.5px] text-[var(--text-muted)]">Telemetry logged requests</span>
                </div>
            </div>

            {/* Toolbar: Search, Filters & Export */}
            <div className="dev-glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 p-3.5 sm:p-4 shadow-sm backdrop-blur-md">
                <div className="flex flex-1 items-center gap-2.5 min-w-[240px]">
                    <div className="relative flex-1">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" aria-hidden="true">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            value={devSearchFilter}
                            onChange={(e) => {
                                const val = e.target.value
                                startTransition(() => {
                                    setDevSearchFilter(val)
                                    setDevPage(1)
                                })
                            }}
                            placeholder="Search by GitHub username, name, or key prefix..."
                            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/80 pl-9 pr-8 py-2 text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-hidden"
                        />
                        {devSearchFilter && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDevSearchFilter('')
                                    setDevPage(1)
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                aria-label="Clear developer search"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={devLimit}
                        onChange={(e) => {
                            setDevLimit(Number(e.target.value))
                            setDevPage(1)
                        }}
                        aria-label="Rows per page"
                        className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] focus:outline-hidden focus:border-[var(--nepal-blue)] cursor-pointer"
                    >
                        <option value={10}>10 / page</option>
                        <option value={25}>25 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                    </select>

                    <button
                        type="button"
                        onClick={exportDevelopersCsv}
                        disabled={developers.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--nepal-blue)] active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-2xs"
                        title="Export developers list to CSV"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Developers List & Key Management */}
            {devLoading ? (
                <div className="dev-glass-card flex items-center justify-center p-14 rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                        <span className="text-xs text-[var(--text-secondary)] font-medium">Loading developer accounts...</span>
                    </div>
                </div>
            ) : developers.length === 0 ? (
                <div className="dev-glass-card text-center p-14 rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/80 backdrop-blur-md space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">No Developer Accounts Found</h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                        {devSearchFilter
                            ? `No developers match "${devSearchFilter}". Try a different search term.`
                            : 'No developers have signed in via GitHub yet. Once developers sign in and create API keys, they will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {developers.map((dev) => (
                        <div
                            key={dev.id}
                            className="dev-glass-card hover-lift rounded-2xl border border-[var(--border-default)]/80 bg-[var(--surface-primary)]/85 p-4 sm:p-5 shadow-sm backdrop-blur-md space-y-4 hover:border-[var(--nepal-blue)]/40 transition-colors"
                        >
                            {/* Developer Header Row */}
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-default)]/60 pb-3.5">
                                <div className="flex items-center gap-3 min-w-0">
                                    {dev.avatar_url ? (
                                        <Image
                                            src={dev.avatar_url}
                                            alt={dev.username}
                                            width={42}
                                            height={42}
                                            className="h-10 w-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] object-cover shrink-0 shadow-2xs"
                                            unoptimized
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nepal-blue)] font-bold text-white text-sm shrink-0 shadow-2xs">
                                            {dev.username[0]?.toUpperCase()}
                                        </div>
                                    )}

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-[var(--text-primary)] truncate">
                                                {dev.name || dev.username}
                                            </span>
                                            <a
                                                href={`https://github.com/${dev.username}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition shrink-0"
                                                title="Open GitHub Profile"
                                            >
                                                <span>@{dev.username}</span>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <line x1="7" y1="17" x2="17" y2="7" />
                                                    <polyline points="7 7 17 7 17 17" />
                                                </svg>
                                            </a>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] font-mono mt-0.5">
                                            {dev.email && (
                                                <span>
                                                    {privacyMode
                                                        ? dev.email.replace(/(.{2})(.*)(?=@)/, '$1***')
                                                        : dev.email}
                                                </span>
                                            )}
                                            {dev.email && <span>•</span>}
                                            <span>Joined {formatTimeAgo(dev.created_at)}</span>
                                            <span>•</span>
                                            <span className="text-[var(--text-secondary)]">
                                                {formatNepalDateTime(new Date(dev.created_at).toISOString(), 'en')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <span className="font-mono tabular-nums text-sm font-bold text-[var(--nepal-blue)] block leading-tight">
                                            {dev.total_queries.toLocaleString()} queries
                                        </span>
                                        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-semibold">
                                            {dev.keys.length} {dev.keys.length === 1 ? 'API Key' : 'API Keys'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Attached API Keys List */}
                            <div className="space-y-2">
                                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                                    Provisioned API Keys
                                </span>

                                {dev.keys.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-[var(--border-default)] p-3 text-center text-xs text-[var(--text-muted)]">
                                        Developer has not created any API keys yet.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {dev.keys.map((k) => (
                                            <div
                                                key={k.id}
                                                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs transition-colors ${
                                                    k.is_active
                                                        ? 'border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/50'
                                                        : 'border-rose-500/30 bg-rose-500/5 opacity-75'
                                                }`}
                                            >
                                                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                            k.is_active
                                                                ? 'bg-[var(--success)]/15 text-[var(--success)]'
                                                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        <span className={`h-1.5 w-1.5 rounded-full ${k.is_active ? 'bg-[var(--success)]' : 'bg-rose-500'}`} />
                                                        <span>{k.is_active ? 'Active' : 'Suspended'}</span>
                                                    </span>

                                                    <strong className="text-[var(--text-primary)] font-bold">{k.name}</strong>

                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(k.key_prefix, `key-${k.id}`)}
                                                        className="font-mono text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                        title="Copy key prefix"
                                                    >
                                                        {k.key_prefix}
                                                        {copiedKey === `key-${k.id}` ? (
                                                            <span className="ml-1 text-[var(--success)] inline-block">
                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="inline" aria-hidden="true">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            </span>
                                                        ) : null}
                                                    </button>

                                                    <span className="text-[var(--text-muted)]">•</span>

                                                    {/* Rate limit badge / editor */}
                                                    {editingRateKeyId === k.id ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="number"
                                                                min={5}
                                                                max={1000}
                                                                value={editingRateValue}
                                                                onChange={(e) => setEditingRateValue(parseInt(e.target.value, 10) || 60)}
                                                                className="w-16 rounded border border-[var(--nepal-blue)] bg-[var(--surface-primary)] px-1.5 py-0.5 text-xs font-mono font-bold"
                                                                autoFocus
                                                            />
                                                            <span className="text-[10px] text-[var(--text-muted)]">req/min</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveRate(k.id)}
                                                                disabled={savingRate}
                                                                className="rounded bg-[var(--nepal-blue)] px-2 py-0.5 text-[10px] font-bold text-white hover:opacity-90"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingRateKeyId(null)}
                                                                className="rounded border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEditRate(k.id, k.rate_limit_per_minute)}
                                                            className="inline-flex items-center gap-1 rounded bg-[var(--nepal-blue)]/10 px-2 py-0.5 font-mono tabular-nums text-[10.5px] font-bold text-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)]/20 transition cursor-pointer"
                                                            title="Click to modify rate limit"
                                                        >
                                                            <span>{k.rate_limit_per_minute} req/min</span>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                <path d="M12 20h9" />
                                                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    <span className="text-[var(--text-muted)]">•</span>
                                                    <span className="font-mono tabular-nums text-[11px] text-[var(--text-secondary)]">
                                                        {k.total_requests.toLocaleString()} queries
                                                    </span>

                                                    <span className="text-[var(--text-muted)]">•</span>
                                                    <span className="text-[10.5px] text-[var(--text-muted)] font-mono">
                                                        {k.last_used_at ? `Last used: ${formatTimeAgo(k.last_used_at)}` : 'Never used yet'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleKeyActive(k.id, Boolean(k.is_active))}
                                                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition active:scale-95 cursor-pointer ${
                                                            k.is_active
                                                                ? 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-white'
                                                                : 'border border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)] hover:text-white'
                                                        }`}
                                                        title={k.is_active ? 'Suspend this API key' : 'Reactivate this API key'}
                                                    >
                                                        {k.is_active ? 'Suspend Key' : 'Activate Key'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteKey(k.id, k.name)}
                                                        className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition active:scale-95 cursor-pointer"
                                                        title="Permanently revoke this API key"
                                                    >
                                                        Revoke
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Universal Admin Pagination Bar */}
            <AdminPagination
                currentPage={devPage}
                totalPages={devTotalPages}
                totalItems={devTotal}
                pageSize={devLimit}
                onPageChange={setDevPage}
                onPageSizeChange={setDevLimit}
                pageSizeOptions={[10, 25, 50, 100]}
                itemLabel="developers"
                loading={devLoading}
                className="pt-3 border-t border-[var(--border-default)]"
            />
        </div>
    )
}
