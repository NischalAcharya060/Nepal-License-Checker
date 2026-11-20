// src/app/admin/modals/FeedbackDetailModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { FeedbackLog, FeedbackStatus } from '../types'
import { FEEDBACK_CATEGORIES } from '@/lib/feedback'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo, maskLicenseNumber, maskIpAddress } from '../helpers'

export interface FeedbackDetailModalProps {
    feedback: FeedbackLog | null
    onClose: () => void
    privacyMode?: boolean
    onToggleStatus?: (id: string, currentStatus: FeedbackStatus) => Promise<void>
    onSetStatus?: (id: string, status: FeedbackStatus) => Promise<void>
    onSendTrackingEmail?: (id: string) => Promise<boolean>
    onSaveReply?: (params: {
        id: string
        status: FeedbackStatus
        adminNotes: string
        sendEmail: boolean
    }) => Promise<boolean>
}

interface EmailHistoryItem {
    id: string
    recipient: string
    subject: string
    template_type: string
    reference_id?: string | null
    status: string
    provider: string
    message_id?: string | null
    snippet?: string | null
    created_at: number
}

const QUICK_TEMPLATES = [
    {
        label: 'DoTM Verified',
        badge: 'In Progress',
        text: 'Namaste! We have verified your driving license details with the Department of Transport Management (DoTM) records. Your record is confirmed and printing/distribution is in progress. Please check the portal periodically for updates.',
        status: 'in_progress' as FeedbackStatus,
    },
    {
        label: 'Ready for Collection',
        badge: 'Resolved',
        text: 'Good news! Your driving license smart card is printed and ready for collection. Please visit your designated Transport Management Office with your original Nepali citizenship and revenue payment voucher to collect your card.',
        status: 'resolved' as FeedbackStatus,
    },
    {
        label: 'Printing in Queue',
        badge: 'In Progress',
        text: 'Your driving license smart card printing is currently in queue at the central DoTM facility. You can track updates on our portal. We will notify you as soon as the status changes.',
        status: 'in_progress' as FeedbackStatus,
    },
    {
        label: 'Email Alert Active',
        badge: 'Resolved',
        text: 'We have checked our email notification system. Your email subscription is active. As soon as your smart license card is printed by DoTM, you will receive an automatic email notification.',
        status: 'resolved' as FeedbackStatus,
    },
    {
        label: 'Investigated & Fixed',
        badge: 'Resolved',
        text: 'Thank you for reporting this issue. Our technical team has investigated and resolved the issue. Please verify again on the license search portal. If you still encounter issues, feel free to reply or submit another inquiry.',
        status: 'resolved' as FeedbackStatus,
    },
    {
        label: 'More Info Needed',
        badge: 'In Progress',
        text: 'To help investigate your inquiry further, could you please provide your Application/Token number, registered mobile number, or date of biometric verification? You can reply directly to this email.',
        status: 'in_progress' as FeedbackStatus,
    },
]

