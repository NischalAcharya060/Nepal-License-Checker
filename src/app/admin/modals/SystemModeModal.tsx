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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-md animate-fade-in"
            onClick={() => {
                if (!saving) onClose()
            }}
        >
            <div
                className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-primary)] shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Mobile grabber bar */}
                <div className="mx-auto mt-2 mb-1 h-1 w-12 rounded-full bg-[var(--border-strong)] sm:hidden shrink-0" />

                {/* MODAL HEADER */}
                <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] p-4 sm:p-6 shrink-0 bg-[var(--surface-primary)]/90 backdrop-blur-md z-10">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                        <div
                            className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border shadow-xs transition-colors ${
                                selectedMode === 'normal'
                                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : selectedMode === 'degraded'
                                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : 'border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                                    Live System Mode Controller
                                </h2>
                                <span
                                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider border ${
                                        currentConfig?.mode === 'normal'
                                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                            : currentConfig?.mode === 'degraded'
                                            ? 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                            : 'border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                    }`}
                                >
                                    Active: {currentConfig?.mode || 'normal'}
                                </span>
                            </div>
                            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                Switch the operational state of Nepal License Checker in real-time. Changes propagate instantly to all edge nodes without redeploying code.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                        title="Close modal (Esc)"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* MODAL BODY */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                    {/* Mode Selector Cards */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-[var(--text-secondary)] block uppercase tracking-wider">
                            Select Operational Mode
                        </label>

                        {/* 1. Normal Mode */}
                        <div
                            onClick={() => setSelectedMode('normal')}
                            className={`rounded-2xl border p-4 transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                                selectedMode === 'normal'
                                    ? 'border-emerald-500/60 bg-emerald-500/10 dark:bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-xs'
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
                                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                        <span>Normal Mode (Default)</span>
                                    </span>
                                    <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                        Full Public Access
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Site runs at full speed with zero restrictions. All citizen searches, automated DOTM lookups, OCR scanning, and developer APIs operate normally.
                                </p>
                            </div>
                        </div>

                        {/* 2. Degraded / Slow Mode */}
                        <div
                            onClick={() => setSelectedMode('degraded')}
                            className={`rounded-2xl border p-4 transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                                selectedMode === 'degraded'
                                    ? 'border-amber-500/60 bg-amber-500/10 dark:bg-amber-500/5 ring-2 ring-amber-500/20 shadow-xs'
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
                                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                                        <span>Degraded / Slow Mode</span>
                                    </span>
                                    <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                        Public Notice Active
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    The site remains accessible and searchable for citizens, but displays an informational alert banner indicating DOTM server latency, delays, or ongoing background sync.
                                </p>
                            </div>
                        </div>

                        {/* 3. Maintenance Mode */}
                        <div
                            onClick={() => setSelectedMode('maintenance')}
                            className={`rounded-2xl border p-4 transition-all cursor-pointer select-none flex items-start gap-3.5 ${
                                selectedMode === 'maintenance'
                                    ? 'border-rose-500/60 bg-rose-500/10 dark:bg-rose-500/5 ring-2 ring-rose-500/20 shadow-xs'
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
                                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                                        <span>Maintenance Mode (Lockdown)</span>
                                    </span>
                                    <span className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                                        Public Lockdown
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Locks down the public portal. All public visitors are redirected to <code className="font-mono text-[11px] text-[var(--text-primary)] bg-[var(--bg-secondary)] px-1 rounded">/maintenance</code>. Public APIs return RFC 503. Logged-in administrators bypass seamlessly.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Custom Message Field */}
                    <div className="space-y-1.5 rounded-2xl border border-[var(--border-default)]/80 bg-[var(--bg-secondary)]/40 p-3.5 sm:p-4">
                        <label htmlFor="system-mode-message" className="text-xs font-bold text-[var(--text-secondary)] block">
                            Public Notice / Reason (Optional)
                        </label>
                        <input
                            id="system-mode-message"
                            type="text"
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder={
                                selectedMode === 'degraded'
                                    ? 'e.g. DOTM central servers are experiencing high latency. Searches may take a few seconds.'
                                    : selectedMode === 'maintenance'
                                    ? 'e.g. Scheduled database synchronization in progress with DOTM records.'
                                    : 'Default notice message'
                            }
                            className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--nepal-blue)]"
                        />
                        <p className="text-[11px] text-[var(--text-muted)]">
                            {selectedMode === 'degraded'
                                ? 'This message will be shown on the public homepage warning banner.'
                                : selectedMode === 'maintenance'
                                ? 'This explanation will be returned in the 503 API response.'
                                : 'Shown when relevant.'}
                        </p>
                    </div>

                    {/* Maintenance Safeguard Confirmation */}
                    {isSwitchingToMaintenance && (
                        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 sm:p-4 animate-in fade-in-50 duration-150 space-y-2">
                            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-bold">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <span>Public Lockdown Safeguard</span>
                            </div>
                            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 leading-relaxed">
                                Switching to Maintenance Mode will block all general users from checking licenses until switched back to Normal Mode. Type <span className="font-mono font-bold uppercase underline">maintenance</span> below to confirm:
                            </p>
                            <input
                                type="text"
                                value={confirmPhrase}
                                onChange={(e) => setConfirmPhrase(e.target.value)}
                                placeholder='Type "maintenance" to confirm'
                                className="h-9 w-full rounded-xl border border-rose-500/50 bg-[var(--surface-primary)] px-3 text-xs font-mono font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-rose-500/20"
                            />
                        </div>
                    )}

                    {/* Current Meta Info */}
                    {currentConfig && currentConfig.updated_at > 0 && (
                        <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between border-t border-[var(--border-default)]/60 pt-3">
                            <span>
                                Last updated {formatTimeAgo(currentConfig.updated_at)} by{' '}
                                <strong className="text-[var(--text-secondary)]">{currentConfig.updated_by || 'admin'}</strong>
                            </span>
                            <span className="font-mono">
                                {formatNepalDateTime(currentConfig.updated_at, 'en', false)} (NPT)
                            </span>
                        </div>
                    )}
                </div>

                {/* MODAL FOOTER */}
                <div className="border-t border-[var(--border-default)] p-4 sm:p-5 bg-[var(--surface-primary)] shrink-0 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                        Instant edge propagation • Zero deployment delay
                    </span>

                    <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={onClose}
                            className="min-h-[40px] px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            disabled={saving || !isMaintenanceConfirmed || !hasChanged}
                            onClick={handleSave}
                            className={`min-h-[40px] px-4.5 rounded-xl text-white text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer inline-flex items-center gap-1.5 ${
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
                                    <span>Applying Mode...</span>
                                </>
                            ) : (
                                <span>Apply {selectedMode === 'normal' ? 'Normal Mode' : selectedMode === 'degraded' ? 'Degraded Mode' : 'Maintenance Mode'}</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
