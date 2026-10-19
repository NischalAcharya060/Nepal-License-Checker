'use client'

import React, { useState, useEffect } from 'react'
import type { Language } from '@/lib/i18n'

interface TestimonialModalProps {
    isOpen: boolean
    onClose: () => void
    language?: Language
    onSubmitted?: () => void
}

export default function TestimonialModal({
    isOpen,
    onClose,
    language = 'en',
    onSubmitted,
}: TestimonialModalProps) {
    const isNe = language === 'ne'

    const [name, setName] = useState('')
    const [role, setRole] = useState('')
    const [rating, setRating] = useState(5)
    const [hoverRating, setHoverRating] = useState(0)
    const [message, setMessage] = useState('')
    const [email, setEmail] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [isSuccess, setIsSuccess] = useState(false)

    // Reset when modal opens without cascading effect setState
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen)
        if (isOpen) {
            setIsSuccess(false)
            setErrorMessage('')
        }
    }

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isSubmitting) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, isSubmitting, onClose])

    if (!isOpen) return null

    const ratingLabels: Record<number, { en: string; ne: string }> = {
        5: { en: 'Outstanding / Very Helpful', ne: 'अति उत्तम / धेरै उपयोगी' },
        4: { en: 'Very Good Experience', ne: 'राम्रो अनुभव' },
        3: { en: 'Good & Satisfactory', ne: 'सन्तोषजनक' },
        2: { en: 'Fair / Could Be Better', ne: 'सामान्य / सुधार आवश्यक' },
        1: { en: 'Poor / Difficult to Use', ne: 'कमजोर' },
    }

    const currentDisplayRating = hoverRating || rating

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmitting) return

        setErrorMessage('')

        if (!name.trim() || name.trim().length < 2) {
            setErrorMessage(isNe ? 'कृपया आफ्नो पूरा नाम लेख्नुहोस्।' : 'Please enter your full name (at least 2 characters).')
            return
        }

        if (!message.trim() || message.trim().length < 5) {
            setErrorMessage(
                isNe
                    ? 'कृपया आफ्नो अनुभव वा प्रतिक्रिया कम्तीमा ५ अक्षरमा लेख्नुहोस्।'
                    : 'Please share your experience (at least 5 characters).'
            )
            return
        }

        if (email.trim() && (!email.includes('@') || !email.includes('.'))) {
            setErrorMessage(isNe ? 'कृपया मान्य इमेल ठेगाना लेख्नुहोस्।' : 'Please enter a valid email address.')
            return
        }

        setIsSubmitting(true)

        try {
            const res = await fetch('/api/testimonials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    role: role.trim() || undefined,
                    rating,
                    message: message.trim(),
                    email: email.trim() || undefined,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || (isNe ? 'प्रतिक्रिया पठाउन सकिएन।' : 'Failed to submit feedback.'))
            }

            setIsSuccess(true)
            setName('')
            setRole('')
            setMessage('')
            setEmail('')
            setRating(5)
            if (onSubmitted) {
                onSubmitted()
            }
        } catch (err: unknown) {
            const error = err as Error
            setErrorMessage(error.message || (isNe ? 'प्रतिक्रिया पठाउँदा समस्या भयो।' : 'Something went wrong.'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="testimonial-modal-title"
        >
            <div
                className="relative w-full max-w-lg rounded-3xl dev-glass-card p-5 sm:p-7 shadow-2xl transition max-h-[92vh] overflow-y-auto no-scrollbar"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-[var(--border-default)]/60 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h2
                                id="testimonial-modal-title"
                                className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)]"
                            >
                                {isNe ? 'आफ्नो अनुभव साझा गर्नुहोस्' : 'Share Your Experience'}
                            </h2>
                            <p className="text-xs text-[var(--text-muted)]">
                                {isNe
                                    ? 'तपाईंको अमूल्य प्रतिक्रियाले अन्य नागरिकहरूलाई मद्दत पुग्नेछ'
                                    : 'Your review helps fellow drivers and citizens across Nepal'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-[var(--border-default)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                        aria-label="Close dialog"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* Success View */}
                {isSuccess ? (
                    <div className="py-8 text-center animate-fade-in">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3 className="mt-4 text-base sm:text-lg font-black text-[var(--text-primary)]">
                            {isNe ? 'प्रतिक्रियाका लागि धन्यवाद!' : 'Thank you for your feedback!'}
                        </h3>
                        <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[var(--text-secondary)]">
                            {isNe
                                ? 'तपाईंको अनुभव सफलतापूर्वक सुरक्षित भएको छ। एड्मिन टोलीले जाँच गरेपछि यो स्वचालित रूपमा टेस्टिमोनियल सेक्सनमा देखिनेछ।'
                                : 'Your testimonial has been received. Once reviewed and accepted by our admin team, it will appear publicly on the homepage.'}
                        </p>

                        <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span>{isNe ? 'गुणस्तर र मर्यादा कायम राख्न प्रत्येक समीक्षा एड्मिनबाट स्वीकृत गरिन्छ।' : 'Each submission is checked by admin to ensure authentic and respectful feedback.'}</span>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl bg-[var(--nepal-blue)] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition cursor-pointer"
                            >
                                {isNe ? 'बन्द गर्नुहोस्' : 'Done & Close'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Submission Form */
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                        {/* Rating Picker */}
                        <div className="rounded-2xl border border-[var(--border-default)]/70 bg-[var(--bg-secondary)]/40 p-3.5 text-center">
                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5">
                                {isNe ? 'तपाईंको रेटिङ (मूल्याङ्कन)' : 'Your Overall Experience'}
                            </label>
                            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onMouseEnter={() => setHoverRating(star)}
                                        onMouseLeave={() => setHoverRating(0)}
                                        onClick={() => setRating(star)}
                                        className="p-1 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                                        aria-label={`${star} star`}
                                    >
                                        <svg
                                            width="28"
                                            height="28"
                                            viewBox="0 0 20 20"
                                            fill={star <= currentDisplayRating ? 'currentColor' : 'none'}
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            className={
                                                star <= currentDisplayRating
                                                    ? 'text-amber-400 drop-shadow-xs'
                                                    : 'text-gray-300 dark:text-neutral-600'
                                            }
                                        >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                                {isNe ? ratingLabels[currentDisplayRating]?.ne : ratingLabels[currentDisplayRating]?.en}
                            </div>
                        </div>

                        {/* Name & Role Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                                    {isNe ? 'तपाईंको पूरा नाम *' : 'Full Name *'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={isNe ? 'उदा: विकास श्रेष्ठ' : 'e.g. Bikash Shrestha'}
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-hidden"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">
                                    {isNe ? 'ठेगाना / सहर (ऐच्छिक)' : 'City / Location (Optional)'}
                                </label>
                                <input
                                    type="text"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    placeholder={isNe ? 'उदा: काठमाडौं, पोखरा' : 'e.g. Kathmandu, Pokhara'}
                                    className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-hidden"
                                />
                            </div>
                        </div>

                        {/* Testimonial Message */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-[var(--text-secondary)]">
                                    {isNe ? 'तपाईंको अनुभव / सुझाव *' : 'Your Review / Experience *'}
                                </label>
                                <span className="text-[10px] text-[var(--text-muted)]">
                                    {message.length} / 1000
                                </span>
                            </div>
                            <textarea
                                required
                                rows={4}
                                maxLength={1000}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={
                                    isNe
                                        ? 'यस वेबसाइटले तपाईंलाई कसरी सहयोग पुर्‍यायो? आफ्नो अनुभव छोटकरीमा लेख्नुहोस्...'
                                        : 'How did this platform help you check your driving license print status? Share your feedback...'
                                }
                                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-hidden"
                            />
                        </div>

                        {/* Optional Email Field (Clean single row) */}
                        <div>
                            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                                {isNe ? 'इमेल ठेगाना (ऐच्छिक - सार्वजनिक हुँदैन)' : 'Email Address (Optional, not public)'}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="yourname@gmail.com"
                                className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--nepal-blue)] focus:outline-hidden"
                            />
                        </div>

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Moderation Notice */}
                        <div className="flex items-start gap-2 rounded-xl border border-[var(--border-default)]/60 bg-[var(--bg-secondary)]/50 p-2.5 text-[11px] text-[var(--text-muted)] leading-relaxed">
                            <span className="shrink-0 text-amber-500">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </span>
                            <span>
                                {isNe
                                    ? 'नोट: स्पाम र अवाञ्छित सामग्री रोक्नका लागि एड्मिनले स्वीकृति दिएपछि मात्र तपाईंको समीक्षा मुख्य पृष्ठमा प्रदर्शित हुनेछ।'
                                    : 'Note: To prevent spam, submitted testimonials are reviewed by our admin team before being displayed on the site.'}
                            </span>
                        </div>

                        {/* Footer Buttons */}
                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-default)]/60">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="rounded-xl border border-[var(--border-default)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition cursor-pointer"
                            >
                                {isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 disabled:opacity-50 active:scale-95 transition cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>{isNe ? 'पठाउँदै...' : 'Submitting...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="22" y1="2" x2="11" y2="13" />
                                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                        </svg>
                                        <span>{isNe ? 'प्रतिक्रिया पठाउनुहोस्' : 'Submit Review'}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
