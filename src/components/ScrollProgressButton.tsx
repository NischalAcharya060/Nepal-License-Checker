'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const CIRCUMFERENCE = 125.66 // 2 * Math.PI * 20

interface ScrollProgressButtonProps {
  threshold?: number
}

export default function ScrollProgressButton({ threshold = 40 }: ScrollProgressButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const circleRef = useRef<SVGCircleElement>(null)

  const isVisibleRef = useRef(false)
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rAFRef = useRef<number | null>(null)
  const lastScrollYRef = useRef(0)
  const velocityRef = useRef(0)

  // Accessible progress state for screen-readers & hover tooltip only
  const [percentTooltip, setPercentTooltip] = useState(0)

  const updateProgress = useCallback(() => {
    if (typeof window === 'undefined') return

    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    const documentHeight = document.documentElement.scrollHeight
    const maxScroll = Math.max(documentHeight - viewportHeight, 1)

    // Accurate scroll progress from 0 (top) to 1 (bottom)
    const rawProgress = Math.min(Math.max(scrollTop / maxScroll, 0), 1)
    const offset = Math.max(0, CIRCUMFERENCE * (1 - rawProgress))

    // Direct DOM manipulation to avoid React re-renders on every scroll pixel
    if (circleRef.current) {
      circleRef.current.style.strokeDashoffset = `${offset}px`
    }

    // Dynamic visibility check: smooth fade & scale when passing threshold
    const shouldBeVisible = scrollTop > threshold
    if (shouldBeVisible !== isVisibleRef.current) {
      isVisibleRef.current = shouldBeVisible
      if (containerRef.current) {
        if (shouldBeVisible) {
          containerRef.current.classList.remove('opacity-0', 'translate-y-4', 'scale-75', 'pointer-events-none')
          containerRef.current.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'pointer-events-auto')
        } else {
          containerRef.current.classList.remove('opacity-100', 'translate-y-0', 'scale-100', 'pointer-events-auto')
          containerRef.current.classList.add('opacity-0', 'translate-y-4', 'scale-75', 'pointer-events-none')
        }
      }
    }

    // Interactive momentum: calculate scroll direction and subtle velocity displacement
    const deltaY = scrollTop - lastScrollYRef.current
    lastScrollYRef.current = scrollTop

    // Clamp subtle momentum between -4px and +4px
    velocityRef.current = Math.min(Math.max(deltaY * 0.12, -4), 4)

    if (buttonRef.current && shouldBeVisible) {
      // Apply kinetic physics while actively scrolling
      buttonRef.current.style.transform = `translateY(${velocityRef.current}px) scale(${
        isScrollingRef.current ? 1.04 : 1
      })`
    }
  }, [threshold])

  useEffect(() => {
    let ticking = false

    const handleScroll = () => {
      // Mark active scrolling state
      if (!isScrollingRef.current) {
        isScrollingRef.current = true
        buttonRef.current?.classList.add('shadow-xl')
      }

      // Debounce idle reset
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false
        velocityRef.current = 0
        if (buttonRef.current) {
          buttonRef.current.style.transform = 'translateY(0px) scale(1)'
          buttonRef.current.classList.remove('shadow-xl')
        }

        // Update tooltip percent on idle stop to keep state updates minimal
        const scrollTop = window.scrollY || document.documentElement.scrollTop
        const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
        setPercentTooltip(Math.round(Math.min(Math.max(scrollTop / maxScroll, 0), 1) * 100))
      }, 140)

      // Schedule high-performance 60/120fps DOM update
      if (!ticking) {
        ticking = true
        rAFRef.current = requestAnimationFrame(() => {
          updateProgress()
          ticking = false
        })
      }
    }

    const handleResize = () => {
      updateProgress()
    }

    // Initialize strokeDasharray & initial position
    if (circleRef.current) {
      circleRef.current.style.strokeDasharray = `${CIRCUMFERENCE}`
      circleRef.current.style.strokeDashoffset = `${CIRCUMFERENCE}`
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })

    // Observe document height mutations (dynamic content changes)
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      resizeObserver = new ResizeObserver(() => {
        updateProgress()
      })
      resizeObserver.observe(document.body)
    }

    // Initial check
    updateProgress()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      if (resizeObserver) resizeObserver.disconnect()
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    }
  }, [updateProgress])

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })

    // Focus license input if present for user convenience
    setTimeout(() => {
      const input = document.getElementById('license-number')
      if (input) {
        input.focus({ preventScroll: true })
      }
    }, 450)
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="false"
      className="fixed bottom-5 right-5 sm:bottom-7 sm:right-7 z-40 transition-all duration-300 ease-out opacity-0 translate-y-4 scale-75 pointer-events-none print:hidden"
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={handleScrollToTop}
        className="group relative flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-[var(--surface-primary)]/90 backdrop-blur-md shadow-md border border-[var(--border-default)] text-[var(--text-primary)] transition-[color,border-color,box-shadow] duration-200 hover:border-[var(--nepal-blue)] hover:text-[var(--nepal-blue)] hover:shadow-lg active:scale-95 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--nepal-blue)] focus-visible:ring-offset-2"
        aria-label={`Scroll back to top (${percentTooltip}% scrolled)`}
        title={`Back to top (${percentTooltip}%)`}
      >
        {/* Subtle Ambient Radial Hover Tint */}
        <div className="absolute inset-0 rounded-full bg-[var(--nepal-blue)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Circular Progress Ring */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none p-[2px]"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
        >
          {/* Start ring at 12 o'clock (top) and fill clockwise */}
          <g transform="rotate(-90 24 24)">
            {/* Background Track Circle */}
            <circle
              cx="24"
              cy="24"
              r="20"
              strokeWidth="2"
              stroke="currentColor"
              className="text-[var(--border-default)]/50 dark:text-[var(--border-default)]/30"
            />

            {/* Main Crisp Progress Stroke */}
            <circle
              ref={circleRef}
              cx="24"
              cy="24"
              r="20"
              strokeWidth="2"
              stroke="var(--nepal-blue)"
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-75 ease-out"
            />
          </g>
        </svg>

        {/* Upward Chevron Arrow with Interactive Hover Lift */}
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="relative z-10 transition-transform duration-200 group-hover:-translate-y-1 text-[var(--text-primary)] group-hover:text-[var(--nepal-blue)]"
          aria-hidden="true"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  )
}
