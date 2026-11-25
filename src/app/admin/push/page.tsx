'use client'

import { useState } from 'react'
import { PushSubscriptionLog, PushStatsData } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo, maskLicenseNumber } from '../helpers'
import AdminPagination from '../AdminPagination'

export interface AdminPushProps {
    pushLogs?: PushSubscriptionLog[]
    pushStats?: PushStatsData | null
    pushTotal?: number
    pushPage?: number
    pushLimit?: number
    pushTotalPages?: number
    pushSearchFilter?: string
    pushStatusFilter?: 'all' | 'active' | 'unsubscribed' | 'expired'
    pushLoading?: boolean
    privacyMode?: boolean
    setPushPage?: (page: number) => void
    setPushLimit?: (limit: number) => void
    setPushSearchFilter?: (filter: string) => void
    setPushStatusFilter?: (status: 'all' | 'active' | 'unsubscribed' | 'expired') => void
    handleSendPushBroadcast?: (title: string, body: string, url: string, targetLicense?: string) => Promise<unknown>
    handleSendTestPushToRow?: (row: PushSubscriptionLog) => Promise<unknown>
    handleDeletePushRow?: (id: string) => Promise<unknown>
    handleCleanExpiredPush?: (status: 'expired' | 'unsubscribed') => Promise<unknown>
    onRefresh?: () => void
    showToast?: (message: string, type?: 'success' | 'error' | 'info') => void
}

type DeviceOS = 'android' | 'ios' | 'windows' | 'mac' | 'linux' | 'other'

interface DeviceInfo {
    name: string
    os: DeviceOS
    browser: string
    label: string
}

function parseDevice(userAgent: string | null): DeviceInfo {
    if (!userAgent) {
        return { name: 'Unknown Device', os: 'other', browser: 'Browser', label: 'Web Client' }
    }
    const ua = userAgent.toLowerCase()

    let os: DeviceOS = 'other'
    let name = 'Web Browser'

    if (ua.includes('android')) {
        os = 'android'
        name = 'Android Device'
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
        os = 'ios'
        name = 'Apple iOS (PWA)'
    } else if (ua.includes('windows')) {
        os = 'windows'
        name = 'Windows PC'
    } else if (ua.includes('macintosh') || ua.includes('mac os')) {
        os = 'mac'
        name = 'macOS Desktop'
    } else if (ua.includes('linux')) {
        os = 'linux'
        name = 'Linux Workstation'
    }

    let browser = 'Browser'
    if (ua.includes('edg/')) browser = 'Edge'
    else if (ua.includes('chrome/') || ua.includes('crios/')) browser = 'Chrome'
    else if (ua.includes('firefox/') || ua.includes('fxios/')) browser = 'Firefox'
    else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Safari'
    else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera'

    return { name, os, browser, label: `${browser} on ${name}` }
}

function DeviceIcon({ os }: { os: DeviceOS }) {
    switch (os) {
        case 'android':
            return (
                <svg className="h-4 w-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Android">
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-1.0007 0-.5512.4482-1.0006.9993-1.0006.5512 0 .9994.4494.9994 1.0006 0 .5521-.4482 1.0007-.9994 1.0007m-11.046 0c-.5511 0-.9993-.4486-.9993-1.0007 0-.5512.4482-1.0006.9993-1.0006.5511 0 .9993.4494.9993 1.0006 0 .5521-.4482 1.0007-.9993 1.0007m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8 12 8s-3.5902.4116-5.1368.9507L4.8409 5.4477a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
                </svg>
            )
        case 'ios':
        case 'mac':
            return (
                <svg className="h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Apple">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 1.01-2.88-.9.04-2 .6-2.65 1.35-.58.65-1.09 1.73-1.02 2.78.99.08 2.04-.5 2.66-1.25z" />
                </svg>
            )
        case 'windows':
            return (
                <svg className="h-4 w-4 text-sky-500 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-label="Windows">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.951-1.802" />
                </svg>
            )
        case 'linux':
            return (
                <svg className="h-4 w-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Linux">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
            )
        default:
            return (
                <svg className="h-4 w-4 text-[var(--nepal-blue)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Web">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
            )
    }
}

interface PresetTemplate {
    id: string
    label: string
    badge: string
    title: string
    body: string
    url: string
}

