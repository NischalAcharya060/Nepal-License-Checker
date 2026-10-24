'use client'

import { useState } from 'react'
import { FeedbackLog, AdminPasskey, ConfirmDialogState, ToastState } from '../types'
import { formatNepalDateTime } from '@/lib/cronHelper'
import { formatTimeAgo, maskLicenseNumber, maskIpAddress } from '../helpers'

export interface AdminModalsProps {
    selectedFeedbackMessage?: FeedbackLog | null
    setSelectedFeedbackMessage?: (msg: FeedbackLog | null) => void
    handleToggleFeedbackStatus?: (id: string, currentStatus: 'new' | 'resolved') => Promise<void>
    privacyMode?: boolean
    passkeyModalOpen?: boolean
    setPasskeyModalOpen?: (open: boolean) => void
    newPasskeyName?: string
    setNewPasskeyName?: (name: string) => void
    registeringPasskey?: boolean
    handleRegisterPasskey?: (e: React.FormEvent) => Promise<void>
    passkeys?: AdminPasskey[]
    fetchPasskeys?: () => Promise<void> | void
    handleDeletePasskey?: (passkey: AdminPasskey) => void
    confirmDialog?: ConfirmDialogState | null
    setConfirmDialog?: (dialog: ConfirmDialogState | null) => void
    confirmSubmitting?: boolean
    inactivityWarningOpen?: boolean
    inactivitySecondsLeft?: number
    handleLogout?: (reason?: 'inactivity') => void
    stayLoggedIn?: () => void
    toast?: ToastState | null
    setToast?: (toast: ToastState | null) => void
}

interface ConfirmDeleteModalProps {
    dialog: ConfirmDialogState
    onClose: () => void
    isSubmitting: boolean
}

