'use client'

import React, { useState, useEffect } from 'react'
import { SystemMode, SystemModeConfig } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo } from '../helpers'

interface SystemModeModalProps {
    isOpen: boolean
    onClose: () => void
    currentConfig: SystemModeConfig | null
    onSaveSuccess: (updated: SystemModeConfig) => void
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}

export default function SystemModeModal({
    isOpen,
    onClose,
    currentConfig,
    onSaveSuccess,
    showToast,
}: SystemModeModalProps) {
    const [selectedMode, setSelectedMode] = useState<SystemMode>(currentConfig?.mode || 'normal')
    const [customMessage, setCustomMessage] = useState<string>(currentConfig?.message || '')
    const [saving, setSaving] = useState(false)
    const [confirmPhrase, setConfirmPhrase] = useState('')
    const [prevOpen, setPrevOpen] = useState(isOpen)
    const [prevConfig, setPrevConfig] = useState(currentConfig)

    // Synchronize state when modal opens or config updates
    if (isOpen !== prevOpen || currentConfig !== prevConfig) {
        setPrevOpen(isOpen)
        setPrevConfig(currentConfig)
        if (isOpen && currentConfig) {
            setSelectedMode(currentConfig.mode || 'normal')
            setCustomMessage(currentConfig.message || '')
            setConfirmPhrase('')
        }
    }

    // Escape key listener to close modal
    useEffect(() => {
        if (!isOpen) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, saving, onClose])

    if (!isOpen) return null

    const isSwitchingToMaintenance = selectedMode === 'maintenance' && currentConfig?.mode !== 'maintenance'
    const isMaintenanceConfirmed = !isSwitchingToMaintenance || confirmPhrase.trim().toLowerCase() === 'maintenance'
    const hasChanged = selectedMode !== (currentConfig?.mode || 'normal') || customMessage.trim() !== (currentConfig?.message || '').trim()

    const handleSave = async () => {
        if (saving || !isMaintenanceConfirmed || !hasChanged) return
        setSaving(true)
        try {
            const res = await fetch('/api/admin/system-mode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: selectedMode,
                    message: customMessage.trim(),
                }),
            })
            const json = await res.json().catch(() => null)
            if (res.ok && json?.data) {
                const updated = json.data as SystemModeConfig
                onSaveSuccess(updated)
                showToast(
                    selectedMode === 'normal'
                        ? 'System is now in Normal Mode. Full public access restored.'
                        : selectedMode === 'degraded'
                        ? 'System is now in Degraded / Slow Mode. Public notice is active.'
                        : 'System is now in Maintenance Mode. Public traffic redirected to /maintenance.',
                    selectedMode === 'normal' ? 'success' : 'info'
                )
                onClose()
            } else {
                showToast(json?.error || 'Failed to update system mode', 'error')
            }
        } catch {
            showToast('Failed to update system mode', 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/75 dark:bg-black/85 p-0 sm:p-4 backdrop-blur-xl animate-fade-in"
            onClick={() => {
                if (!saving) onClose()
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="system-mode-modal-title"
        >
            <div
                className="relative w-full max-w-4xl lg:max-w-5xl rounded-t-[28px] sm:rounded-3xl border border-white/15 dark:border-white/10 bg-[var(--surface-primary)] shadow-2xl animate-in zoom-in-95 duration-200 max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Ambient Rail / Accent at top */}
                <div
                    className={`h-1.5 w-full transition-colors duration-500 ${
                        selectedMode === 'normal'
                            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
                            : selectedMode === 'degraded'
                            ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600'
                            : 'bg-gradient-to-r from-rose-600 via-red-500 to-rose-700'
                    }`}
                />

                {/* Mobile grabber bar */}
                <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-[var(--border-strong)] sm:hidden shrink-0" />

                {/* MODAL HEADER */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] p-4 sm:p-5 shrink-0 bg-[var(--bg-secondary)]/40 backdrop-blur-md">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-xs transition-all duration-300 ${
                                selectedMode === 'normal'
                                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-emerald-500/10'
                                    : selectedMode === 'degraded'
                                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-amber-500/10'
                                    : 'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400 shadow-rose-500/10'
                            }`}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 id="system-mode-modal-title" className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">
                                    System Operational Mode
                                </h2>
                                <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border ${
                                        currentConfig?.mode === 'normal'
                                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                            : currentConfig?.mode === 'degraded'
                                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                            : 'border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                    }`}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                                    <span>Live: {currentConfig?.mode || 'normal'}</span>
                                </span>
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--text-secondary)] leading-relaxed truncate">
                                Real-time global traffic dispatch &amp; emergency lockdown control across all edge nodes.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2 text-[var(--text-muted)] hover:border-[var(--nepal-blue)] hover:text-[var(--text-primary)] transition active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
                        title="Close modal (Esc)"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* MODAL BODY (Split Stage on Desktop) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
                        {/* ─────────────────────────────────────────────────────────
                            LEFT STAGE: Mode Switcher & Safety Gate (lg:col-span-7)
                        ───────────────────────────────────────────────────────── */}
                        <div className="lg:col-span-7 space-y-4">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2.5">
                                    Target Operational State
                                </label>

                                <div className="space-y-2.5">
                                    {/* 1. Normal Mode */}
                                    <div
                                        onClick={() => setSelectedMode('normal')}
                                        className={`rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none flex items-start gap-3.5 relative overflow-hidden ${
                                            selectedMode === 'normal'
                                                ? 'border-emerald-500/60 bg-emerald-500/10 dark:bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-md'
                                                : 'border-[var(--border-default)] bg-[var(--surface-primary)] hover:border-emerald-500/30 hover:bg-[var(--bg-secondary)]/40'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            <div
                                                className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                                                    selectedMode === 'normal'
                                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                                        : 'border-[var(--border-default)] bg-[var(--surface-primary)]'
                                                }`}
                                            >
                                                {selectedMode === 'normal' && <div className="h-2 w-2 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black text-[var(--text-primary)] flex items-center gap-1.5">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    <span>Normal Operation</span>
                                                </span>
                                                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                                                    Unrestricted
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                                Zero restrictions. All citizen queries, background scraper syncs, OCR scanners, and developer APIs operate at peak capacity.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 2. Degraded / Slow Mode */}
                                    <div
                                        onClick={() => setSelectedMode('degraded')}
                                        className={`rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none flex items-start gap-3.5 relative overflow-hidden ${
                                            selectedMode === 'degraded'
                                                ? 'border-amber-500/60 bg-amber-500/10 dark:bg-amber-500/5 ring-2 ring-amber-500/20 shadow-md'
                                                : 'border-[var(--border-default)] bg-[var(--surface-primary)] hover:border-amber-500/30 hover:bg-[var(--bg-secondary)]/40'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            <div
                                                className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                                                    selectedMode === 'degraded'
                                                        ? 'border-amber-500 bg-amber-500 text-white'
                                                        : 'border-[var(--border-default)] bg-[var(--surface-primary)]'
                                                }`}
                                            >
                                                {selectedMode === 'degraded' && <div className="h-2 w-2 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black text-[var(--text-primary)] flex items-center gap-1.5">
                                                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                                                    <span>Degraded / High Latency Mode</span>
                                                </span>
                                                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.2 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 uppercase">
                                                    Advisory Active
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                                Portal remains 100% searchable, but displays an informational advisory banner notifying citizens of DOTM upstream delays.
                                            </p>
                                        </div>
                                    </div>

                                    {/* 3. Maintenance Mode */}
                                    <div
                                        onClick={() => setSelectedMode('maintenance')}
                                        className={`rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer select-none flex items-start gap-3.5 relative overflow-hidden ${
                                            selectedMode === 'maintenance'
                                                ? 'border-rose-500/60 bg-rose-500/10 dark:bg-rose-500/5 ring-2 ring-rose-500/20 shadow-md'
                                                : 'border-[var(--border-default)] bg-[var(--surface-primary)] hover:border-rose-500/30 hover:bg-[var(--bg-secondary)]/40'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            <div
                                                className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                                                    selectedMode === 'maintenance'
                                                        ? 'border-rose-500 bg-rose-500 text-white'
                                                        : 'border-[var(--border-default)] bg-[var(--surface-primary)]'
                                                }`}
                                            >
                                                {selectedMode === 'maintenance' && <div className="h-2 w-2 rounded-full bg-white" />}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-black text-[var(--text-primary)] flex items-center gap-1.5">
                                                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                                                    <span>Maintenance Lockdown</span>
                                                </span>
                                                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.2 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-300 uppercase">
                                                    Lockout
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                                Full public lockout. All visitors redirected to <code className="font-mono text-[11px] bg-[var(--bg-secondary)] px-1 py-0.2 rounded border border-[var(--border-default)]">/maintenance</code>. Public API calls return HTTP 503. Authenticated admins bypass automatically.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Custom Message Field */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/30 p-4 space-y-2">
                                <label htmlFor="system-mode-message" className="text-xs font-bold text-[var(--text-secondary)] flex items-center justify-between">
                                    <span>Public Explanation / Notice Message</span>
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">Live in preview ➔</span>
                                </label>
                                <input
                                    id="system-mode-message"
                                    type="text"
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    placeholder={
                                        selectedMode === 'degraded'
                                            ? 'e.g. Department of Transport Management (DOTM) servers are experiencing high latency. Searches remain operational.'
                                            : selectedMode === 'maintenance'
                                            ? 'e.g. Scheduled database maintenance and synchronization in progress.'
                                            : 'Default system message'
                                    }
                                    className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/15"
                                />
                                <p className="text-[11px] text-[var(--text-muted)]">
                                    {selectedMode === 'degraded'
                                        ? 'This text displays inside the amber warning banner at the top of the search portal.'
                                        : selectedMode === 'maintenance'
                                        ? 'Returned in 503 headers and featured on the maintenance landing page.'
                                        : 'Retained as default note.'}
                                </p>
                            </div>

                            {/* Maintenance Safeguard Confirmation */}
                            {isSwitchingToMaintenance && (
                                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-2.5 animate-fade-in shadow-xs">
                                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-black">
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                            <line x1="12" y1="9" x2="12" y2="13" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                        <span>CRITICAL: High-Consequence Operational Lockout</span>
                                    </div>
                                    <p className="text-[11px] text-rose-800/90 dark:text-rose-200/90 leading-relaxed">
                                        Switching to Maintenance will cut public access to license searches. Type <span className="font-mono font-bold uppercase underline select-all bg-white/20 px-1 py-0.2 rounded">maintenance</span> below to unlock:
                                    </p>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={confirmPhrase}
                                            onChange={(e) => setConfirmPhrase(e.target.value)}
                                            placeholder='Type "maintenance" to unlock button'
                                            className="h-10 w-full rounded-xl border border-rose-500/50 bg-[var(--surface-primary)] px-3 pr-24 text-xs font-mono font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-rose-500/25"
                                        />
                                        {isMaintenanceConfirmed && confirmPhrase.trim() && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                                ✓ Unlocked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ─────────────────────────────────────────────────────────
                            RIGHT STAGE: Live Citizen Viewport Simulator (lg:col-span-5)
                        ───────────────────────────────────────────────────────── */}
                        <div className="lg:col-span-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="2" y="3" width="20" height="14" rx="2" />
                                        <line x1="8" y1="21" x2="16" y2="21" />
                                        <line x1="12" y1="17" x2="12" y2="21" />
                                    </svg>
                                    <span>Real-Time Citizen Viewport</span>
                                </label>
                                <span className="text-[10px] font-mono text-[var(--text-muted)]">Live Simulation</span>
                            </div>

                            {/* Mini Browser Device Frame */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/70 shadow-lg overflow-hidden">
                                {/* Chrome Bar */}
                                <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)] bg-[var(--surface-primary)]/80">
                                    <div className="flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                                    </div>
                                    <div className="rounded-md bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[10px] font-mono text-[var(--text-muted)] truncate max-w-[200px]">
                                        {selectedMode === 'maintenance'
                                            ? 'nepal-license-checker.np/maintenance'
                                            : 'nepal-license-checker.np/'}
                                    </div>
                                    <span className="text-[10px] text-[var(--text-muted)]">HTTPS</span>
                                </div>

                                {/* Simulated Viewport Canvas */}
                                <div className="p-3.5 min-h-[260px] flex flex-col justify-center items-center bg-[var(--surface-primary)] relative">
                                    {selectedMode === 'normal' && (
                                        <div className="w-full text-center space-y-2.5 animate-fade-in py-6">
                                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </div>
                                            <h4 className="text-xs font-extrabold text-[var(--text-primary)]">
                                                Standard Public Portal
                                            </h4>
                                            <p className="text-[11px] text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
                                                Full search experience live. Fast response times across 1,000,000+ indexed DOTM driving license records.
                                            </p>
                                            <div className="mt-3 flex items-center justify-center gap-2">
                                                <div className="h-7 w-36 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]/50" />
                                                <div className="h-7 w-16 rounded-lg bg-[var(--nepal-blue)] text-white text-[9px] font-bold flex items-center justify-center">
                                                    Search
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedMode === 'degraded' && (
                                        <div className="w-full space-y-3 animate-fade-in py-3">
                                            {/* Simulated Homepage Warning Banner */}
                                            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] shadow-xs">
                                                <div className="flex items-start gap-2">
                                                    <span className="text-amber-600 dark:text-amber-400 text-xs shrink-0 mt-0.5">⚠️</span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <strong className="text-amber-900 dark:text-amber-200 font-bold text-[11px]">
                                                                High Latency Advisory
                                                            </strong>
                                                            <span className="rounded bg-amber-500/20 px-1 text-[8.5px] font-mono font-bold text-amber-800 dark:text-amber-300">
                                                                DEGRADED
                                                            </span>
                                                        </div>
                                                        <p className="mt-0.5 text-[10px] text-amber-900/90 dark:text-amber-200/90 leading-tight">
                                                            {customMessage ||
                                                                'Department of Transport Management (DOTM) servers are experiencing latency. Searches remain operational.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Simulated Search Form beneath notice */}
                                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/40 p-3 text-center space-y-2 opacity-80">
                                                <div className="h-2 w-28 mx-auto rounded bg-[var(--text-muted)]/30" />
                                                <div className="flex items-center justify-center gap-1.5 pt-1">
                                                    <div className="h-6 w-32 rounded border border-[var(--border-default)] bg-[var(--surface-primary)]" />
                                                    <div className="h-6 w-14 rounded bg-[var(--nepal-blue)]/80 text-white text-[8px] font-bold flex items-center justify-center">
                                                        Check
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedMode === 'maintenance' && (
                                        <div className="w-full text-center space-y-2.5 animate-fade-in py-4">
                                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                                    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.2 text-[9px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase">
                                                    HTTP 503 Service Unavailable
                                                </span>
                                                <h4 className="mt-1 text-xs font-black text-[var(--text-primary)]">
                                                    We&rsquo;ll Be Right Back &bull; मर्मतसम्भार
                                                </h4>
                                                <p className="mt-1 text-[10.5px] text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                                                    {customMessage ||
                                                        'Nepal License Checker is undergoing scheduled maintenance while reconnecting to the DOTM records database.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Operational Audit Metadata */}
                            {currentConfig && currentConfig.updated_at > 0 && (
                                <div className="text-[10.5px] text-[var(--text-muted)] flex flex-wrap items-center justify-between gap-1 pt-1 font-mono">
                                    <span>
                                        Audit: {formatTimeAgo(currentConfig.updated_at)} by{' '}
                                        <strong className="text-[var(--text-secondary)] font-bold">{currentConfig.updated_by || 'admin'}</strong>
                                    </span>
                                    <span>{formatNepalDateTime(currentConfig.updated_at, 'en', false)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="border-t border-[var(--border-default)] p-4 sm:p-5 bg-[var(--surface-primary)] shrink-0 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline font-mono">
                        Instant edge propagation • Zero cold start
                    </span>

                    <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            className="min-h-[42px] px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={saving || !isMaintenanceConfirmed || !hasChanged}
                            onClick={handleSave}
                            className={`min-h-[42px] px-5 rounded-xl text-white text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-2 ${
                                selectedMode === 'normal'
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : selectedMode === 'degraded'
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-rose-600 hover:bg-rose-700'
                            }`}
                        >
                            {saving ? (
                                <>
                                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    <span>Applying Global State...</span>
                                </>
                            ) : (
                                <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Apply {selectedMode === 'normal' ? 'Normal Mode' : selectedMode === 'degraded' ? 'Degraded Mode' : 'Maintenance Mode'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