const PRESET_TEMPLATES: PresetTemplate[] = [
    {
        id: 'new_batch',
        label: 'New Batch Published',
        badge: 'Batch',
        title: 'नयाँ लाइसेन्स छापियो! Smart Licence Update',
        body: 'यातायात व्यवस्था विभागबाट नयाँ लाइसेन्सहरूको सूची अपडेट भएको छ। आफ्नो विवरण तुरुन्त चेक गर्नुहोस्।',
        url: '/',
    },
    {
        id: 'license_ready',
        label: 'Ready for Pickup',
        badge: 'Collection',
        title: 'लाइसेन्स संकलनका लागि तयार भएको छ',
        body: 'तपाईंको स्मार्ट ड्राइभिङ लाइसेन्स सम्बन्धित यातायात कार्यालयमा संकलनका लागि उपलब्ध छ।',
        url: '/',
    },
    {
        id: 'maintenance',
        label: 'System Maintenance',
        badge: 'Notice',
        title: 'प्रणाली मर्मत सम्बन्धी सूचना',
        body: 'आज राती १० बजेदेखि केही समयका लागि सेवा मर्मत कार्य हुनेछ।',
        url: '/',
    },
    {
        id: 'holiday',
        label: 'Office Holiday',
        badge: 'Holiday',
        title: 'सार्वजनिक बिदा सम्बन्धी जानकारी',
        body: 'सार्वजनिक बिदाका कारण सम्बन्धित यातायात कार्यालयहरू आज बन्द रहनेछन्।',
        url: '/updates',
    },
]

interface ConfirmDialogState {
    title: string
    message: string
    details?: { label: string; value: string }[]
    confirmText: string
    confirmVariant?: 'danger' | 'primary'
    onConfirm: () => Promise<void>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminPush(props: any) {
    const {
        pushLogs = [],
        pushStats = null,
        pushTotal = 0,
        pushPage = 1,
        pushLimit = 10,
        pushTotalPages = 1,
        pushSearchFilter = '',
        pushStatusFilter = 'all',
        pushLoading = false,
        privacyMode = true,
        setPushPage = () => {},
        setPushLimit = () => {},
        setPushSearchFilter = () => {},
        setPushStatusFilter = () => {},
        handleSendPushBroadcast,
        handleSendTestPushToRow,
        handleDeletePushRow,
        handleCleanExpiredPush,
        onRefresh,
        showToast: parentShowToast,
    }: AdminPushProps = props || {}

    // Composer State
    const [isComposerOpen, setIsComposerOpen] = useState(false)
    const [broadcastTitle, setBroadcastTitle] = useState('नयाँ लाइसेन्स छापियो! Smart Licence Update')
    const [broadcastBody, setBroadcastBody] = useState('यातायात व्यवस्था विभागबाट नयाँ लाइसेन्सहरूको सूची अपडेट भएको छ। आफ्नो विवरण तुरुन्त चेक गर्नुहोस्।')
    const [broadcastUrl, setBroadcastUrl] = useState('/')
    const [targetMode, setTargetMode] = useState<'all' | 'specific'>('all')
    const [broadcastLicense, setBroadcastLicense] = useState('')
    const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile')
    const [isBroadcasting, setIsBroadcasting] = useState(false)

    // Local Toast State (fallback if parent showToast prop is not provided)
    const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
    const [copiedRowId, setCopiedRowId] = useState<string | null>(null)

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<ConfirmDialogState | null>(null)
    const [confirmLoading, setConfirmLoading] = useState(false)

    // Action loading states
    const [sendingRowId, setSendingRowId] = useState<string | null>(null)
    const [testedSuccessRowId, setTestedSuccessRowId] = useState<string | null>(null)
    const [deletingRowId, setDeletingRowId] = useState<string | null>(null)
    const [cleaningStatus, setCleaningStatus] = useState<string | null>(null)

    const triggerToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        if (parentShowToast) {
            parentShowToast(message, type)
        } else {
            setLocalToast({ message, type })
            setTimeout(() => {
                setLocalToast((prev) => (prev?.message === message ? null : prev))
            }, 3200)
        }
    }

    const handleApplyPreset = (preset: PresetTemplate) => {
        setBroadcastTitle(preset.title)
        setBroadcastBody(preset.body)
        setBroadcastUrl(preset.url)
        triggerToast(`Loaded "${preset.label}" template`, 'info')
    }

    const handleCopyEndpoint = async (rowId: string, endpoint: string) => {
        try {
            await navigator.clipboard.writeText(endpoint)
            setCopiedRowId(rowId)
            setTimeout(() => setCopiedRowId(null), 2000)
            triggerToast('Endpoint URL copied to clipboard', 'success')
        } catch {
            triggerToast('Failed to copy to clipboard', 'error')
        }
    }