function ConfirmDeleteModal({ dialog, onClose, isSubmitting }: ConfirmDeleteModalProps) {
    const [phraseInput, setPhraseInput] = useState('')

    const isPhraseMatched =
        !dialog.requiredPhrase ||
        phraseInput.trim().toLowerCase() === dialog.requiredPhrase.trim().toLowerCase()

    const handleExecute = async () => {
        if (isSubmitting || !isPhraseMatched) return
        try {
            await dialog.onConfirm()
        } finally {
            onClose()
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-fade-in"
            onClick={() => {
                if (!isSubmitting) onClose()
            }}
        >
            <div
                className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-primary)] p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Visual grabber bar on mobile */}
                <div className="mx-auto -mt-1 mb-3 h-1 w-12 rounded-full bg-[var(--border-strong)] sm:hidden" />

                <div className="flex items-start gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error)] shadow-xs">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black text-[var(--text-primary)]">
                            {dialog.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                            {dialog.message}
                        </p>
                    </div>
                </div>

                {dialog.requiredPhrase && (
                    <div className="mt-4 rounded-2xl border border-[var(--error-border)]/60 bg-[var(--error-bg)]/30 p-3.5">
                        <label htmlFor="confirm-phrase-input" className="block text-xs font-semibold text-[var(--text-secondary)]">
                            To confirm deletion, please type{' '}
                            <span className="font-mono font-bold text-[var(--error)] bg-[var(--surface-primary)] px-1.5 py-0.5 rounded-md border border-[var(--error-border)] select-all">
                                {dialog.requiredPhrase}
                            </span>{' '}
                            below:
                        </label>
                        <div className="relative mt-2">
                            <input
                                id="confirm-phrase-input"
                                type="text"
                                autoFocus
                                value={phraseInput}
                                onChange={(e) => setPhraseInput(e.target.value)}
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && isPhraseMatched && !isSubmitting) {
                                        e.preventDefault()
                                        await handleExecute()
                                    }
                                }}
                                placeholder={`Type "${dialog.requiredPhrase}"`}
                                autoComplete="off"
                                spellCheck={false}
                                className={`h-10 w-full rounded-xl border bg-[var(--surface-primary)] px-3 pr-24 text-xs font-mono font-bold text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:ring-2 ${
                                    isPhraseMatched && phraseInput
                                        ? 'border-[var(--success-border)] focus:border-[var(--success)] focus:ring-[var(--success)]/20'
                                        : 'border-[var(--border-default)] focus:border-[var(--error)] focus:ring-[var(--error)]/20'
                                }`}
                            />
                            {isPhraseMatched && phraseInput && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[var(--success)] flex items-center gap-1 select-none pointer-events-none">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>Matched</span>
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 border-t border-[var(--border-default)] pt-4">
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50 text-center cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isSubmitting || !isPhraseMatched}
                        onClick={handleExecute}
                        className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--error)] px-4.5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>{isSubmitting ? 'Processing...' : dialog.confirmLabel}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function AdminModals(props: any) {
    const {
        selectedFeedbackMessage = null,
        setSelectedFeedbackMessage = () => {},
        handleToggleFeedbackStatus = async () => {},
        privacyMode = true,
        passkeyModalOpen = false,
        setPasskeyModalOpen = () => {},
        newPasskeyName = '',
        setNewPasskeyName = () => {},
        registeringPasskey = false,
        handleRegisterPasskey = async (e: React.FormEvent) => { e.preventDefault() },
        passkeys = [],
        fetchPasskeys = () => {},
        handleDeletePasskey = () => {},
        confirmDialog = null,
        setConfirmDialog = () => {},
        confirmSubmitting = false,
        inactivityWarningOpen = false,
        inactivitySecondsLeft = 60,
        handleLogout = () => {},
        stayLoggedIn = () => {},
        toast = null,
        setToast = () => {},
    }: AdminModalsProps = props || {}

    return (
        <>
            {/* Detail Message Modal */}
            {selectedFeedbackMessage && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-fade-in"
                    onClick={() => setSelectedFeedbackMessage(null)}
                >
                    <div
                        className="relative w-full max-w-xl rounded-t-3xl sm:rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-primary)] p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Visual grabber bar on mobile */}
                        <div className="mx-auto -mt-1 mb-3 h-1 w-12 rounded-full bg-[var(--border-strong)] sm:hidden" />

                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] pb-4">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                                        selectedFeedbackMessage.status === 'new'
                                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                            : 'border-[var(--success)]/30 bg-[var(--success-bg)] text-[var(--success)]'
                                    }`}>
                                        {selectedFeedbackMessage.status === 'new' ? (
                                            <>
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                <span>New Inquiry</span>
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
                                    <span className="text-xs text-[var(--text-muted)] font-mono" title={`${formatNepalDateTime(selectedFeedbackMessage.created_at, 'en', true)} (NPT, UTC+5:45)`}>
                                        {formatNepalDateTime(selectedFeedbackMessage.created_at, 'en', true)} (NPT) • {formatTimeAgo(selectedFeedbackMessage.created_at)}
                                    </span>
                                </div>
                                <h3 className="mt-2 text-base sm:text-lg font-black text-[var(--text-primary)]">
                                    {selectedFeedbackMessage.subject}
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedFeedbackMessage(null)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--nepal-blue)] hover:text-[var(--text-primary)] transition cursor-pointer shrink-0"
                                aria-label="Close modal"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Submitter & License Info */}
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 text-xs">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Submitter Name</span>
                                <p className="font-bold text-[var(--text-primary)] mt-0.5">{selectedFeedbackMessage.name}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">Contact Email</span>
                                <p className="mt-0.5">
                                    <a
                                        href={`mailto:${selectedFeedbackMessage.email}?subject=${encodeURIComponent(`Re: [Support] ${selectedFeedbackMessage.subject}`)}`}
                                        className="font-mono font-semibold text-[var(--nepal-blue)] hover:underline break-all"
                                    >
                                        {selectedFeedbackMessage.email}
                                    </a>
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">License Number</span>
                                <p className="font-mono font-semibold text-[var(--text-primary)] mt-0.5">
                                    {selectedFeedbackMessage.license_number
                                        ? maskLicenseNumber(selectedFeedbackMessage.license_number, privacyMode)
                                        : 'Not provided'}
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">IP & Category</span>
                                <p className="text-[var(--text-secondary)] mt-0.5 font-mono text-[11px]">
                                    {selectedFeedbackMessage.category} ·{' '}
                                    {selectedFeedbackMessage.ip
                                        ? maskIpAddress(selectedFeedbackMessage.ip, privacyMode)
                                        : 'Unknown IP'}
                                </p>
                            </div>
                        </div>

                        {/* Message Body */}
                        <div className="mt-4">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                User Message:
                            </span>
                            <div className="mt-1.5 max-h-56 sm:max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-3.5 sm:p-4 font-sans text-xs leading-relaxed text-[var(--text-primary)] select-text">
                                {selectedFeedbackMessage.message}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="mt-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-[var(--border-default)] pt-4">
                            <button
                                type="button"
                                onClick={() => handleToggleFeedbackStatus(selectedFeedbackMessage.id, selectedFeedbackMessage.status)}
                                className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition active:scale-95 cursor-pointer ${
                                    selectedFeedbackMessage.status === 'new'
                                        ? 'bg-[var(--success)] text-white hover:bg-emerald-600'
                                        : 'border border-[var(--border-default)] bg-[var(--surface-primary)] text-[var(--text-primary)] hover:border-amber-500 hover:text-amber-600'
                                }`}
                            >
                                {selectedFeedbackMessage.status === 'new' ? (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Mark as Resolved</span>
                                    </>
                                ) : (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M1 4v6h6" />
                                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                        </svg>
                                        <span>Reopen as New</span>
                                    </>
                                )}
                            </button>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                <a
                                    href={`mailto:${selectedFeedbackMessage.email}?subject=${encodeURIComponent(`Re: [Support] ${selectedFeedbackMessage.subject}`)}`}
                                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-mid)] active:scale-95"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                    </svg>
                                    <span>Reply by Email</span>
                                </a>

                                <button
                                    type="button"
                                    onClick={() => setSelectedFeedbackMessage(null)}
                                    className="min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-center transition active:scale-95 cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Passkeys & Biometric Security Modal */}
            {passkeyModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-fade-in"
                    onClick={() => setPasskeyModalOpen(false)}
                >
                    <div
                        className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-primary)] p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Visual grabber bar on mobile */}
                        <div className="mx-auto -mt-1 mb-3 h-1 w-12 rounded-full bg-[var(--border-strong)] sm:hidden" />

                        {/* Modal Header */}
                        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-default)] pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--nepal-blue)]/30 bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] shadow-xs">
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0" />
                                        <path d="M15.54 8.46a5 5 0 0 0-7.08 0M8.46 15.54a5 5 0 0 0 7.08 0" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-[var(--text-primary)]">
                                        Passkeys & Biometric Access
                                    </h3>
                                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                                        Sign in with 1-click using Windows Hello, Touch ID, Face ID, or YubiKey.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPasskeyModalOpen(false)}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--nepal-blue)] hover:text-[var(--text-primary)] transition cursor-pointer shrink-0"
                                aria-label="Close"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Section 1: Register New Passkey */}
                        <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                                Register This Device
                            </h4>
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                                Add your current device or security key to sign in without entering your password.
                            </p>

                            <form onSubmit={handleRegisterPasskey} className="mt-3.5 flex flex-col gap-2 sm:flex-row">
                                <input
                                    type="text"
                                    value={newPasskeyName}
                                    onChange={(e) => setNewPasskeyName(e.target.value)}
                                    placeholder="Device name (e.g. My Laptop, iPhone, YubiKey)"
                                    maxLength={50}
                                    className="h-11 sm:h-10 flex-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 text-xs text-[var(--text-primary)] transition focus:border-[var(--nepal-blue)] focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={registeringPasskey}
                                    className="inline-flex min-h-[44px] sm:h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-mid)] active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {registeringPasskey ? (
                                        <>
                                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            <span>Touch Sensor / Key...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <circle cx="12" cy="12" r="3" />
                                                <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0" />
                                            </svg>
                                            <span>Register Passkey</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Section 2: Enrolled Passkeys List */}
                        <div className="mt-5">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                    Enrolled Passkeys ({passkeys.length})
                                </h4>
                                <button
                                    type="button"
                                    onClick={fetchPasskeys}
                                    className="text-[11px] font-semibold text-[var(--nepal-blue)] hover:underline cursor-pointer"
                                >
                                    Refresh list
                                </button>
                            </div>

                            {passkeys.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-6 text-center text-xs text-[var(--text-muted)]">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 text-[var(--text-muted)] opacity-60" aria-hidden="true">
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0" />
                                    </svg>
                                    <p className="font-semibold text-[var(--text-secondary)]">No passkeys enrolled yet</p>
                                    <p className="mt-1">Register your current device above to get started.</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {passkeys.map((pk) => (
                                        <div
                                            key={pk.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 sm:p-3.5 transition hover:border-[var(--nepal-blue)]/40"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--text-primary)]">
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <rect x="2" y="3" width="20" height="14" rx="2" />
                                                        <line x1="8" y1="21" x2="16" y2="21" />
                                                        <line x1="12" y1="17" x2="12" y2="21" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                                                            {pk.device_name}
                                                        </span>
                                                        {pk.backed_up ? (
                                                            <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold">
                                                                Cloud Synced
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0.2 text-[9px] font-bold">
                                                                Device Bound
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--text-muted)] font-mono">
                                                        <span>Added {formatTimeAgo(pk.created_at)}</span>
                                                        <span>•</span>
                                                        <span>{pk.last_used_at ? `Used ${formatTimeAgo(pk.last_used_at)}` : 'Never used'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleDeletePasskey(pk)}
                                                className="self-end sm:self-auto rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-muted)] transition hover:border-[var(--error-border)] hover:bg-[var(--error-bg)] hover:text-[var(--error)] active:scale-95 cursor-pointer"
                                                title="Remove passkey"
                                                aria-label={`Remove passkey ${pk.device_name}`}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section 3: Security Callout */}
                        <div className="mt-5 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]/60 p-3.5 text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
                            <span className="rounded-lg bg-[var(--nepal-blue-soft)] p-1.5 text-[var(--nepal-blue)] shrink-0">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </span>
                            <div className="leading-relaxed">
                                <strong className="text-[var(--text-primary)]">Zero-Password Security:</strong> Passkeys use public-key cryptography (FIDO2 / WebAuthn). Your private keys remain safely stored in your device&apos;s secure enclave or keychain. The master password remains available as a reliable backup anytime.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDialog && (
                <ConfirmDeleteModal
                    key={confirmDialog.title + confirmDialog.confirmLabel}
                    dialog={confirmDialog}
                    onClose={() => setConfirmDialog(null)}
                    isSubmitting={confirmSubmitting}
                />
            )}

            {/* Inactivity Auto-Logout Warning Modal */}
            {inactivityWarningOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-fade-in"
                    role="alertdialog"
                    aria-labelledby="inactivity-warning-title"
                    aria-describedby="inactivity-warning-desc"
                >
                    <div
                        className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[var(--warning-border)] bg-[var(--surface-primary)] p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Visual grabber bar on mobile */}
                        <div className="mx-auto -mt-1 mb-3 h-1 w-12 rounded-full bg-[var(--border-strong)] sm:hidden" />

                        <div className="flex items-start gap-3.5">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)] shadow-xs">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <h3 id="inactivity-warning-title" className="text-base font-black text-[var(--text-primary)]">
                                        Inactivity Warning
                                    </h3>
                                    <span className="inline-flex items-center rounded-full border border-[var(--warning-border)] bg-[var(--warning-bg)] px-2 py-0.5 text-xs font-bold text-[var(--warning-text)]">
                                        Auto Logout
                                    </span>
                                </div>
                                <p id="inactivity-warning-desc" className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                                    You have been inactive for 4 minutes. For security, your session will automatically log out in:
                                </p>
                            </div>
                        </div>

                        {/* Prominent Countdown Timer */}
                        <div className="my-5 flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] py-4 text-center">
                            <div className="flex items-baseline gap-1 text-3xl font-black font-mono tabular-nums tracking-tight text-[var(--nepal-red)]">
                                <span>{inactivitySecondsLeft}</span>
                                <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">seconds</span>
                            </div>
                            <div className="mt-2.5 h-1.5 w-44 sm:w-52 overflow-hidden rounded-full bg-[var(--border-default)]">
                                <div
                                    className="h-full bg-gradient-to-r from-[var(--warning-text)] to-[var(--nepal-red)] transition-all duration-1000 ease-linear"
                                    style={{ width: `${(inactivitySecondsLeft / 60) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 border-t border-[var(--border-default)] pt-4">
                            <button
                                type="button"
                                onClick={() => handleLogout('inactivity')}
                                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-2.5 text-xs font-bold text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 text-center cursor-pointer"
                            >
                                Log Out Now
                            </button>
                            <button
                                type="button"
                                autoFocus
                                onClick={stayLoggedIn}
                                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--nepal-blue)] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[var(--nepal-blue-mid)] active:scale-95 text-center cursor-pointer"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Stay Logged In</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Toast Notification */}
            {toast && (
                <div className="fixed bottom-3 left-3 right-3 sm:bottom-5 sm:right-5 sm:left-auto z-50 flex items-center gap-3 rounded-2xl dev-glass-card border border-[var(--border-strong)] px-4 py-3 text-xs font-bold shadow-2xl backdrop-blur-xl sm:max-w-md animate-in slide-in-from-bottom-4 duration-200">
                    {toast.type === 'success' ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-[var(--success-bg)] text-[var(--success)] shadow-xs">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </span>
                    ) : toast.type === 'info' ? (
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
                    <span className="text-[var(--text-primary)] flex-1 min-w-0 break-words">{toast.message}</span>
                    <button
                        type="button"
                        onClick={() => setToast(null)}
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
        </>
    )
}
