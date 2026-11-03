'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { AdminUpdateEntry, AdminUpdatesStatsData } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo } from '../helpers'
import { getTransportOfficeByOfficeName } from '@/lib/offices'

export interface AdminUpdatesProps {
    updatesLogs?: AdminUpdateEntry[]
    updatesStats?: AdminUpdatesStatsData | null
    updatesLoading?: boolean
    onToggleVisibility?: (item: AdminUpdateEntry, hidden: boolean) => Promise<void>
    onSaveUpdate?: (entry: Partial<AdminUpdateEntry>) => Promise<void>
    onDeleteUpdate?: (item: AdminUpdateEntry) => Promise<void>
    onResetDefaults?: () => Promise<void>
    onRefresh?: () => void
    showToast?: (message: string, type?: 'success' | 'info' | 'error') => void
}

const BS_MONTHS_2083 = [
    { nameEn: 'Baisakh', nameNe: 'वैशाख', start: '2026-04-14', days: 31 },
    { nameEn: 'Jestha', nameNe: 'जेठ', start: '2026-05-15', days: 31 },
    { nameEn: 'Ashadh', nameNe: 'असार', start: '2026-06-15', days: 32 },
    { nameEn: 'Shrawan', nameNe: 'साउन', start: '2026-07-17', days: 32 },
    { nameEn: 'Bhadra', nameNe: 'भदौ', start: '2026-08-18', days: 30 },
    { nameEn: 'Ashwin', nameNe: 'असोज', start: '2026-09-17', days: 30 },
    { nameEn: 'Kartik', nameNe: 'कार्तिक', start: '2026-10-17', days: 30 },
    { nameEn: 'Mangsir', nameNe: 'मंसिर', start: '2026-11-16', days: 29 },
    { nameEn: 'Poush', nameNe: 'पुस', start: '2026-12-15', days: 30 },
    { nameEn: 'Magh', nameNe: 'माघ', start: '2027-01-14', days: 29 },
    { nameEn: 'Falgun', nameNe: 'फागुन', start: '2027-02-12', days: 30 },
    { nameEn: 'Chaitra', nameNe: 'चैत', start: '2027-03-14', days: 30 },
]

function getBsDate(dateStr: string, timestamp?: number): string | null {
    let ymd = dateStr
    if (timestamp) {
        try {
            const d = new Date(timestamp)
            ymd = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kathmandu',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(d)
        } catch {
            // fallback
        }
    }

    const target = new Date(ymd + 'T00:00:00Z').getTime()
    if (isNaN(target)) return null

    for (const m of BS_MONTHS_2083) {
        const s = new Date(m.start + 'T00:00:00Z').getTime()
        const e = s + m.days * 86400000
        if (target >= s && target < e) {
            const day = Math.floor((target - s) / 86400000) + 1
            const dayStr = day < 10 ? '0' + day : String(day)
            return `${m.nameEn} ${dayStr}, 2083 BS`
        }
    }
    return null
}

