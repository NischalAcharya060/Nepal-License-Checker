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
        label: 'DoTM Record Verified',
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
        label: 'Printing In Progress',
        badge: 'In Progress',
        text: 'Your driving license smart card printing is currently in queue at the central DoTM facility. You can track updates on our portal. We will notify you as soon as the status changes.',
        status: 'in_progress' as FeedbackStatus,
    },
    {
        label: 'Email Alert Verified',
        badge: 'Resolved',
        text: 'We have checked our email notification system. Your email subscription is active. As soon as your smart license card is printed by DoTM, you will receive an automatic email notification.',
        status: 'resolved' as FeedbackStatus,
    },
    {
        label: 'Issue Investigated & Resolved',
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

    // Adjust state when feedback selection changes
    const [prevFeedbackId, setPrevFeedbackId] = useState<string | null>(null)
    if (feedback && feedback.id !== prevFeedbackId) {
        setPrevFeedbackId(feedback.id)
        setSelectedStatus(feedback.status || 'new')
        setReplyText(feedback.admin_notes || '')
        setSendEmail(true)
        setStatusMessage(null)
        setLocalRevealPrivacy(false)
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

    // Effective privacy mode for this modal (can be temporarily revealed by the admin)
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 lg:p-6 backdrop-blur-md animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-modal-title"
        >
            <div
                className="relative w-full max-w-5xl xl:max-w-6xl h-full max-h-[94vh] sm:max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-primary)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual Grabber Bar for Mobile */}
                <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-[var(--border-strong)] sm:hidden shrink-0" />

                {/* ─────────────────────────────────────────────────────────────
                    HEADER BAR (Fixed at top)
                ───────────────────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]/60 px-5 sm:px-6 py-4 shrink-0">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
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
                                {feedback.status === 'new' ? (
                                    <>
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                        <span>New Inquiry</span>
                                    </>
                                ) : feedback.status === 'in_progress' ? (
                                    <>
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        <span>In Progress</span>
                                    </>
                                ) : (
                                    <>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Resolved</span>
                                    </>
                                )}
                            </span>

                            {/* Ticket Reference Chip with Copy */}
                            <button
                                type="button"
                                onClick={() => handleCopy(feedback.id, 'ticket_id')}
                                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-0.5 text-xs font-mono font-bold text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition cursor-pointer"
                                title="Click to copy Tracking Reference ID"
                            >
                                <span>#{feedback.id}</span>
                                {copiedField === 'ticket_id' ? (
                                    <span className="text-[10px] text-emerald-600 font-sans">✓ Copied</span>
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
                                <span>{isProblemType ? '⚠️ Problem' : '💬 Inquiry'}</span>
                            </span>

                            {/* Public Tracking Portal Link */}
                            <a
                                href={trackingPublicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--nepal-blue)] hover:border-[var(--nepal-blue)] transition"
                                title="Open live public tracking page for this inquiry in a new tab"
                            >
                                <span>Track Online</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                            </a>

                            {/* Time Ago */}
                            <span
                                className="text-xs text-[var(--text-muted)] font-mono ml-auto sm:ml-0"
                                title={`${formatNepalDateTime(feedback.created_at, 'en', true)} (NPT, UTC+5:45)`}
                            >
                                {formatTimeAgo(feedback.created_at)}
                            </span>
                        </div>

                        {/* Subject */}
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
                    SCROLLABLE BODY (Two-Column Layout on Desktop)
                ───────────────────────────────────────────────────────────── */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
                        
                        {/* ─────────────────────────────────────────────────────
                            LEFT COLUMN: Submitter Profile, Message & History (lg:col-span-5)
                        ───────────────────────────────────────────────────── */}
                        <div className="lg:col-span-5 space-y-4">
                            {/* Card 1: Submitter & Ticket Details */}
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

                                    {/* Privacy Peek Button */}
                                    {privacyMode && (
                                        <button
                                            type="button"
                                            onClick={() => setLocalRevealPrivacy((prev) => !prev)}
                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold border transition cursor-pointer ${
                                                localRevealPrivacy
                                                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                                    : 'border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            }`}
                                            title={localRevealPrivacy ? 'Privacy mode unmasked in this modal' : 'Click to unmask license & IP in this modal'}
                                        >
                                            {localRevealPrivacy ? (
                                                <>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                        <circle cx="12" cy="12" r="3" />
                                                    </svg>
                                                    <span>Masked OFF</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                                        <line x1="1" y1="1" x2="23" y2="23" />
                                                    </svg>
                                                    <span>Masked ON</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>

                                <div className="mt-3 space-y-2.5 text-xs">
                                    {/* Email */}
                                    <div>
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                Contact Email
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                                {emailHistory.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0.2 text-[9.5px] font-bold">
                                                        <span>✉️ {emailHistory.length} sent</span>
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopy(feedback.email, 'email')}
                                                    className="text-[10px] text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                    title="Copy email address"
                                                >
                                                    {copiedField === 'email' ? '✓ Copied' : 'Copy'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <a
                                                href={`mailto:${feedback.email}?subject=${encodeURIComponent(`Re: [Support #${feedback.id}] ${feedback.subject}`)}`}
                                                className="font-mono font-semibold text-[var(--nepal-blue)] hover:underline break-all truncate text-xs"
                                                title={`Send email to ${feedback.email}`}
                                            >
                                                {feedback.email}
                                            </a>
                                        </div>
                                    </div>

                                    {/* License Number & Category */}
                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-default)]/60">
                                        <div>
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                    License No.
                                                </span>
                                                {feedback.license_number && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopy(feedback.license_number || '', 'license')}
                                                        className="text-[10px] text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                                        title="Copy license number"
                                                    >
                                                        {copiedField === 'license' ? '✓' : 'Copy'}
                                                    </button>
                                                )}
                                            </div>
                                            <p className="font-mono font-bold text-[var(--text-primary)] truncate text-xs">
                                                {feedback.license_number
                                                    ? maskLicenseNumber(feedback.license_number, effectivePrivacy)
                                                    : 'Not provided'}
                                            </p>
                                        </div>

                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                                Category
                                            </span>
                                            <p className="font-semibold text-[var(--text-secondary)] truncate text-xs mt-0.5" title={categoryLabel}>
                                                {categoryLabel}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Submission Timestamps & IP */}
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-default)]/60 text-[11px] text-[var(--text-muted)]">
                                        <div>
                                            <span className="text-[9.5px] uppercase font-bold text-[var(--text-muted)] block">Received (NPT)</span>
                                            <span className="font-mono text-[10.5px] text-[var(--text-secondary)]">
                                                {formatNepalDateTime(feedback.created_at, 'en', false)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[9.5px] uppercase font-bold text-[var(--text-muted)] block">Client IP</span>
                                            <span className="font-mono text-[10.5px] text-[var(--text-secondary)]">
                                                {feedback.ip ? maskIpAddress(feedback.ip, effectivePrivacy) : '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick Manual Tracking Sender */}
                                    <div className="pt-2 border-t border-[var(--border-default)]/60 flex items-center justify-between">
                                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                                            Need to send tracking ref?
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleSendTracking}
                                            disabled={isSendingTracking}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--nepal-blue)] hover:bg-[var(--nepal-blue)] hover:text-white transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                                            title="Manually email tracking reference number and status link to user"
                                        >
                                            {isSendingTracking ? (
                                                <>
                                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    <span>Sending...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                                    </svg>
                                                    <span>Email Tracking Link</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Original User Message */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-default)]">
                                    <div className="flex items-center gap-2">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                            Submitter Message
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleCopy(feedback.message, 'message')}
                                        className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--nepal-blue)] transition cursor-pointer"
                                        title="Copy full message text"
                                    >
                                        {copiedField === 'message' ? '✓ Copied' : 'Copy Text'}
                                    </button>
                                </div>
                                <div className="max-h-48 sm:max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 p-3.5 font-sans text-xs leading-relaxed text-[var(--text-primary)] select-text">
                                    {feedback.message}
                                </div>
                            </div>

                            {/* Card 3: Previous Emails Sent Timeline */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] overflow-hidden shadow-xs">
                                <div className="flex items-center justify-between p-3.5 bg-[var(--bg-secondary)]/50 border-b border-[var(--border-default)]">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmailHistory((prev) => !prev)}
                                        className="flex items-center gap-2 text-left transition cursor-pointer"
                                    >
                                        <span className="text-sm">📬</span>
                                        <span className="text-xs font-bold text-[var(--text-primary)]">
                                            Email Delivery History ({emailHistory.length})
                                        </span>
                                        <svg
                                            width="13"
                                            height="13"
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
                                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--nepal-blue)] hover:bg-[var(--surface-primary)] transition cursor-pointer disabled:opacity-50"
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
                                    <div className="p-3.5 space-y-3 max-h-56 overflow-y-auto divide-y divide-[var(--border-default)]/60">
                                        {emailHistory.length === 0 ? (
                                            <div className="py-4 text-center">
                                                <p className="text-xs text-[var(--text-muted)] italic">
                                                    No prior logged emails for this address.
                                                </p>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                                    Any reply or status update sent will appear here automatically.
                                                </p>
                                            </div>
                                        ) : (
                                            emailHistory.map((item, idx) => (
                                                <div key={item.id || idx} className={`${idx > 0 ? 'pt-2.5' : ''} space-y-1`}>
                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            {item.template_type === 'feedback_confirmation' ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[9.5px] font-bold text-amber-700 dark:text-amber-300">
                                                                    <span>🟡 Confirmation</span>
                                                                </span>
                                                            ) : item.template_type === 'feedback_tracking' ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[9.5px] font-bold text-purple-700 dark:text-purple-300">
                                                                    <span>🟣 Tracking Link</span>
                                                                </span>
                                                            ) : item.template_type === 'license_notification' ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700 dark:text-emerald-300">
                                                                    <span>🔔 License Alert</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[9.5px] font-bold text-blue-700 dark:text-blue-300">
                                                                    <span>🔵 Status Reply</span>
                                                                </span>
                                                            )}
                                                            <span className="font-semibold text-[var(--text-primary)] text-[11px] truncate max-w-[190px]" title={item.subject}>
                                                                {item.subject}
                                                            </span>
                                                        </div>
                                                        <span
                                                            className="text-[10px] font-mono text-[var(--text-muted)] shrink-0"
                                                            title={`${formatNepalDateTime(item.created_at, 'en', true)} (NPT)`}
                                                        >
                                                            {formatTimeAgo(item.created_at)}
                                                        </span>
                                                    </div>

                                                    {item.snippet && (
                                                        <p className="text-[10.5px] text-[var(--text-secondary)] line-clamp-2 italic bg-[var(--bg-secondary)]/40 p-1.5 rounded-lg border border-[var(--border-default)]/40 leading-snug">
                                                            &quot;{item.snippet}&quot;
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-between text-[9.5px] text-[var(--text-muted)] font-mono">
                                                        <span>To: {item.recipient}</span>
                                                        <span>Provider: <strong className="uppercase">{item.provider}</strong></span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─────────────────────────────────────────────────────
                            RIGHT COLUMN: Admin Reply & Status Management (lg:col-span-7)
                        ───────────────────────────────────────────────────── */}
                        <div className="lg:col-span-7 space-y-4">
                            
                            {/* Card: Status Selector (Visual Radio Cards) */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">🎯</span>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                            Ticket Status Controller
                                        </h3>
                                    </div>
                                    {selectedStatus !== feedback.status && (
                                        <button
                                            type="button"
                                            onClick={() => handleStatusOnly(selectedStatus)}
                                            disabled={isSaving}
                                            className="text-[11px] font-bold text-[var(--nepal-blue)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                            title="Instantly update status in database without sending email"
                                        >
                                            <span>⚡ Update in DB Only</span>
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
                                            {selectedStatus === 'new' && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold block">Pending</span>
                                        <span className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
                                            Inquiry received &amp; queued
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
                                            {selectedStatus === 'in_progress' && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold block">In Progress</span>
                                        <span className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
                                            Investigating or verifying DoTM
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
                                            {selectedStatus === 'resolved' && (
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <span className="text-xs font-bold block">Resolved</span>
                                        <span className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
                                            Inquiry solved / closed
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Card: Quick Response Templates */}
                            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-4 shadow-xs">
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-1.5">
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="16" y1="13" x2="8" y2="13" />
                                            <line x1="16" y1="17" x2="8" y2="17" />
                                            <polyline points="10 9 9 9 8 9" />
                                        </svg>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                            Quick Response Presets
                                        </span>
                                    </div>
                                    {replyText && (
                                        <button
                                            type="button"
                                            onClick={() => setReplyText('')}
                                            className="text-[10px] font-semibold text-[var(--text-muted)] hover:text-red-500 transition cursor-pointer"
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
                                            className="group inline-flex items-center gap-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/50 px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] hover:bg-[var(--surface-primary)] transition cursor-pointer shadow-2xs"
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
                                        <span>Official Admin Resolution Note</span>
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
                                    placeholder="Type official reply or resolution for the submitter. This note will appear on their live tracking portal and be dispatched to their email..."
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/30 p-3.5 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:bg-[var(--surface-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--nepal-blue)]/20 resize-none leading-relaxed"
                                />

                                <p className="mt-1.5 text-[10.5px] text-[var(--text-muted)] leading-tight">
                                    ℹ️ Visible to user on the tracking portal under reference #{feedback.id}.
                                </p>
                            </div>

                            {/* Card: Notification Settings */}
                            <div className="rounded-2xl border border-[var(--nepal-blue)]/25 bg-[var(--nepal-blue)]/5 p-3.5 sm:p-4">
                                <div className="flex items-start sm:items-center justify-between gap-3">
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
                                                Will send to: {feedback.email}
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

                            {/* Status Message Toast/Banner */}
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
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--border-default)] bg-[var(--bg-secondary)]/60 px-5 sm:px-6 py-3.5 shrink-0">
                    {/* Left Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="min-h-[42px] inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                        >
                            Close
                        </button>

                        <a
                            href={`mailto:${feedback.email}?subject=${encodeURIComponent(`Re: [Support #${feedback.id}] ${feedback.subject}`)}`}
                            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition shadow-xs"
                            title="Open in your default email client"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <rect x="2" y="4" width="20" height="16" rx="2" />
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                            <span>Client Mail</span>
                        </a>
                    </div>

                    {/* Right Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        {/* Send Tracking Reference Button */}
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
                                    <span>Sending Ref...</span>
                                </>
                            ) : (
                                <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    <span>Resend Tracking No.</span>
                                </>
                            )}
                        </button>

                        {/* Update Status Only */}
                        <button
                            type="button"
                            onClick={() => handleStatusOnly(selectedStatus)}
                            disabled={isSaving}
                            className="min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2 text-xs font-bold text-[var(--text-primary)] hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                            title="Update status directly in database without sending email"
                        >
                            <span>⚡</span>
                            <span>Update Status Only</span>
                        </button>

                        {/* Primary Save & Send Button */}
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
                                    <span>{sendEmail ? 'Save & Send Email Reply' : 'Save Changes'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
