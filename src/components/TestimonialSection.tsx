'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Language } from '@/lib/i18n'
import type { PublicTestimonialItem } from '@/lib/testimonials'
import { formatTimeAgo } from '@/app/admin/helpers'

interface TestimonialSectionProps {
    language: Language
    onOpenTestimonialModal: () => void
    refreshTrigger?: number
}

function renderStars(rating: number) {
    return (
        <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill={star <= rating ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={star <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-neutral-600'}
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    )
}

export default function TestimonialSection({
    language,
    onOpenTestimonialModal,
    refreshTrigger = 0,
}: TestimonialSectionProps) {
    const isNe = language === 'ne'
    const [testimonials, setTestimonials] = useState<PublicTestimonialItem[]>([])
    const [averageRating, setAverageRating] = useState<number>(5.0)
    const [totalApproved, setTotalApproved] = useState<number>(0)
    const [loading, setLoading] = useState(true)

    // Responsive visible items per view: mobile = 1, tablet = 2, desktop = 3
    const [visibleCount, setVisibleCount] = useState<number>(3)

    useEffect(() => {
        const updateVisible = () => {
            if (window.innerWidth < 640) {
                setVisibleCount(1)
            } else if (window.innerWidth < 1024) {
                setVisibleCount(2)
            } else {
                setVisibleCount(3)
            }
        }
        updateVisible()
        window.addEventListener('resize', updateVisible)
        return () => window.removeEventListener('resize', updateVisible)
    }, [])

    useEffect(() => {
        let isMounted = true

        const fetchTestimonials = async () => {
            try {
                const res = await fetch('/api/testimonials', { cache: 'no-store' })
                if (!res.ok) return
                const json = await res.json()
                if (isMounted && json.status === 'success' && json.data) {
                    setTestimonials(json.data.testimonials || [])
                    setAverageRating(json.data.averageRating || 5.0)
                    setTotalApproved(json.data.totalApproved || 0)
                }
            } catch (err) {
                console.error('Failed to load testimonials:', err)
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchTestimonials()

        return () => {
            isMounted = false
        }
    }, [refreshTrigger])

    // Normalize base items so small lists (e.g. 2 items) have enough buffer for a 3-column view
    const baseItems = useMemo(() => {
        if (testimonials.length === 2) {
            return [...testimonials, ...testimonials]
        }
        return testimonials
    }, [testimonials])

    // Clone count on each side of the real items
    const cloneCount = useMemo(() => {
        return Math.max(baseItems.length, 3)
    }, [baseItems.length])

    // Extended array: [prefix clones, real items, suffix clones]
    const extendedItems = useMemo(() => {
        if (baseItems.length <= 1) return baseItems
        const prefix = baseItems.slice(-cloneCount)
        const suffix = baseItems.slice(0, cloneCount)
        return [...prefix, ...baseItems, ...suffix]
    }, [baseItems, cloneCount])

    // True infinite carousel state
    const [currentIndex, setCurrentIndex] = useState<number>(cloneCount)
    const [isTransitioning, setIsTransitioning] = useState<boolean>(true)
    const [isPaused, setIsPaused] = useState<boolean>(false)
    const isSlidingRef = useRef<boolean>(false)

    // Sync initial position when cloneCount or baseItems changes
    const [prevCloneCount, setPrevCloneCount] = useState(cloneCount)
    if (cloneCount !== prevCloneCount) {
        setPrevCloneCount(cloneCount)
        if (baseItems.length > 1) {
            setIsTransitioning(false)
            setCurrentIndex(cloneCount)
        }
    }

    // Re-enable smooth transition after an instant snap reset
    useEffect(() => {
        if (!isTransitioning) {
            const frame1 = requestAnimationFrame(() => {
                const frame2 = requestAnimationFrame(() => {
                    setIsTransitioning(true)
                    isSlidingRef.current = false
                })
                return () => cancelAnimationFrame(frame2)
            })
            return () => cancelAnimationFrame(frame1)
        }
    }, [isTransitioning])

    // Safety timeout to prevent lockups during fast clicking or tab switches
    useEffect(() => {
        const timer = setTimeout(() => {
            isSlidingRef.current = false
        }, 550)
        return () => clearTimeout(timer)
    }, [currentIndex])

    const slideTo = useCallback((targetIndex: number) => {
        if (isSlidingRef.current) return
        isSlidingRef.current = true
        setIsTransitioning(true)
        setCurrentIndex(targetIndex)
    }, [])

    const handleNext = useCallback(() => {
        slideTo(currentIndex + 1)
    }, [currentIndex, slideTo])

    const handlePrev = useCallback(() => {
        slideTo(currentIndex - 1)
    }, [currentIndex, slideTo])

    // Seamless instant wrap when transitioning into clone buffers
    const handleTransitionEnd = useCallback(() => {
        if (baseItems.length <= 1) {
            isSlidingRef.current = false
            return
        }

        // Passed beyond the real items into suffix clones: jump back to real items
        if (currentIndex >= cloneCount + baseItems.length) {
            setIsTransitioning(false)
            setCurrentIndex(currentIndex - baseItems.length)
        }
        // Passed before real items into prefix clones: jump forward to real items
        else if (currentIndex < cloneCount) {
            setIsTransitioning(false)
            setCurrentIndex(currentIndex + baseItems.length)
        } else {
            isSlidingRef.current = false
        }
    }, [currentIndex, cloneCount, baseItems.length])

    // Active dot indicator (0 to testimonials.length - 1)
    const activeDot = useMemo(() => {
        if (testimonials.length <= 1) return 0
        const offset = currentIndex - cloneCount
        return ((offset % testimonials.length) + testimonials.length) % testimonials.length
    }, [currentIndex, cloneCount, testimonials.length])

    // Autoplay timer (5 seconds)
    useEffect(() => {
        if (loading || isPaused || testimonials.length <= 1) return

        const timer = setInterval(() => {
            handleNext()
        }, 5000)

        return () => clearInterval(timer)
    }, [loading, isPaused, testimonials.length, handleNext])

    // Mobile touch swipe handling
    const touchStartXRef = useRef<number | null>(null)
    const touchDeltaXRef = useRef<number>(0)

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsPaused(true)
        touchStartXRef.current = e.touches[0].clientX
        touchDeltaXRef.current = 0
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartXRef.current === null) return
        touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current
    }

    const handleTouchEnd = () => {
        setIsPaused(false)
        if (touchStartXRef.current === null) return

        const delta = touchDeltaXRef.current
        touchStartXRef.current = null
        touchDeltaXRef.current = 0

        if (delta < -40) {
            handleNext()
        } else if (delta > 40) {
            handlePrev()
        }
    }

    return (
        <section
            id="testimonials"
            aria-label="User Testimonials"
            className="my-10 sm:my-14 scroll-mt-20 print:hidden"
        >
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-[var(--border-default)]/70 pb-5">
                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500" aria-hidden="true">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        <span>{isNe ? 'नागरिक अनुभव तथा प्रतिक्रिया' : 'Citizen Experiences & Reviews'}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                        {isNe ? 'नागरिकहरू के भन्छन्?' : 'What People Say About Us'}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl">
                        {isNe
                            ? 'नेपालभरिका सवारी चालक अनुमतिपत्र आवेदकहरूको वास्तविक प्रतिक्रिया र अनुभव।'
                            : 'Authentic reviews and experiences from driving license applicants across Nepal.'}
                    </p>
                </div>

                {/* Rating KPI, Carousel Controls and Submit Button */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-3.5 py-2 shadow-xs">
                        <div className="flex items-center gap-1 text-lg sm:text-xl font-black text-amber-500">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500" aria-hidden="true">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                            <span className="font-mono tabular-nums">{averageRating.toFixed(1)}</span>
                        </div>
                        <div className="border-l border-[var(--border-default)] pl-2 text-[10px] sm:text-[11px] text-[var(--text-muted)] leading-tight">
                            <strong className="block text-[var(--text-primary)] font-bold font-mono tabular-nums">
                                {totalApproved} {isNe ? 'समीक्षाहरू' : 'Reviews'}
                            </strong>
                            <span>{isNe ? 'प्रमाणित प्रयोगकर्ता' : 'Verified Users'}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onOpenTestimonialModal}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[var(--nepal-blue)] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[var(--nepal-blue)]/90 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>{isNe ? 'आफ्नो अनुभव लेख्नुहोस्' : 'Write a Review'}</span>
                    </button>
                </div>
            </div>

            {/* Testimonials Carousel Container */}
            <div className="relative mt-6 sm:mt-8">
                {loading ? (
                    <div className="flex gap-4 sm:gap-5 overflow-hidden py-2">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="shrink-0 w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.85rem)] h-48 rounded-3xl border border-[var(--border-default)]/60 bg-[var(--surface-primary)]/50 p-5 animate-pulse"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-[var(--border-default)]/60" />
                                    <div className="space-y-1.5 flex-1">
                                        <div className="h-3 w-24 rounded-sm bg-[var(--border-default)]/60" />
                                        <div className="h-2.5 w-16 rounded-sm bg-[var(--border-default)]/40" />
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2">
                                    <div className="h-2.5 w-full rounded-sm bg-[var(--border-default)]/40" />
                                    <div className="h-2.5 w-4/5 rounded-sm bg-[var(--border-default)]/40" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : testimonials.length === 0 ? (
                    <div className="rounded-3xl border border-[var(--border-default)]/70 dev-glass-card p-8 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--nepal-blue-soft)] text-[var(--nepal-blue)] mx-auto mb-3">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <h3 className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                            {isNe ? 'अझै कुनै समीक्षा छैन' : 'No testimonials yet'}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                            {isNe
                                ? 'पहिलो प्रतिक्रिया दिने व्यक्ति बन्नुहोस् र आफ्नो अनुभव साझा गर्नुहोस्।'
                                : 'Be the first to share your experience checking your license print status.'}
                        </p>
                        <button
                            type="button"
                            onClick={onOpenTestimonialModal}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--nepal-blue)] px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 active:scale-95 transition cursor-pointer"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>{isNe ? 'प्रतिक्रिया दिनुहोस्' : 'Submit Review'}</span>
                        </button>
                    </div>
                ) : testimonials.length === 1 ? (
                    // Single item view (no carousel needed)
                    <div className="max-w-md mx-auto py-2">
                        <div
                            className={`flex flex-col justify-between rounded-3xl border dev-glass-card p-5 sm:p-6 transition hover:shadow-md ${
                                testimonials[0].is_featured
                                    ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-[var(--surface-primary)] to-[var(--surface-primary)]'
                                    : 'border-[var(--border-default)] bg-[var(--surface-primary)]'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--nepal-blue)] to-indigo-600 text-sm font-black text-white shadow-xs">
                                        {testimonials[0].name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                            {testimonials[0].name}
                                        </h3>
                                        {testimonials[0].role && (
                                            <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[var(--nepal-blue)]">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                <span>{testimonials[0].role}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {renderStars(testimonials[0].rating)}
                            </div>
                            <div className="mt-3.5 text-xs text-[var(--text-primary)] leading-relaxed italic">
                                &ldquo;{testimonials[0].message}&rdquo;
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-[var(--border-default)]/60 pt-3 text-[10px] text-[var(--text-muted)]">
                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span>{isNe ? 'प्रमाणित समीक्षा' : 'Verified Query'}</span>
                                </span>
                                <time dateTime={new Date(testimonials[0].created_at).toISOString()} className="font-mono tabular-nums">
                                    {formatTimeAgo(testimonials[0].created_at)}
                                </time>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        className="group relative"
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Overflow-hidden track wrapper */}
                        <div className="overflow-hidden -mx-2 sm:-mx-2.5">
                            <div
                                onTransitionEnd={handleTransitionEnd}
                                style={{
                                    transform: `translateX(-${(currentIndex * 100) / visibleCount}%)`,
                                    transition: isTransitioning
                                        ? 'transform 450ms cubic-bezier(0.25, 1, 0.5, 1)'
                                        : 'none',
                                }}
                                className="flex items-stretch"
                            >
                                {extendedItems.map((t, idx) => (
                                    <div
                                        key={`${t.id}-loop-${idx}`}
                                        style={{ width: `${100 / visibleCount}%` }}
                                        className="shrink-0 px-2 sm:px-2.5 py-2"
                                    >
                                        <div
                                            className={`h-full flex flex-col justify-between rounded-3xl border dev-glass-card p-5 sm:p-6 transition duration-300 hover:shadow-xl ${
                                                t.is_featured
                                                    ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-[var(--surface-primary)] to-[var(--surface-primary)] shadow-xs'
                                                    : 'border-[var(--border-default)]/70 bg-[var(--surface-primary)]'
                                            }`}
                                        >
                                            <div>
                                                {/* Top Row: User Avatar & Info & Stars */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--nepal-blue)] to-indigo-600 text-sm font-black text-white shadow-xs">
                                                            {t.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <h3 className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                                                                    {t.name}
                                                                </h3>
                                                                {t.is_featured && (
                                                                    <span
                                                                        className="inline-flex items-center rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300"
                                                                        title="Featured Review"
                                                                    >
                                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500" aria-hidden="true">
                                                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                                        </svg>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {t.role && (
                                                                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 flex items-center gap-1">
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[var(--nepal-blue)]">
                                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                                        <circle cx="12" cy="10" r="3" />
                                                                    </svg>
                                                                    <span>{t.role}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0 pt-0.5">
                                                        {renderStars(t.rating)}
                                                    </div>
                                                </div>

                                                {/* Quote / Testimonial Message */}
                                                <div className="mt-3.5 text-xs text-[var(--text-primary)] leading-relaxed italic line-clamp-5 min-h-[4.5rem]">
                                                    &ldquo;{t.message}&rdquo;
                                                </div>
                                            </div>

                                            {/* Footer: Time and verified badge */}
                                            <div className="mt-4 flex items-center justify-between border-t border-[var(--border-default)]/60 pt-3 text-[10px] text-[var(--text-muted)]">
                                                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    <span>{isNe ? 'प्रमाणित समीक्षा' : 'Verified Query'}</span>
                                                </span>
                                                <time dateTime={new Date(t.created_at).toISOString()} className="font-mono tabular-nums">
                                                    {formatTimeAgo(t.created_at)}
                                                </time>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Floating Arrow Controls on Tablet & Desktop (Hover) */}
                        <button
                            type="button"
                            onClick={handlePrev}
                            aria-label="Previous testimonial"
                            className="hidden sm:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-base font-bold text-[var(--text-primary)] shadow-lg hover:bg-[var(--surface-primary)] hover:scale-110 active:scale-95 transition cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={handleNext}
                            aria-label="Next testimonial"
                            className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-primary)] text-base font-bold text-[var(--text-primary)] shadow-lg hover:bg-[var(--surface-primary)] hover:scale-110 active:scale-95 transition cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>

                        {/* Centered Slide Dots */}
                        <div className="mt-5 flex items-center justify-center gap-2" role="tablist" aria-label="Slide indicators">
                            {testimonials.map((_, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => slideTo(cloneCount + idx)}
                                    role="tab"
                                    aria-selected={activeDot === idx}
                                    aria-label={`Go to slide ${idx + 1}`}
                                    className={`rounded-full transition-all duration-300 cursor-pointer ${
                                        activeDot === idx
                                            ? 'h-2 w-6 bg-[var(--nepal-blue)]'
                                            : 'h-2 w-2 bg-[var(--border-default)] hover:bg-[var(--text-muted)]'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
}