export default function FeedbackDetailModal({
    feedback,
    onClose,
    privacyMode = true,
    onToggleStatus,
    onSetStatus,
    onSendTrackingEmail,
    onSaveReply,
}: FeedbackDetailModalProps) {
    const [selectedStatus, setSelectedStatus] = useState<FeedbackStatus>('new')
    const [replyText, setReplyText] = useState('')
    const [sendEmail, setSendEmail] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isSendingTracking, setIsSendingTracking] = useState(false)
    const [isFetchingEmails, setIsFetchingEmails] = useState(false)
    const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null)
    const [emailHistory, setEmailHistory] = useState<EmailHistoryItem[]>([])
    const [showEmailHistory, setShowEmailHistory] = useState(true)
    const [copiedField, setCopiedField] = useState<string | null>(null)
    const [localRevealPrivacy, setLocalRevealPrivacy] = useState(false)

    // Live DOTM Database Verification Bridge
    const [dbCheckLoading, setDbCheckLoading] = useState(false)
    const [dbCheckResult, setDbCheckResult] = useState<{
        searched: boolean
        found: boolean
        data?: {
            holder_name: string
            office: string
            category: string
            license_number: string
        } | null
        error?: string | null
    } | null>(null)

    // Adjust state when feedback selection changes
    const [prevFeedbackId, setPrevFeedbackId] = useState<string | null>(null)
    if (feedback && feedback.id !== prevFeedbackId) {
        setPrevFeedbackId(feedback.id)
        setSelectedStatus(feedback.status || 'new')
        setReplyText(feedback.admin_notes || '')
        setSendEmail(true)
        setStatusMessage(null)
        setLocalRevealPrivacy(false)
        setDbCheckResult(null)
    }

    // Handle Escape key to close modal
    useEffect(() => {
        if (!feedback) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [feedback, onClose])

    // Prevent background scrolling while modal is open
    useEffect(() => {
        if (!feedback) return
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = originalOverflow
        }
    }, [feedback])

    // Copy to clipboard helper
    const handleCopy = (text: string, fieldName: string) => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopiedField(fieldName)
        setTimeout(() => setCopiedField(null), 2000)
    }

    // Live DB Verification query
    const handleCheckLiveDb = async () => {
        if (!feedback?.license_number || dbCheckLoading) return
        setDbCheckLoading(true)
        try {
            const res = await fetch(`/api/license?number=${encodeURIComponent(feedback.license_number)}`)
            const data = await res.json()
            if (res.ok && data.status === 'success' && data.data) {
                setDbCheckResult({
                    searched: true,
                    found: true,
                    data: data.data,
                })
            } else {
                setDbCheckResult({
                    searched: true,
                    found: false,
                    error: data.error || 'License not found in printed gazette index',
                })
            }
        } catch {
            setDbCheckResult({
                searched: true,
                found: false,
                error: 'Could not connect to database',
            })
        } finally {
            setDbCheckLoading(false)
        }
    }

    const applyDbResultToReply = () => {
        if (dbCheckResult?.found && dbCheckResult.data) {
            const tpl = `Namaste ${feedback?.name || 'Citizen'}! We verified your driving license (${dbCheckResult.data.license_number}) in the official DOTM database. Your smart card has been PRINTED and is ready for collection at ${dbCheckResult.data.office} for vehicle categories: ${dbCheckResult.data.category}. Please bring your original citizenship card and revenue payment voucher.`
            setReplyText(tpl)
            setSelectedStatus('resolved')
        } else if (dbCheckResult?.searched && !dbCheckResult.found) {
            const tpl = `Namaste ${feedback?.name || 'Citizen'}. We checked the latest DOTM printed list for license ${feedback?.license_number}. Your card is not yet in the printed gazette and remains in the printing backlog. We will notify you once your batch is published.`
            setReplyText(tpl)
            setSelectedStatus('in_progress')
        }
    }

    // Fetch previous emails sent to this recipient/ticket on load or feedback change
    useEffect(() => {
        if (!feedback?.email || !feedback?.id) return
        const email = feedback.email
        const ticketId = feedback.id

        let isMounted = true
        fetch(`/api/admin/feedback/emails?email=${encodeURIComponent(email)}&ticketId=${encodeURIComponent(ticketId)}`)
            .then((res) => res.json())
            .then((data) => {
                if (!isMounted) return
                if (data.status === 'success' && Array.isArray(data.data?.logs)) {
                    setEmailHistory(data.data.logs)
                } else {
                    setEmailHistory([])
                }
            })
            .catch(() => {
                if (isMounted) setEmailHistory([])
            })

        return () => {
            isMounted = false
        }
    }, [feedback?.id, feedback?.email])

    // Manual reload for refresh button or after sending emails
    const loadEmailHistory = async () => {
        if (!feedback?.email || !feedback?.id || isFetchingEmails) return
        setIsFetchingEmails(true)
        try {
            const res = await fetch(
                `/api/admin/feedback/emails?email=${encodeURIComponent(feedback.email)}&ticketId=${encodeURIComponent(feedback.id)}`
            )
            const data = await res.json()
            if (data.status === 'success' && Array.isArray(data.data?.logs)) {
                setEmailHistory(data.data.logs)
            } else {
                setEmailHistory([])
            }
        } catch {
            setEmailHistory([])
        } finally {
            setIsFetchingEmails(false)
        }
    }

    const handleSendTracking = async () => {
        if (!feedback || isSendingTracking) return
        setIsSendingTracking(true)
        setStatusMessage(null)

        try {
            if (onSendTrackingEmail) {
                const ok = await onSendTrackingEmail(feedback.id)
                if (ok) {
                    setStatusMessage({
                        text: `Tracking reference number (${feedback.id}) successfully emailed to ${feedback.email}!`,
                    })
                    loadEmailHistory()
                } else {
                    setStatusMessage({ text: 'Failed to send tracking email.', isError: true })
                }
            }
        } catch {
            setStatusMessage({ text: 'An unexpected error occurred while sending tracking email.', isError: true })
        } finally {
            setIsSendingTracking(false)
        }
    }

    if (!feedback) return null

    const categoryItem = FEEDBACK_CATEGORIES.find((c) => c.id === feedback.category)
    const categoryLabel = categoryItem?.label || feedback.category
    const isProblemType = categoryItem?.isProblem ?? (feedback.category.includes('problem') || feedback.category.includes('issue'))

    // Effective privacy mode for this modal
    const effectivePrivacy = privacyMode && !localRevealPrivacy

    // Public tracking link
    const trackingPublicUrl = `/feedback?email=${encodeURIComponent(feedback.email)}&id=${encodeURIComponent(feedback.id)}`

    // Avatar initials
    const initials = feedback.name
        ? feedback.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : 'U'

    const handleApplyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
        setReplyText(tpl.text)
        setSelectedStatus(tpl.status)
    }

    const handleStatusOnly = async (statusToSet: FeedbackStatus) => {
        if (!feedback) return
        setIsSaving(true)
        setStatusMessage(null)

        try {
            if (onSetStatus) {
                await onSetStatus(feedback.id, statusToSet)
                setSelectedStatus(statusToSet)
                setStatusMessage({
                    text: `Status updated to "${statusToSet === 'in_progress' ? 'In Progress' : statusToSet === 'resolved' ? 'Resolved' : 'Pending'}"!`,
                })
                setTimeout(() => {
                    onClose()
                }, 800)
            } else if (onSaveReply) {
                const ok = await onSaveReply({
                    id: feedback.id,
                    status: statusToSet,
                    adminNotes: replyText.trim() || feedback.admin_notes || '',
                    sendEmail: false,
                })
                if (ok) {
                    setSelectedStatus(statusToSet)
                    setStatusMessage({
                        text: `Status updated to "${statusToSet === 'in_progress' ? 'In Progress' : statusToSet === 'resolved' ? 'Resolved' : 'Pending'}"!`,
                    })
                    setTimeout(() => {
                        onClose()
                    }, 800)
                } else {
                    setStatusMessage({ text: 'Failed to update status.', isError: true })
                }
            } else if (onToggleStatus) {
                await onToggleStatus(feedback.id, statusToSet)
                onClose()
            }
        } catch {
            setStatusMessage({ text: 'An unexpected error occurred while updating status.', isError: true })
        } finally {
            setIsSaving(false)
        }
    }

    const handleSave = async () => {
        if (!feedback) return
        setIsSaving(true)
        setStatusMessage(null)

        try {
            if (onSaveReply) {
                const ok = await onSaveReply({
                    id: feedback.id,
                    status: selectedStatus,
                    adminNotes: replyText.trim(),
                    sendEmail,
                })
                if (ok) {
                    setStatusMessage({
                        text: `Saved successfully!${sendEmail ? ` Notification email sent to ${feedback.email}.` : ''}`,
                    })
                    loadEmailHistory()
                    setTimeout(() => {
                        onClose()
                    }, 1200)
                } else {
                    setStatusMessage({ text: 'Failed to save reply.', isError: true })
                }
            } else if (onToggleStatus) {
                await onToggleStatus(feedback.id, selectedStatus)
                onClose()
            }
        } catch {
            setStatusMessage({ text: 'An unexpected error occurred.', isError: true })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 dark:bg-black/85 p-2 sm:p-4 lg:p-6 backdrop-blur-xl animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
        >
            <div
                className="relative w-full max-w-6xl xl:max-w-7xl h-full max-h-[94vh] sm:max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border border-white/15 dark:border-white/10 bg-[var(--surface-primary)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Accent Top Line */}
                <div
                    className={`h-1.5 w-full shrink-0 transition-colors duration-300 ${
                        feedback.status === 'new'
                            ? 'bg-amber-500'
                            : feedback.status === 'in_progress'
                            ? 'bg-blue-500'
                            : 'bg-emerald-500'
                    }`}
                />

                {/* Visual Grabber Bar for Mobile */}
                <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-[var(--border-strong)] sm:hidden shrink-0" />

                {/* ─────────────────────────────────────────────────────────────
                    HEADER BAR (Fixed at top)
                ───────────────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/50 px-5 sm:px-6 py-3.5 shrink-0">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            {/* Status Badge */}
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                                    feedback.status === 'new'
                                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                        : feedback.status === 'in_progress'
                                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                }`}
                            >
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                    feedback.status === 'new'
                                        ? 'bg-amber-500 animate-pulse'
                                        : feedback.status === 'in_progress'
                                        ? 'bg-blue-500 animate-pulse'
                                        : 'bg-emerald-500'
                                }`} />
                                <span>{feedback.status === 'new' ? 'Pending' : feedback.status === 'in_progress' ? 'In Progress' : 'Resolved'}</span>
                            </span>

                            {/* Ticket Reference Chip with Copy */}
                            <button
                                type="button"
                                onClick={() => handleCopy(feedback.id, 'ticket_id')}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-0.5 text-xs font-mono font-bold text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition cursor-pointer shadow-2xs"
                                title="Click to copy Tracking Reference ID"
                            >
                                <span>#{feedback.id}</span>
                                {copiedField === 'ticket_id' ? (
                                    <span className="text-[10px] text-emerald-600 font-sans font-bold">✓ Copied</span>
                                ) : (
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                    </svg>
                                )}
                            </button>

                            {/* Category Badge */}
                            <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                                    isProblemType
                                        ? 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
                                        : 'border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                }`}
                            >
                                <span>{isProblemType ? '⚠️ Issue' : '💬 Inquiry'}</span>
                            </span>

                            {/* Public Tracking Portal Link */}
                            <a
                                href={trackingPublicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition shadow-2xs"
                                title="Open live public tracking portal in new tab"
                            >
                                <span>Track Online</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>

                            {/* Time Received */}
                            <span
                                className="text-xs text-[var(--text-muted)] font-mono ml-auto sm:ml-0"
                                title={`${formatNepalDateTime(feedback.created_at, 'en', true)} (NPT)`}
                            >
                                {formatTimeAgo(feedback.created_at)}
                            </span>
                        </div>

                        {/* Subject Heading */}
                        <h2
                            id="feedback-modal-title"
                            className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight truncate"
                            title={feedback.subject}
                        >
                            {feedback.subject}
                        </h2>
                    </div>

                    {/* Close Button */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-muted)] hover:border-[var(--nepal-blue)] hover:text-[var(--text-primary)] transition cursor-pointer shadow-xs active:scale-95"
                            aria-label="Close modal (Esc)"
                            title="Close modal (Esc)"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    SCROLLABLE BODY (Two-Column Support Studio)
                ───────────────────────────────────────────────────────────── */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
                        
                        {/* ─────────────────────────────────────────────────────
                            LEFT COLUMN: Submitter Profile, DB Bridge & History (lg:col-span-5)
                        ───────────────────────────────────────────────────── */}
                        <div className="lg:col-span-5 space-y-4">
                            {/* Card 1: Citizen Profile & DB Bridge */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nepal-blue)]/10 border border-[var(--nepal-blue)]/25 text-xs font-black text-[var(--nepal-blue)]">
                                            {initials}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                                                {feedback.name}
                                            </h3>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                Inquiry Submitter
                                            </p>
                                        </div>
                                    </div>

                                    {/* Privacy Toggle */}
                                    {privacyMode && (
                                        <button
                                            type="button"
                                            onClick={() => setLocalRevealPrivacy((prev) => !prev)}
                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold border transition cursor-pointer ${
                                                localRevealPrivacy
                                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                                    : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            }`}
                                            title={localRevealPrivacy ? 'Privacy mode unmasked' : 'Click to unmask details in this modal'}
                                        >
                                            {localRevealPrivacy ? 'Mask OFF' : 'Mask ON'}
                                        </button>
                                    )}
                                </div>

                                <div className="mt-3 space-y-2.5 text-xs">
                                    {/* Email Contact */}
                                    <div>
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                Contact Email
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(feedback.email, 'email')}
                                                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                title="Copy email address"
                                            >
                                                {copiedField === 'email' ? '✓ Copied' : 'Copy'}
                                            </button>
                                        </div>
                                        <a
                                            href={`mailto:${feedback.email}?subject=${encodeURIComponent(`Re: [Support #${feedback.id}] ${feedback.subject}`)}`}
                                            className="font-mono font-semibold text-[var(--nepal-blue)] hover:underline break-all truncate block text-xs"
                                        >
                                            {feedback.email}
                                        </a>
                                    </div>

                                    {/* License Number & Live DB Bridge */}
                                    <div className="pt-2 border-t border-[var(--border-default)]/60">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                Driving License Number
                                            </span>
                                            {feedback.license_number && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(feedback.license_number || '', 'license')}
                                                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                >
                                                    {copiedField === 'license' ? '✓ Copied' : 'Copy'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono font-bold text-xs text-[var(--text-primary)]">
                                                {feedback.license_number
                                                    ? maskLicenseNumber(feedback.license_number, effectivePrivacy)
                                                    : 'None Provided'}
                                            </span>

                                            {feedback.license_number && (
                                                <button
                                                    type="button"
                                                    onClick={handleCheckLiveDb}
                                                    disabled={dbCheckLoading}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue)]/10 px-2 py-0.5 text-[10.5px] font-bold text-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)] hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs shrink-0"
                                                    title="Query official database index for this license number"
                                                >
                                                    {dbCheckLoading ? (
                                                        <>
                                                            <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                            <span>Checking...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>🔍 Verify in DB</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Inline Live Verification Output */}
                                        {dbCheckResult && (
                                            <div
                                                className={`mt-2 rounded-xl p-2.5 text-xs border animate-fade-in ${
                                                    dbCheckResult.found
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                                                        : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <div>
                                                        <div className="font-bold flex items-center gap-1 text-[11px]">
                                                            <span>{dbCheckResult.found ? '✅ RECORD PRINTED' : '⚠️ NOT IN PRINT GAZETTE'}</span>
                                                        </div>
                                                        {dbCheckResult.found && dbCheckResult.data ? (
                                                            <div className="text-[10.5px] mt-1 space-y-0.5 leading-snug font-sans">
                                                                <div><strong>Holder:</strong> {dbCheckResult.data.holder_name}</div>
                                                                <div><strong>Office:</strong> {dbCheckResult.data.office}</div>
                                                                <div><strong>Category:</strong> {dbCheckResult.data.category}</div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[10.5px] mt-0.5 leading-snug">
                                                                {dbCheckResult.error || 'License not indexed in DOTM print records.'}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={applyDbResultToReply}
                                                        className="shrink-0 px-2 py-1 rounded bg-[var(--surface-primary)] border border-current text-[10px] font-bold hover:opacity-80 transition cursor-pointer shadow-2xs"
                                                        title="Paste verification result into admin reply box"
                                                    >
                                                        Auto-fill Reply ➔
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Submitter Category & IP */}
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-default)]/60 text-[11px] text-[var(--text-muted)] font-mono">
                                        <div>
                                            <span className="text-[9.5px] uppercase font-bold text-[var(--text-muted)] block">Category</span>
                                            <span className="font-sans text-[11px] text-[var(--text-secondary)] font-semibold truncate block">
                                                {categoryLabel}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[9.5px] uppercase font-bold text-[var(--text-muted)] block">Client IP</span>
                                            <span className="text-[11px] text-[var(--text-secondary)] truncate block">
                                                {feedback.ip ? maskIpAddress(feedback.ip, effectivePrivacy) : '—'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Original User Message */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-default)]">
                                    <div className="flex items-center gap-1.5">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                            Citizen Message
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(feedback.message, 'message')}
                                        className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                        title="Copy full message text"
                                    >
                                        {copiedField === 'message' ? '✓ Copied' : 'Copy'}
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-3 font-sans text-xs leading-relaxed text-[var(--text-primary)] select-text">
                                    {feedback.message}
                                </div>
                            </div>

                            {/* Card 3: Email Dispatch History Timeline */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] overflow-hidden shadow-xs">
                                <div className="flex items-center justify-between p-3.5 bg-[var(--bg-secondary)]/50 border-b border-[var(--border-default)]">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailHistory((prev) => !prev)}
                                        className="flex items-center gap-2 text-left transition cursor-pointer"
                                    >
                                        <span className="text-xs font-bold text-[var(--text-primary)]">
                                            Email Timeline ({emailHistory.length})
                                        </span>
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className={`text-[var(--text-muted)] transition-transform duration-200 ${showEmailHistory ? 'rotate-180' : ''}`}
                                            aria-hidden="true"
                                        >
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={loadEmailHistory}
                                        disabled={isFetchingEmails}
                                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer disabled:opacity-50"
                                        title="Refresh email history"
                                    >
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className={isFetchingEmails ? 'animate-spin' : ''}
                                        >
                                            <polyline points="23 4 23 10 17 10" />
                                            <polyline points="1 20 1 14 7 14" />
                                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                                        </svg>
                                    </button>
                                </div>

                                {showEmailHistory && (
                                    <div className="p-3 space-y-2.5 max-h-52 overflow-y-auto divide-y divide-[var(--border-default)]/60 text-xs">
                                        {emailHistory.length === 0 ? (
                                            <p className="py-3 text-center text-xs text-[var(--text-muted)] italic">
                                                No previous emails dispatched to this address.
                                            </p>
                                        ) : (
                                            emailHistory.map((item, idx) => (
                                                <div key={item.id || idx} className={`${idx > 0 ? 'pt-2' : ''} space-y-0.5`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-semibold text-[11px] text-[var(--text-primary)] truncate max-w-[200px]">
                                                            {item.subject}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                                                            {formatTimeAgo(item.created_at)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[9.5px] text-[var(--text-muted)] font-mono">
                                                        <span>To: {item.recipient}</span>
                                                        <span className="uppercase">{item.provider}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─────────────────────────────────────────────────────
                            RIGHT COLUMN: Admin Resolution Composer (lg:col-span-7)
                        ───────────────────────────────────────────────────── */}
                        <div className="lg:col-span-7 space-y-4">
                            
                            {/* Card: Status Controller */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                        Ticket Resolution Status
                                    </h3>
                                    {selectedStatus !== feedback.status && (
                                        <button
                                            type="button"
                                            onClick={() => handleStatusOnly(selectedStatus)}
                                            disabled={isSaving}
                                            className="text-[10.5px] font-bold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                            title="Update status in database without sending email"
                                        >
                                            ⚡ Save Status in DB Only
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    {/* Option 1: New / Pending */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStatus('new')}
                                        className={`rounded-xl border p-3 text-left transition flex flex-col justify-between cursor-pointer ${
                                            selectedStatus === 'new'
                                                ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)]/40 text-[var(--text-secondary)] hover:border-amber-400'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                                            {selectedStatus === 'new' && <span className="text-[10px] font-bold">ACTIVE</span>}
                                        </div>
                                        <span className="text-xs font-bold block">Pending</span>
                                        <span className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                                            Queued for review
                                        </span>
                                    </button>

                                    {/* Option 2: In Progress */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStatus('in_progress')}
                                        className={`rounded-xl border p-3 text-left transition flex flex-col justify-between cursor-pointer ${
                                            selectedStatus === 'in_progress'
                                                ? 'border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)]/40 text-[var(--text-secondary)] hover:border-blue-400'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                                            {selectedStatus === 'in_progress' && <span className="text-[10px] font-bold">ACTIVE</span>}
                                        </div>
                                        <span className="text-xs font-bold block">In Progress</span>
                                        <span className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                                            DOTM verification active
                                        </span>
                                    </button>

                                    {/* Option 3: Resolved */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStatus('resolved')}
                                        className={`rounded-xl border p-3 text-left transition flex flex-col justify-between cursor-pointer ${
                                            selectedStatus === 'resolved'
                                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                                                : 'border-[var(--border-default)] bg-[var(--bg-secondary)]/40 text-[var(--text-secondary)] hover:border-emerald-400'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            {selectedStatus === 'resolved' && <span className="text-[10px] font-bold">ACTIVE</span>}
                                        </div>
                                        <span className="text-xs font-bold block">Resolved</span>
                                        <span className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                                            Inquiry solved / closed
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Card: Quick Response Presets */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                        Quick Templates
                                    </span>
                                    {replyText && (
                                        <button
                                            type="button"
                                            onClick={() => setReplyText('')}
                                            className="text-[10px] font-semibold text-red-500 hover:underline cursor-pointer"
                                        >
                                            Clear Note
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {QUICK_TEMPLATES.map((tpl) => (
                                        <button
                                            key={tpl.label}
                                            type="button"
                                            onClick={() => handleApplyTemplate(tpl)}
                                            className="group inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] hover:bg-[var(--surface-primary)] transition cursor-pointer shadow-2xs"
                                        >
                                            <span>+ {tpl.label}</span>
                                            <span
                                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                                    tpl.status === 'resolved'
                                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                                                }`}
                                            >
                                                {tpl.badge}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Card: Admin Resolution Notes Composer */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="adminReply" className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 20h9" />
                                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                        </svg>
                                        <span>Official Resolution Note</span>
                                    </label>
                                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                                        {replyText.length} / 2000
                                    </span>
                                </div>

                                <textarea
                                    id="adminReply"
                                    rows={5}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    maxLength={2000}
                                    placeholder="Type official reply or resolution for the citizen. This note appears on their tracking page and is emailed directly to them..."
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/30 p-3.5 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 resize-none leading-relaxed"
                                />

                                <p className="mt-1.5 text-[10.5px] text-[var(--text-muted)]">
                                    ℹ️ Displays publicly to the submitter on the status tracking portal under reference #{feedback.id}.
                                </p>
                            </div>

                            {/* Card: Email Dispatch Switch */}
                            <div className="rounded-2xl border border-[var(--nepal-blue)]/25 bg-[var(--nepal-blue)]/5 p-3.5 sm:p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={sendEmail}
                                            onChange={(e) => setSendEmail(e.target.checked)}
                                            className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--nepal-blue)] cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-xs font-bold text-[var(--text-primary)] block">
                                                Send email notification to submitter
                                            </span>
                                            <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                                                Recipient: {feedback.email}
                                            </span>
                                        </div>
                                    </label>

                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                                            sendEmail
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-default)]'
                                        }`}
                                    >
                                        {sendEmail ? 'Email Active' : 'No Email'}
                                    </span>
                                </div>
                            </div>

                            {/* Status Message Notification */}
                            {statusMessage && (
                                <div
                                    className={`rounded-xl border p-3 text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in ${
                                        statusMessage.isError
                                            ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span>{statusMessage.isError ? '⚠️' : '✅'}</span>
                                        <span>{statusMessage.text}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStatusMessage(null)}
                                        className="text-[10px] opacity-70 hover:opacity-100 cursor-pointer font-bold"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    FOOTER ACTION BAR (Fixed at bottom)
                ───────────────────────────────────────────────────────────── */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]/50 px-5 sm:px-6 py-3.5 shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="min-h-[42px] inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                        >
                            Close
                        </button>

                        <button
                            type="button"
                            onClick={handleSendTracking}
                            disabled={isSendingTracking || isSaving}
                            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                            title="Manually email tracking number and portal status link to user"
                        >
                            {isSendingTracking ? (
                                <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--nepal-blue)] border-t-transparent" />
                                    <span>Sending Link...</span>
                                </>
                            ) : (
                                <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    <span>Resend Tracking Link</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleStatusOnly(selectedStatus)}
                            disabled={isSaving}
                            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                            title="Update status directly in database without sending email"
                        >
                            <span>⚡ Update DB Status Only</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-[var(--nepal-blue-dark)] transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    <span>Saving &amp; Sending...</span>
                                </>
                            ) : (
                                <>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                        <polyline points="17 21 17 13 7 13 7 21" />
                                        <polyline points="7 3 7 8 15 8" />
                                    </svg>
                                    <span>{sendEmail ? 'Save & Send Email Reply' : 'Save Resolution'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