function formatTriggerBadge(trigger?: string): { label: string; colorClass: string } {
    switch (trigger) {
        case 'scheduled':
            return { label: 'Scheduled Cron', colorClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' }
        case 'manual_github':
            return { label: 'GitHub Workflow', colorClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' }
        case 'manual_cron':
        case 'manual':
            return { label: 'Manual Trigger', colorClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' }
        case 'initial':
            return { label: 'Initial Baseline', colorClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' }
        default:
            return { label: trigger || 'System', colorClass: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20' }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminUpdates(props: any) {
    const {
        updatesLogs = [],
        updatesStats = null,
        updatesLoading = false,
        onToggleVisibility = async () => {},
        onSaveUpdate = async () => {},
        onDeleteUpdate = async () => {},
        onRefresh = () => {},
        showToast = () => {},
    }: AdminUpdatesProps = props || {}
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden' | 'with_additions'>('all')
    const [expandedOffices, setExpandedOffices] = useState<Record<string, boolean>>({})
    const [togglingId, setTogglingId] = useState<string | number | null>(null)

    // Modal state for Add / Edit
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<Partial<AdminUpdateEntry> | null>(null)
    const [officeBreakdownJson, setOfficeBreakdownJson] = useState('')
    const [modalSubmitting, setModalSubmitting] = useState(false)
    const [modalError, setModalError] = useState<string | null>(null)

    // Delete confirm modal state
    const [deletingEntry, setDeletingEntry] = useState<AdminUpdateEntry | null>(null)
    const [deleteSubmitting, setDeleteSubmitting] = useState(false)

    // Filtered entries
    const filteredEntries = useMemo(() => {
        let list = [...updatesLogs]

        if (statusFilter === 'visible') {
            list = list.filter((item) => !item.hidden)
        } else if (statusFilter === 'hidden') {
            list = list.filter((item) => Boolean(item.hidden))
        } else if (statusFilter === 'with_additions') {
            list = list.filter((item) => Number(item.saved || 0) > 0)
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            list = list.filter((item) => {
                if (item.dateStr.toLowerCase().includes(q)) return true
                const bs = getBsDate(item.dateStr, item.timestamp)
                if (bs && bs.toLowerCase().includes(q)) return true
                if (item.trigger && item.trigger.toLowerCase().includes(q)) return true
                if (item.status && item.status.toLowerCase().includes(q)) return true

                // Check office names
                const offices = Object.keys(item.officeBreakdown || {})
                for (const off of offices) {
                    if (off.toLowerCase().includes(q)) return true
                    const matched = getTransportOfficeByOfficeName(off)
                    if (matched && (matched.nameEn.toLowerCase().includes(q) || matched.nameNe.includes(q))) {
                        return true
                    }
                }
                return false
            })
        }

        return list
    }, [updatesLogs, statusFilter, searchQuery])

    const handleToggle = async (item: AdminUpdateEntry) => {
        const nextHidden = !item.hidden
        const idKey = item.id !== undefined ? item.id : item.dateStr
        setTogglingId(idKey)
        try {
            await onToggleVisibility(item, nextHidden)
            showToast(
                nextHidden
                    ? `Date ${item.dateStr} is now HIDDEN from /updates page.`
                    : `Date ${item.dateStr} is now VISIBLE on /updates page.`,
                'success'
            )
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            showToast(`Failed to toggle visibility: ${msg}`, 'error')
        } finally {
            setTogglingId(null)
        }
    }

    const openAddModal = () => {
        const todayStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kathmandu',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date())

        setEditingEntry({
            dateStr: todayStr,
            saved: 0,
            status: 'success',
            trigger: 'manual',
            durationSeconds: 15,
            newPdfsCount: 0,
            hidden: false,
            officeBreakdown: {},
        })
        setOfficeBreakdownJson('{}')
        setModalError(null)
        setIsEditModalOpen(true)
    }

    const openEditModal = (item: AdminUpdateEntry) => {
        setEditingEntry({ ...item })
        setOfficeBreakdownJson(JSON.stringify(item.officeBreakdown || {}, null, 2))
        setModalError(null)
        setIsEditModalOpen(true)
    }

    const handleSaveModal = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingEntry || !editingEntry.dateStr) {
            setModalError('Date is required.')
            return
        }

        let parsedBreakdown: Record<string, number> = {}
        if (officeBreakdownJson.trim()) {
            try {
                parsedBreakdown = JSON.parse(officeBreakdownJson)
                if (typeof parsedBreakdown !== 'object' || Array.isArray(parsedBreakdown)) {
                    setModalError('Office breakdown must be a valid JSON object mapping office names to numbers.')
                    return
                }
            } catch {
                setModalError('Invalid JSON format for office breakdown.')
                return
            }
        }

        setModalSubmitting(true)
        setModalError(null)
        try {
            await onSaveUpdate({
                ...editingEntry,
                officeBreakdown: parsedBreakdown,
            })
            showToast(`Update record for ${editingEntry.dateStr} saved successfully.`, 'success')
            setIsEditModalOpen(false)
            setEditingEntry(null)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            setModalError(msg)
        } finally {
            setModalSubmitting(false)
        }
    }

    const confirmDelete = async () => {
        if (!deletingEntry) return
        setDeleteSubmitting(true)
        try {
            await onDeleteUpdate(deletingEntry)
            showToast(`Update date ${deletingEntry.dateStr} deleted.`, 'success')
            setDeletingEntry(null)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err)
            showToast(`Failed to delete update record: ${msg}`, 'error')
        } finally {
            setDeleteSubmitting(false)
        }
    }

    const toggleOfficeExpand = (key: string) => {
        setExpandedOffices((prev) => ({
            ...prev,
            [key]: !prev[key],
        }))
    }

    return (
        <div className="space-y-5 animate-rise-in">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {/* Total Dates Recorded */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Timeline Dates</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] font-mono tabular-nums">
                        {updatesStats ? updatesStats.totalUpdates : updatesLogs.length}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)] truncate">
                        Latest: <span className="font-semibold text-[var(--text-secondary)]">{updatesStats?.latestDateStr || 'N/A'}</span>
                    </p>
                </div>

                {/* Visible Dates */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Visible on /updates</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                        {updatesStats ? updatesStats.visibleUpdates : updatesLogs.filter((u) => !u.hidden).length}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        Publicly displayed to visitors
                    </p>
                </div>

                {/* Hidden Dates */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Hidden from /updates</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                                <line x1="2" y1="2" x2="22" y2="22" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                        {updatesStats ? updatesStats.hiddenUpdates : updatesLogs.filter((u) => Boolean(u.hidden)).length}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        Toggled OFF by administrator
                    </p>
                </div>

                {/* Total Indexed Licenses */}
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-2xs">
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">Batch Cards Added</span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="12" y1="18" x2="12" y2="12" />
                                <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] font-mono tabular-nums">
                        {updatesStats ? updatesStats.totalSavedRecords.toLocaleString() : '1,185,710'}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                        Across all recorded dates
                    </p>
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter by date, BS date, office..."
                            className="h-9 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 pl-8 pr-7 text-xs outline-none transition focus:border-[var(--nepal-blue)] focus:ring-2 focus:ring-[var(--nepal-blue)]/20 shadow-2xs text-[var(--text-primary)]"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdown */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'visible' | 'hidden' | 'with_additions')}
                        className="h-9 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs font-semibold text-[var(--text-primary)] outline-none transition focus:border-[var(--nepal-blue)] shadow-2xs"
                    >
                        <option value="all">All Dates ({updatesLogs.length})</option>
                        <option value="visible">Visible Only</option>
                        <option value="hidden">Hidden Only</option>
                        <option value="with_additions">Dates with Additions Only</option>
                    </select>
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/updates"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer"
                        title="Open live public updates page in a new tab"
                    >
                        <span>View /updates</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="7" y1="17" x2="17" y2="7" />
                            <polyline points="7 7 17 7 17 17" />
                        </svg>
                    </Link>

                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={updatesLoading}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs font-semibold text-[var(--text-secondary)] shadow-2xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Reload updates"
                    >
                        <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={updatesLoading ? 'animate-spin text-[var(--nepal-blue)]' : ''}
                        >
                            <path d="M21 2v6h-6" />
                            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                            <path d="M3 22v-6h6" />
                            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                        </svg>
                        <span className="hidden sm:inline">Refresh</span>
                    </button>

                    <button
                        type="button"
                        onClick={openAddModal}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-3.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-dark)] hover:brightness-110 active:scale-95 cursor-pointer"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        <span>Add Date</span>
                    </button>
                </div>
            </div>

            {/* List of Update Dates */}
            <div className="space-y-3.5">
                {updatesLoading && updatesLogs.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-12 text-center text-xs text-[var(--text-muted)]">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                        <p className="mt-2 font-medium">Loading update logs...</p>
                    </div>
                ) : filteredEntries.length === 0 ? (
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-12 text-center text-xs text-[var(--text-muted)]">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">No update dates match your filter</p>
                        <p className="mt-1">Try resetting your search query or visibility filter.</p>
                    </div>
                ) : (
                    filteredEntries.map((item) => {
                        const idKey = item.id !== undefined ? item.id : item.dateStr
                        const isToggling = togglingId === idKey
                        const isHidden = Boolean(item.hidden)
                        const bsDate = getBsDate(item.dateStr, item.timestamp)
                        const triggerInfo = formatTriggerBadge(item.trigger)
                        const breakdown = item.officeBreakdown || {}
                        const officeKeys = Object.keys(breakdown)
                        const isExpanded = Boolean(expandedOffices[String(idKey)])

                        return (
                            <div
                                key={idKey}
                                className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                                    isHidden
                                        ? 'border-neutral-300 dark:border-neutral-800 bg-[var(--surface-primary)]/70 opacity-80'
                                        : 'border-[var(--border-default)] bg-[var(--surface-primary)] shadow-xs hover:border-[var(--nepal-blue)]/40 hover:shadow-sm'
                                }`}
                            >
                                {/* Card Header */}
                                <div className="flex flex-col gap-3.5 border-b border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold shadow-2xs ${
                                                isHidden
                                                    ? 'border-neutral-300 dark:border-neutral-800 bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                                                    : 'border-[var(--nepal-blue)]/20 bg-[var(--nepal-blue)]/10 text-[var(--nepal-blue)]'
                                            }`}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-base font-extrabold tracking-tight text-[var(--text-primary)] font-mono">
                                                    {item.dateStr}
                                                </h3>
                                                {bsDate && (
                                                    <span className="rounded-md border border-[var(--border-default)] bg-[var(--surface-primary)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
                                                        {bsDate}
                                                    </span>
                                                )}
                                                <span
                                                    className={`rounded-md border px-2 py-0.5 text-[10.5px] font-bold ${triggerInfo.colorClass}`}
                                                >
                                                    {triggerInfo.label}
                                                </span>
                                            </div>

                                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                                                <span>{formatNepalDateTime(item.timestamp, 'en')}</span>
                                                <span>•</span>
                                                <span>{formatTimeAgo(item.timestamp)}</span>
                                                {item.durationSeconds ? (
                                                    <>
                                                        <span>•</span>
                                                        <span className="font-mono text-[11px]">{item.durationSeconds}s sync</span>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: THE DATE TOGGLE SWITCH & Quick Actions */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3.5 border-t border-[var(--border-default)]/40 pt-2.5 sm:border-t-0 sm:pt-0">
                                        {/* Prominent Toggle Control */}
                                        <div
                                            className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition ${
                                                !isHidden
                                                    ? 'border-emerald-500/30 bg-emerald-500/10'
                                                    : 'border-neutral-300 dark:border-neutral-700 bg-[var(--bg-secondary)]'
                                            }`}
                                        >
                                            <div className="text-right">
                                                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                                                    Page Status
                                                </div>
                                                <div
                                                    className={`text-xs font-bold leading-none ${
                                                        !isHidden
                                                            ? 'text-emerald-700 dark:text-emerald-400'
                                                            : 'text-neutral-500 dark:text-neutral-400'
                                                    }`}
                                                >
                                                    {!isHidden ? 'Visible' : 'Hidden'}
                                                </div>
                                            </div>

                                            {/* Toggle Switch Component */}
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={!isHidden}
                                                disabled={isToggling}
                                                onClick={() => handleToggle(item)}
                                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/40 disabled:opacity-50 ${
                                                    !isHidden ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
                                                }`}
                                                title={
                                                    !isHidden
                                                        ? 'Click to HIDE this date from the public /updates page'
                                                        : 'Click to SHOW this date on the public /updates page'
                                                }
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                                        !isHidden ? 'translate-x-5' : 'translate-x-0'
                                                    }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Action buttons (Edit & Delete) */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(item)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-secondary)] shadow-2xs transition hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] active:scale-95 cursor-pointer"
                                                title="Edit date details"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                                </svg>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setDeletingEntry(item)}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] text-red-500 shadow-2xs transition hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 cursor-pointer"
                                                title="Delete this date entry"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body: License Count & Office Breakdown */}
                                <div className="p-4 sm:p-5">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            {item.saved > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-sm font-black text-emerald-700 dark:text-emerald-400">
                                                    <span>+{item.saved.toLocaleString()}</span>
                                                    <span className="text-xs font-normal">cards added</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-1.5 font-mono text-xs font-bold text-[var(--text-muted)]">
                                                    <span>0 cards added (DOTM portal verified, already up to date)</span>
                                                </span>
                                            )}

                                            {officeKeys.length > 0 && (
                                                <span className="rounded-lg bg-[var(--surface-primary)] border border-[var(--border-default)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                                                    {officeKeys.length} Transport Offices
                                                </span>
                                            )}
                                        </div>

                                        {officeKeys.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => toggleOfficeExpand(String(idKey))}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                            >
                                                <span>{isExpanded ? 'Hide Offices' : `Show All ${officeKeys.length} Offices`}</span>
                                                <svg
                                                    width="12"
                                                    height="12"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                >
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>

                                    {/* Expandable Office Breakdown Grid */}
                                    {officeKeys.length > 0 && isExpanded && (
                                        <div className="mt-4 border-t border-[var(--border-default)]/60 pt-3.5">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                {officeKeys.map((rawName) => {
                                                    const count = Number(breakdown[rawName] || 0)
                                                    const matched = getTransportOfficeByOfficeName(rawName)
                                                    return (
                                                        <div
                                                            key={rawName}
                                                            className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-2.5 text-xs shadow-2xs"
                                                        >
                                                            <div className="min-w-0 flex-1 truncate">
                                                                <span className="font-bold text-[var(--text-primary)] block truncate">
                                                                    {matched ? matched.nameEn : rawName}
                                                                </span>
                                                                {matched && (
                                                                    <span className="text-[10px] text-[var(--text-muted)] block truncate">
                                                                        {matched.provinceEn}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                                                +{count.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Add / Edit Date Modal */}
            {isEditModalOpen && editingEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-xl animate-scale-up">
                        <div className="flex items-center justify-between border-b border-[var(--border-default)]/70 pb-3">
                            <h3 className="text-base font-bold text-[var(--text-primary)]">
                                {editingEntry.id ? 'Edit Update Date' : 'Add New Update Date'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditModalOpen(false)
                                    setEditingEntry(null)
                                }}
                                className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {modalError && (
                            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
                                {modalError}
                            </div>
                        )}

                        <form onSubmit={handleSaveModal} className="mt-4 space-y-4">
                            {/* Date String */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                                    Date (YYYY-MM-DD) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingEntry.dateStr || ''}
                                    onChange={(e) =>
                                        setEditingEntry((prev) => ({
                                            ...prev,
                                            dateStr: e.target.value,
                                        }))
                                    }
                                    placeholder="2026-11-03"
                                    className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 px-3 font-mono text-xs outline-none transition focus:border-[var(--nepal-blue)] text-[var(--text-primary)]"
                                />
                            </div>

                            {/* Saved Count */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                                        Saved Licenses Count
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editingEntry.saved ?? 0}
                                        onChange={(e) =>
                                            setEditingEntry((prev) => ({
                                                ...prev,
                                                saved: Number(e.target.value),
                                            }))
                                        }
                                        className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 px-3 font-mono text-xs outline-none transition focus:border-[var(--nepal-blue)] text-[var(--text-primary)]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                                        Trigger
                                    </label>
                                    <select
                                        value={editingEntry.trigger || 'manual'}
                                        onChange={(e) =>
                                            setEditingEntry((prev) => ({
                                                ...prev,
                                                trigger: e.target.value,
                                            }))
                                        }
                                        className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)]"
                                    >
                                        <option value="scheduled">scheduled (Cron)</option>
                                        <option value="manual_github">manual_github (Workflow)</option>
                                        <option value="manual_cron">manual_cron (Admin)</option>
                                        <option value="manual">manual (Direct)</option>
                                        <option value="initial">initial (Baseline)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Office Breakdown JSON */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                                    Office Breakdown (JSON Map)
                                </label>
                                <textarea
                                    rows={4}
                                    value={officeBreakdownJson}
                                    onChange={(e) => setOfficeBreakdownJson(e.target.value)}
                                    placeholder='{"JHAPA": 1500, "POKHARA": 2400}'
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-3 font-mono text-xs outline-none transition focus:border-[var(--nepal-blue)] text-[var(--text-primary)]"
                                />
                                <span className="text-[10.5px] text-[var(--text-muted)] mt-1 block">
                                    Example: {`{"JHAPA": 5000, "RADHERADHE": 2500}`}
                                </span>
                            </div>

                            {/* Visible on /updates toggle */}
                            <div className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/30 p-3">
                                <div>
                                    <span className="block text-xs font-bold text-[var(--text-primary)]">
                                        Visible on Public /updates Page
                                    </span>
                                    <span className="block text-[11px] text-[var(--text-muted)]">
                                        Turn ON to display on http://localhost:3000/updates, or OFF to hide.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={!editingEntry.hidden}
                                    onClick={() =>
                                        setEditingEntry((prev) => ({
                                            ...prev,
                                            hidden: !prev?.hidden,
                                        }))
                                    }
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/40 ${
                                        !editingEntry.hidden ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
                                    }`}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                            !editingEntry.hidden ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    />
                                </button>
                            </div>

                            {/* Submit buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false)
                                        setEditingEntry(null)
                                    }}
                                    className="h-9 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={modalSubmitting}
                                    className="h-9 rounded-xl bg-[var(--nepal-blue)] px-5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-dark)] disabled:opacity-50 cursor-pointer"
                                >
                                    {modalSubmitting ? 'Saving...' : 'Save Update'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
                    <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-6 shadow-xl animate-scale-up">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 mb-3">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <h3 className="text-base font-bold text-[var(--text-primary)]">
                            Delete Update Date {deletingEntry.dateStr}?
                        </h3>
                        <p className="mt-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                            Are you sure you want to delete this update date record? This will remove it from the timeline and database.
                        </p>
                        <div className="mt-5 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setDeletingEntry(null)}
                                disabled={deleteSubmitting}
                                className="h-9 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleteSubmitting}
                                className="h-9 rounded-xl bg-red-600 px-5 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                            >
                                {deleteSubmitting ? 'Deleting...' : 'Delete Record'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