    // Broadcast Dispatch Confirmation & Execution
    const handleBroadcastSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!broadcastTitle.trim() || !broadcastBody.trim()) {
            triggerToast('Title and message body are required', 'error')
            return
        }

        const isTargeted = targetMode === 'specific' && broadcastLicense.trim().length > 0
        const activeCount = pushStats?.active || 0

        setConfirmModal({
            title: isTargeted ? 'Confirm Targeted Push Alert' : 'Confirm Push Broadcast to All Devices',
            message: isTargeted
                ? `You are about to dispatch a web push notification specifically to subscribers watching license ${broadcastLicense.trim()}.`
                : `You are about to dispatch an immediate web push alert to ALL ${activeCount} active subscriber devices.`,
            details: [
                { label: 'Audience', value: isTargeted ? `License: ${broadcastLicense.trim()}` : `All Active Devices (${activeCount})` },
                { label: 'Notification Title', value: broadcastTitle.trim() },
                { label: 'Destination URL', value: broadcastUrl.trim() || '/' },
            ],
            confirmText: 'Dispatch Broadcast Now',
            confirmVariant: 'primary',
            onConfirm: async () => {
                setIsBroadcasting(true)
                try {
                    const target = isTargeted ? broadcastLicense.trim() : undefined
                    if (handleSendPushBroadcast) {
                        const res = (await handleSendPushBroadcast(
                            broadcastTitle.trim(),
                            broadcastBody.trim(),
                            broadcastUrl.trim() || '/',
                            target
                        )) as { message?: string } | undefined
                        if (!parentShowToast && res?.message) {
                            triggerToast(res.message, 'success')
                        }
                    } else {
                        const res = await fetch('/api/admin/push', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'broadcast',
                                title: broadcastTitle.trim(),
                                body: broadcastBody.trim(),
                                url: broadcastUrl.trim() || '/',
                                targetLicense: target || null,
                            }),
                        })
                        const data = await res.json()
                        if (res.ok) {
                            triggerToast(data.message || 'Broadcast delivered successfully!', 'success')
                            if (onRefresh) onRefresh()
                        } else {
                            triggerToast(data.error || 'Failed to dispatch broadcast', 'error')
                        }
                    }
                } catch (err: unknown) {
                    const error = err as Error
                    triggerToast(error.message || 'Broadcast delivery failed', 'error')
                } finally {
                    setIsBroadcasting(false)
                }
            },
        })
    }

    // Direct Test to Row
    const handleSendTest = async (row: PushSubscriptionLog) => {
        setSendingRowId(row.id)
        try {
            if (handleSendTestPushToRow) {
                await handleSendTestPushToRow(row)
                setTestedSuccessRowId(row.id)
                setTimeout(() => setTestedSuccessRowId(null), 3000)
            } else {
                const res = await fetch('/api/admin/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'send_test',
                        endpoint: row.endpoint,
                        p256dh: row.p256dh,
                        auth: row.auth,
                    }),
                })
                const data = await res.json()
                if (res.ok) {
                    setTestedSuccessRowId(row.id)
                    setTimeout(() => setTestedSuccessRowId(null), 3000)
                    triggerToast('Test push notification delivered to device!', 'success')
                } else {
                    triggerToast(data.error || 'Failed to dispatch test notification', 'error')
                }
            }
        } catch {
            triggerToast('Failed to send test notification', 'error')
        } finally {
            setSendingRowId(null)
        }
    }

    // Subscription Deletion with Confirmation
    const promptDelete = (row: PushSubscriptionLog) => {
        const dev = parseDevice(row.user_agent)
        setConfirmModal({
            title: 'Delete Push Subscription',
            message: 'This device will no longer receive automated print notifications or broadcast updates.',
            details: [
                { label: 'Device', value: dev.label },
                { label: 'Target License', value: row.license_number || 'General Subscriber' },
                { label: 'Status', value: row.status },
            ],
            confirmText: 'Delete Device Token',
            confirmVariant: 'danger',
            onConfirm: async () => {
                setDeletingRowId(row.id)
                try {
                    if (handleDeletePushRow) {
                        await handleDeletePushRow(row.id)
                    } else {
                        await fetch(`/api/admin/push?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' })
                        triggerToast('Subscription deleted successfully', 'success')
                        if (onRefresh) onRefresh()
                    }
                } catch {
                    triggerToast('Failed to delete push subscription', 'error')
                } finally {
                    setDeletingRowId(null)
                }
            },
        })
    }

    // Clean Expired/Unsubscribed with Confirmation
    const promptClean = (status: 'expired' | 'unsubscribed') => {
        const count = status === 'expired' ? (pushStats?.expired || 0) : (pushStats?.unsubscribed || 0)
        setConfirmModal({
            title: `Clean Inactive Subscriptions (${status.toUpperCase()})`,
            message: `Permanently delete all ${count} subscriptions marked as ${status} to keep the database optimal.`,
            details: [
                { label: 'Category', value: status },
                { label: 'Records to purge', value: `${count} tokens` },
            ],
            confirmText: `Purge ${count} ${status} records`,
            confirmVariant: 'danger',
            onConfirm: async () => {
                setCleaningStatus(status)
                try {
                    if (handleCleanExpiredPush) {
                        await handleCleanExpiredPush(status)
                    } else {
                        const res = await fetch(`/api/admin/push?status=${status}`, { method: 'DELETE' })
                        const data = await res.json()
                        triggerToast(data.message || `Cleaned up ${status} subscriptions`, 'success')
                        if (onRefresh) onRefresh()
                    }
                } catch {
                    triggerToast('Failed to clean up subscriptions', 'error')
                } finally {
                    setCleaningStatus(null)
                }
            },
        })
    }

    return (
        <section aria-label="Web Push Notifications Console" className="space-y-4 sm:space-y-5">
            {/* Floating Toast Notification (fallback if showToast prop is not provided; matches AdminModals styling) */}
            {localToast && !parentShowToast && (
                <div className="fixed bottom-3 left-3 right-3 sm:bottom-5 sm:right-5 sm:left-auto z-50 flex items-center gap-3 rounded-2xl dev-glass-card border border-[var(--border-strong)] px-4 py-3 text-xs font-bold shadow-2xl backdrop-blur-xl sm:max-w-md animate-in slide-in-from-bottom-4 duration-200">
                    {localToast.type === 'success' ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-[var(--success-bg)] text-[var(--success)] shadow-xs">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </span>
                    ) : localToast.type === 'info' ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        </span>
                    ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-[var(--error-bg)] text-[var(--error)] shadow-xs">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </span>
                    )}
                    <span className="text-[var(--text-primary)] flex-1 min-w-0 break-words">{localToast.message}</span>
                    <button
                        type="button"
                        onClick={() => setLocalToast(null)}
                        className="ml-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0 p-1 transition cursor-pointer"
                        aria-label="Dismiss notification"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="dev-glass-card w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-5 sm:p-6 shadow-2xl space-y-4">
                        <div className="flex items-start gap-3">
                            <span
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                    confirmModal.confirmVariant === 'danger'
                                        ? 'bg-rose-500/10 text-rose-500'
                                        : 'bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)]'
                                }`}
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    {confirmModal.confirmVariant === 'danger' ? (
                                        <>
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </>
                                    ) : (
                                        <>
                                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                        </>
                                    )}
                                </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                                    {confirmModal.title}
                                </h3>
                                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                                    {confirmModal.message}
                                </p>
                            </div>
                        </div>

                        {confirmModal.details && confirmModal.details.length > 0 && (
                            <div className="rounded-xl border border-[var(--border-default)]/60 bg-[var(--bg-secondary)] p-3 space-y-2 text-xs">
                                {confirmModal.details.map((d, i) => (
                                    <div key={i} className="flex justify-between items-center gap-2">
                                        <span className="text-[var(--text-muted)] font-medium">{d.label}</span>
                                        <span className="text-[var(--text-primary)] font-bold truncate max-w-[220px] font-mono">
                                            {d.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                disabled={confirmLoading}
                                onClick={() => setConfirmModal(null)}
                                className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={confirmLoading}
                                onClick={async () => {
                                    setConfirmLoading(true)
                                    try {
                                        await confirmModal.onConfirm()
                                    } finally {
                                        setConfirmLoading(false)
                                        setConfirmModal(null)
                                    }
                                }}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition active:scale-95 cursor-pointer ${
                                    confirmModal.confirmVariant === 'danger'
                                        ? 'bg-rose-600 hover:bg-rose-700 shadow-sm'
                                        : 'bg-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)]/90 shadow-sm'
                                }`}
                            >
                                {confirmLoading ? (
                                    <>
                                        <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                        </svg>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    <span>{confirmModal.confirmText}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top KPI Metrics Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
                {/* Active Subscribers */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[var(--nepal-blue)] to-cyan-500 opacity-80" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Active Devices</span>
                        <span className="rounded-xl bg-[var(--nepal-blue-soft)] p-2 text-[var(--nepal-blue)] shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {pushStats ? pushStats.active.toLocaleString() : '0'}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Ready to receive instant push alerts</p>
                </div>

                {/* Total Subscriptions Registered */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Registered</span>
                        <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {pushStats ? pushStats.total.toLocaleString() : pushTotal.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">All-time device registrations</p>
                </div>

                {/* Notifications Delivered */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-500 opacity-80" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Alerts Sent</span>
                        <span className="rounded-xl bg-blue-600/10 p-2 text-blue-600 dark:text-blue-400 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </span>
                    </div>
                    <p className="mt-2.5 text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                        {pushStats ? pushStats.notified.toLocaleString() : '0'}
                    </p>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">FCM / APNs push dispatches</p>
                </div>

                {/* Expired / Cleaned */}
                <div className="dev-glass-card hover-lift rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-rose-500 opacity-80" />
                    <div className="flex items-center justify-between text-[var(--text-muted)]">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Expired / Revoked</span>
                        <span className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 shadow-xs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </span>
                    </div>
                    <div className="flex items-baseline justify-between mt-2.5">
                        <p className="text-2xl sm:text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--text-primary)]">
                            {pushStats ? pushStats.expired.toLocaleString() : '0'}
                        </p>
                        {pushStats && pushStats.expired > 0 && (
                            <button
                                type="button"
                                onClick={() => promptClean('expired')}
                                disabled={cleaningStatus !== null}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer transition"
                            >
                                Purge
                            </button>
                        )}
                    </div>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-[var(--text-muted)]">Auto-detected deleted browsers</p>
                </div>
            </div>

            {/* Broadcast Push Center & Interactive Studio */}
            <div className="dev-glass-card rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-6 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--nepal-blue)] text-white shadow-xs">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m3 11 18-5-5 18-4-6-9-7Z" />
                                </svg>
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)]">
                                Web Push Broadcast Studio
                            </h3>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live VAPID Gateway
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Send real-time instant notifications with live lockscreen preview and quick preset templates.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsComposerOpen((prev) => !prev)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition active:scale-95 self-start sm:self-auto cursor-pointer shadow-xs ${
                            isComposerOpen
                                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-default)]'
                                : 'bg-[var(--nepal-blue)] text-white hover:bg-[var(--nepal-blue)]/90'
                        }`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {isComposerOpen ? <line x1="18" y1="6" x2="6" y2="18" /> : <path d="M12 5v14M5 12h14" />}
                        </svg>
                        <span>{isComposerOpen ? 'Hide Studio' : 'Open Broadcast Studio'}</span>
                    </button>
                </div>

                {/* Collapsible Studio (Split Layout: Left = Composer, Right = Live Preview) */}
                {isComposerOpen && (
                    <div className="mt-5 border-t border-[var(--border-default)] pt-5 animate-in fade-in duration-200">
                        {/* Quick Presets Bar */}
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1 mr-1">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                </svg>
                                Quick Presets:
                            </span>
                            {PRESET_TEMPLATES.map((tmpl) => (
                                <button
                                    key={tmpl.id}
                                    type="button"
                                    onClick={() => handleApplyPreset(tmpl)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)] transition cursor-pointer"
                                >
                                    <span className="text-[9.5px] font-bold uppercase rounded px-1 py-0.2 bg-[var(--surface-primary)] border border-[var(--border-default)]">
                                        {tmpl.badge}
                                    </span>
                                    <span>{tmpl.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                            {/* Left Column: Composer Form (7 cols) */}
                            <form onSubmit={handleBroadcastSubmit} className="lg:col-span-7 space-y-3.5">
                                {/* Title with Counter */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-[var(--text-primary)]">
                                            Notification Title *
                                        </label>
                                        <span className={`text-[10px] font-mono tabular-nums ${broadcastTitle.length > 60 ? 'text-amber-500 font-bold' : 'text-[var(--text-muted)]'}`}>
                                            {broadcastTitle.length}/60 chars
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={broadcastTitle}
                                        onChange={(e) => setBroadcastTitle(e.target.value)}
                                        required
                                        maxLength={100}
                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)] transition"
                                        placeholder="Headline shown in phone notification"
                                    />
                                </div>

                                {/* Body with Counter */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-[var(--text-primary)]">
                                            Notification Message Body *
                                        </label>
                                        <span className={`text-[10px] font-mono tabular-nums ${broadcastBody.length > 150 ? 'text-amber-500 font-bold' : 'text-[var(--text-muted)]'}`}>
                                            {broadcastBody.length}/150 chars
                                        </span>
                                    </div>
                                    <textarea
                                        value={broadcastBody}
                                        onChange={(e) => setBroadcastBody(e.target.value)}
                                        rows={3}
                                        required
                                        maxLength={250}
                                        className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs sm:text-sm text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)] transition leading-relaxed"
                                        placeholder="Full message text displayed on user lockscreens and desktop trays"
                                    />
                                </div>

                                {/* Destination Webpage Selection (Simple & Intuitive) */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-[var(--text-primary)]">
                                            When User Taps Notification, Open:
                                        </label>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                            {broadcastUrl === '/' ? 'Homepage' : broadcastUrl === '/updates' ? 'Updates Page' : 'Custom'}
                                        </span>
                                    </div>

                                    {/* Destination Choice Pills */}
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setBroadcastUrl('/')}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                                broadcastUrl === '/'
                                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            Homepage (/)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBroadcastUrl('/updates')}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                                broadcastUrl === '/updates'
                                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            Updates Page (/updates)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (broadcastUrl === '/' || broadcastUrl === '/updates') {
                                                    setBroadcastUrl('/?number=')
                                                }
                                            }}
                                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                                                broadcastUrl !== '/' && broadcastUrl !== '/updates'
                                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            Custom Link / Query
                                        </button>
                                    </div>

                                    {/* Custom link input if custom mode selected */}
                                    {broadcastUrl !== '/' && broadcastUrl !== '/updates' && (
                                        <div className="pt-1 animate-in fade-in duration-150">
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                                    </svg>
                                                </div>
                                                <input
                                                    type="text"
                                                    value={broadcastUrl}
                                                    onChange={(e) => setBroadcastUrl(e.target.value)}
                                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] py-2 pl-8 pr-3 text-xs sm:text-sm font-mono text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)] transition"
                                                    placeholder="/ or /?number=01-06-XXXXXXXX"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Real-time full URL preview for instant clarity */}
                                    <div className="flex items-center gap-1.5 text-[10.5px] text-[var(--text-muted)] pt-0.5">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500 shrink-0">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span className="truncate">
                                            Tapping opens:{' '}
                                            <span className="font-mono font-semibold text-[var(--text-secondary)]">
                                                https://license-checker.acharyanischal.com.np{broadcastUrl.startsWith('/') ? broadcastUrl : `/${broadcastUrl}`}
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                {/* Target Audience Selector */}
                                <div className="rounded-xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/50 p-3 space-y-2.5">
                                    <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider block">
                                        Target Audience
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setTargetMode('all')}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                                targetMode === 'all'
                                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                                    : 'bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            All Active Devices ({pushStats?.active || 0})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTargetMode('specific')}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                                targetMode === 'specific'
                                                    ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                                    : 'bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            Specific License Number
                                        </button>
                                    </div>

                                    {targetMode === 'specific' && (
                                        <div className="pt-1.5 animate-in fade-in duration-150">
                                            <input
                                                type="text"
                                                value={broadcastLicense}
                                                onChange={(e) => setBroadcastLicense(e.target.value)}
                                                placeholder="e.g. 01-06-00123456"
                                                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--nepal-blue)]"
                                            />
                                            <span className="text-[10px] text-[var(--text-muted)] mt-1 block">
                                                Notification will only be sent to device subscriptions registered with this license number.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Submit Dispatch Button */}
                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={isBroadcasting}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--nepal-blue)] to-blue-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:opacity-95 transition active:scale-98 disabled:opacity-60 cursor-pointer"
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m22 2-7 20-4-9-9-4Z" />
                                            <path d="M22 2 11 13" />
                                        </svg>
                                        <span>
                                            {targetMode === 'all'
                                                ? `Broadcast to ${pushStats?.active || 0} Subscribed Devices`
                                                : `Send Targeted Alert to ${broadcastLicense || 'License'}`}
                                        </span>
                                    </button>
                                </div>
                            </form>

                            {/* Right Column: Live Interactive Preview (5 cols) */}
                            <div className="lg:col-span-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                        Live Client Preview
                                    </span>
                                    <div className="flex rounded-lg border border-[var(--border-default)] p-0.5 bg-[var(--bg-secondary)]">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDevice('mobile')}
                                            className={`rounded px-2 py-0.5 text-[10px] font-bold cursor-pointer transition ${
                                                previewDevice === 'mobile'
                                                    ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs'
                                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            Mobile Lockscreen
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewDevice('desktop')}
                                            className={`rounded px-2 py-0.5 text-[10px] font-bold cursor-pointer transition ${
                                                previewDevice === 'desktop'
                                                    ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs'
                                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            }`}
                                        >
                                            Desktop Banner
                                        </button>
                                    </div>
                                </div>

                                {previewDevice === 'mobile' ? (
                                    /* Mobile Phone Lockscreen Notification Card */
                                    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/95 text-slate-100 p-4 shadow-xl relative overflow-hidden">
                                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 border-b border-slate-800 pb-2">
                                            <div className="flex items-center gap-1.5">
                                                <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-blue-600 text-[9px] font-bold text-white">
                                                    NL
                                                </span>
                                                <span className="font-semibold text-slate-200">Nepal License Checker</span>
                                                <span>•</span>
                                                <span>Just now</span>
                                            </div>
                                            <svg className="h-3 w-3 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="m6 9 6 6 6-6" />
                                            </svg>
                                        </div>

                                        <div className="space-y-1">
                                            <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                                                {broadcastTitle || 'Notification Headline Preview'}
                                            </h4>
                                            <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed break-words">
                                                {broadcastBody || 'Message preview will appear here as you type in the broadcast studio...'}
                                            </p>
                                        </div>

                                        {/* Action buttons on notification */}
                                        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-800/80">
                                            <div className="inline-flex items-center gap-1 rounded-md bg-blue-600/90 hover:bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white transition">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <circle cx="11" cy="11" r="8" />
                                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                </svg>
                                                <span>Check License</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 px-2 py-1 font-semibold">
                                                Dismiss
                                            </div>
                                            <div className="ml-auto text-[9.5px] text-slate-400 font-mono truncate max-w-[120px]">
                                                {broadcastUrl || '/'}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Desktop Banner Notification Card */
                                    <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 text-slate-100 p-3.5 shadow-xl relative">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">
                                                NL
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10.5px] font-bold text-slate-400">
                                                        NEPAL DRIVING LICENSE CHECKER
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">now</span>
                                                </div>
                                                <h4 className="text-xs font-bold text-white leading-tight">
                                                    {broadcastTitle || 'Notification Headline Preview'}
                                                </h4>
                                                <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                                                    {broadcastBody || 'Notification body text will appear in the system tray toast...'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-2.5 pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400 font-mono truncate max-w-[200px]">
                                                {broadcastUrl || '/'}
                                            </span>
                                            <span className="font-bold text-blue-400">Open & Check</span>
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-xl border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/60 p-2.5 text-[11px] text-[var(--text-muted)] space-y-1">
                                    <div className="flex items-center gap-1.5 font-semibold text-[var(--text-secondary)]">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Native PWA Background Wakeup
                                    </div>
                                    <p className="text-[10.5px] leading-relaxed">
                                        Delivered via Google FCM / Apple APNs directly to devices, even when the browser is completely closed or in background.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Subscriptions Explorer & Filter Header */}
            <div className="dev-glass-card rounded-2xl sm:rounded-3xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Search Input with Clear Button */}
                    <div className="relative flex-1 max-w-md">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--text-muted)]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={pushSearchFilter}
                            onChange={(e) => {
                                setPushSearchFilter(e.target.value)
                                setPushPage(1)
                            }}
                            placeholder="Search by license number, browser, or platform..."
                            className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] py-2 pl-9 pr-8 text-xs sm:text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--nepal-blue)] transition"
                        />
                        {pushSearchFilter && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPushSearchFilter('')
                                    setPushPage(1)
                                }}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                                aria-label="Clear search"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Filter Pills with Counts & Quick Refresh */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {(
                            [
                                { id: 'all', label: 'All', count: pushStats?.total || pushTotal },
                                { id: 'active', label: 'Active', count: pushStats?.active || 0 },
                                { id: 'unsubscribed', label: 'Unsubscribed', count: pushStats?.unsubscribed || 0 },
                                { id: 'expired', label: 'Expired', count: pushStats?.expired || 0 },
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => {
                                    setPushStatusFilter(tab.id)
                                    setPushPage(1)
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                                    pushStatusFilter === tab.id
                                        ? 'bg-[var(--nepal-blue)] text-white shadow-xs'
                                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`rounded-md px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                                        pushStatusFilter === tab.id
                                            ? 'bg-white/20 text-white'
                                            : 'bg-[var(--surface-primary)] text-[var(--text-muted)]'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        ))}

                        {onRefresh && (
                            <button
                                type="button"
                                onClick={onRefresh}
                                title="Refresh subscription list"
                                className="ml-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] p-1.5 text-[var(--text-muted)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                                aria-label="Refresh"
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Subscriptions Table */}
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-[var(--border-default)] text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                <th className="pb-3 pl-2">Device & Platform</th>
                                <th className="pb-3 px-3">Target License</th>
                                <th className="pb-3 px-3">Status</th>
                                <th className="pb-3 px-3">Subscribed Date</th>
                                <th className="pb-3 px-3">Last Push Alert</th>
                                <th className="pb-3 pr-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-default)]/60">
                            {pushLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-sm text-[var(--text-muted)]">
                                        <div className="inline-flex items-center gap-2">
                                            <svg className="h-4 w-4 animate-spin text-[var(--nepal-blue)]" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                            </svg>
                                            <span>Loading push subscriptions...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : pushLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-sm text-[var(--text-muted)]">
                                        No push subscriptions matching this filter.
                                    </td>
                                </tr>
                            ) : (
                                pushLogs.map((row) => {
                                    const dev = parseDevice(row.user_agent)
                                    const isRowCopied = copiedRowId === row.id
                                    const isRowTesting = sendingRowId === row.id
                                    const isRowTested = testedSuccessRowId === row.id

                                    return (
                                        <tr key={row.id} className="hover:bg-[var(--bg-secondary)]/50 transition">
                                            {/* Device column */}
                                            <td className="py-3 pl-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)]/70">
                                                        <DeviceIcon os={dev.os} />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-[var(--text-primary)] truncate max-w-[170px]">
                                                                {dev.name}
                                                            </span>
                                                            <span className="rounded px-1.5 py-0.2 text-[9.5px] font-semibold bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                                                                {dev.browser}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-0.5">
                                                            <span className="truncate max-w-[160px] font-mono">
                                                                {row.endpoint.slice(0, 32)}...
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyEndpoint(row.id, row.endpoint)}
                                                                title="Copy Push Endpoint URL"
                                                                className="text-[var(--text-muted)] hover:text-[var(--nepal-blue)] cursor-pointer"
                                                            >
                                                                {isRowCopied ? (
                                                                    <svg className="h-3 w-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Target License */}
                                            <td className="py-3 px-3">
                                                {row.license_number ? (
                                                    <span className="font-mono font-bold text-[var(--nepal-blue)] bg-[var(--nepal-blue-soft)] px-2 py-0.5 rounded-md text-[11px]">
                                                        {privacyMode ? maskLicenseNumber(row.license_number, true) : row.license_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-[var(--text-muted)] italic">
                                                        General Updates
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-3 px-3">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                                        row.status === 'active'
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                            : row.status === 'expired'
                                                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                    }`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${
                                                            row.status === 'active'
                                                                ? 'bg-emerald-500 animate-pulse'
                                                                : 'bg-current'
                                                        }`}
                                                    />
                                                    {row.status}
                                                </span>
                                            </td>

                                            {/* Subscribed Date */}
                                            <td className="py-3 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                                                <div>{formatNepalDateTime(row.created_at, 'en')}</div>
                                                <div className="text-[10px] text-[var(--text-muted)]">
                                                    {formatTimeAgo(row.created_at)}
                                                </div>
                                            </td>

                                            {/* Last Notified */}
                                            <td className="py-3 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                                                {row.last_notified_at ? (
                                                    <div className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                        <span>{formatTimeAgo(row.last_notified_at)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] text-[var(--text-muted)]">—</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 pr-2 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5">
                                                    {row.status === 'active' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSendTest(row)}
                                                            disabled={isRowTesting}
                                                            title="Dispatch live test notification to this specific device"
                                                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-50 cursor-pointer ${
                                                                isRowTested
                                                                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                    : 'border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--nepal-blue)] hover:bg-[var(--nepal-blue-soft)]'
                                                            }`}
                                                        >
                                                            {isRowTesting ? (
                                                                <>
                                                                    <svg className="h-3 w-3 animate-spin text-[var(--nepal-blue)]" viewBox="0 0 24 24" fill="none">
                                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                                                    </svg>
                                                                    <span>Sending...</span>
                                                                </>
                                                            ) : isRowTested ? (
                                                                <>
                                                                    <svg className="h-3 w-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                                        <polyline points="20 6 9 17 4 12" />
                                                                    </svg>
                                                                    <span>Sent ✓</span>
                                                                </>
                                                            ) : (
                                                                <span>Test</span>
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => promptDelete(row)}
                                                        disabled={deletingRowId === row.id}
                                                        title="Delete subscription"
                                                        className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-primary)] p-1 text-[var(--text-muted)] hover:text-rose-600 hover:border-rose-300 transition disabled:opacity-50 cursor-pointer"
                                                        aria-label="Delete subscription"
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pushTotalPages > 1 && (
                    <div className="mt-4 border-t border-[var(--border-default)]/60 pt-3">
                        <AdminPagination
                            currentPage={pushPage}
                            totalPages={pushTotalPages}
                            totalItems={pushTotal}
                            pageSize={pushLimit}
                            onPageChange={setPushPage}
                            onPageSizeChange={setPushLimit}
                        />
                    </div>
                )}
            </div>
        </section>
    )
}
