'use client'

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react'

interface UseSwipeDownOptions {
  isOpen: boolean
  onClose: () => void
  threshold?: number
  velocityThreshold?: number
  animationDuration?: number
  onStartClosing?: () => void
  disableOnDesktop?: boolean
  desktopBreakpoint?: number
}

/** SSR-safe media query subscription using React 18+ useSyncExternalStore. */
function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    [query]
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return defaultValue
    return window.matchMedia(query).matches
  }, [query, defaultValue])

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

const ENTER_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'
const CLOSE_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
const SNAP_EASING = 'cubic-bezier(0.22, 1.2, 0.36, 1)'
const SNAP_BACK_DURATION = 280
const BACKDROP_FADE_DURATION = 220

export function useSwipeDownToClose({
  isOpen,
  onClose,
  threshold = 75,
  velocityThreshold = 0.35,
  animationDuration = 320,
  onStartClosing,
  disableOnDesktop = true,
  desktopBreakpoint = 640,
}: UseSwipeDownOptions) {
  const isDesktop = useMediaQuery(`(min-width: ${desktopBreakpoint}px)`, false)
  const isSwipeDisabled = disableOnDesktop && isDesktop

  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isSnappingBack, setIsSnappingBack] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)

  const isDraggingRef = useRef(false)
  const isClosingRef = useRef(false)
  const startYRef = useRef(0)
  const startXRef = useRef(0)
  const currentYRef = useRef(0)
  const startTimeRef = useRef(0)
  const lastYRef = useRef(0)
  const lastTimeRef = useRef(0)
  const velocityRef = useRef(0)
  const closeTimerRef = useRef<number | null>(null)
  const snapTimerRef = useRef<number | null>(null)
  const mouseCleanupRef = useRef<(() => void) | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const closeDuration = isSwipeDisabled ? Math.min(animationDuration, 200) : animationDuration

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const clearSnapTimer = useCallback(() => {
    if (snapTimerRef.current !== null) {
      window.clearTimeout(snapTimerRef.current)
      snapTimerRef.current = null
    }
  }, [])

  /** Slide the sheet fully off-screen, then hand control back to the parent. */
  const triggerClose = useCallback(() => {
    if (!isOpen || isClosingRef.current) return

    isClosingRef.current = true
    clearSnapTimer()
    setIsSnappingBack(false)
    setIsDragging(false)
    isDraggingRef.current = false
    setIsClosing(true)
    setIsVisible(false)
    onStartClosing?.()

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      onCloseRef.current()
      setIsClosing(false)
      isClosingRef.current = false
      setDragOffset(0)
    }, closeDuration)
  }, [isOpen, onStartClosing, closeDuration, clearSnapTimer])

  /** Mount animation: start below the viewport, then glide up. */
  useEffect(() => {
    if (!isOpen) {
      const frame = requestAnimationFrame(() => {
        setIsVisible(false)
        setIsClosing(false)
        isClosingRef.current = false
        setIsDragging(false)
        isDraggingRef.current = false
        setIsSnappingBack(false)
        setDragOffset(0)
      })
      clearCloseTimer()
      clearSnapTimer()
      return () => cancelAnimationFrame(frame)
    }

    let innerFrame = 0
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setIsVisible(true))
    })

    return () => {
      cancelAnimationFrame(outerFrame)
      cancelAnimationFrame(innerFrame)
    }
  }, [isOpen, clearCloseTimer, clearSnapTimer])

  useEffect(() => {
    return () => {
      clearCloseTimer()
      clearSnapTimer()
      mouseCleanupRef.current?.()
    }
  }, [clearCloseTimer, clearSnapTimer])

  const isInteractiveElement = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return !!target.closest('button, a, input, select, textarea, [role="button"]')
  }

  const beginDrag = useCallback(
    (clientY: number, clientX: number) => {
      const now = Date.now()
      startYRef.current = clientY
      startXRef.current = clientX
      currentYRef.current = clientY
      lastYRef.current = clientY
      lastTimeRef.current = now
      startTimeRef.current = now
      velocityRef.current = 0
      clearSnapTimer()
      setIsSnappingBack(false)
      isDraggingRef.current = true
      setIsDragging(true)
    },
    [clearSnapTimer]
  )

  const moveDrag = useCallback((clientY: number, clientX: number) => {
    if (!isDraggingRef.current) return

    const deltaY = clientY - startYRef.current
    const deltaX = clientX - startXRef.current

    // Let horizontal gestures (e.g. a scrollable row) keep their own behavior.
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10 && deltaY < 10) return

    const now = Date.now()
    const elapsed = Math.max(1, now - lastTimeRef.current)
    const instantVelocity = (clientY - lastYRef.current) / elapsed
    velocityRef.current = velocityRef.current * 0.5 + instantVelocity * 0.5

    currentYRef.current = clientY
    lastYRef.current = clientY
    lastTimeRef.current = now

    // Down follows the finger 1:1; up gets a soft rubber-band resistance.
    setDragOffset(deltaY > 0 ? deltaY : deltaY * 0.12)
  }, [])

  const endDrag = useCallback(
    (clientY: number) => {
      if (!isDraggingRef.current || !isOpen || isClosingRef.current) return

      isDraggingRef.current = false
      setIsDragging(false)
      currentYRef.current = clientY

      const deltaY = clientY - startYRef.current
      const totalTime = Math.max(1, Date.now() - startTimeRef.current)
      const sinceLastMove = Date.now() - lastTimeRef.current
      const velocity = sinceLastMove < 90 ? velocityRef.current : deltaY / totalTime

      if (deltaY > threshold || (velocity > velocityThreshold && deltaY > 25)) {
        triggerClose()
        return
      }

      // Below the threshold: spring the sheet back to its resting position.
      setIsSnappingBack(true)
      setDragOffset(0)
      clearSnapTimer()
      snapTimerRef.current = window.setTimeout(() => {
        snapTimerRef.current = null
        setIsSnappingBack(false)
      }, SNAP_BACK_DURATION)
    },
    [isOpen, threshold, velocityThreshold, triggerClose, clearSnapTimer]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isOpen || isClosingRef.current || isSwipeDisabled) return
      if (isInteractiveElement(e.target)) return
      const touch = e.touches[0]
      beginDrag(touch.clientY, touch.clientX)
    },
    [isOpen, isSwipeDisabled, beginDrag]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDraggingRef.current || isSwipeDisabled) return
      const touch = e.touches[0]
      moveDrag(touch.clientY, touch.clientX)
      // Prevent the page behind the sheet from scrolling while dragging it.
      if (e.cancelable) e.preventDefault()
    },
    [isSwipeDisabled, moveDrag]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isSwipeDisabled) return
      endDrag(e.changedTouches[0]?.clientY ?? currentYRef.current)
    },
    [isSwipeDisabled, endDrag]
  )

  const handleTouchCancel = useCallback(
    (e: React.TouchEvent) => {
      if (isSwipeDisabled) return
      endDrag(e.changedTouches[0]?.clientY ?? currentYRef.current)
    },
    [isSwipeDisabled, endDrag]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isOpen || isClosingRef.current || isSwipeDisabled || e.button !== 0) return
      if (isInteractiveElement(e.target)) return

      beginDrag(e.clientY, e.clientX)

      const onMouseMove = (moveEvent: MouseEvent) => moveDrag(moveEvent.clientY, moveEvent.clientX)
      const onMouseUp = (upEvent: MouseEvent) => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        mouseCleanupRef.current = null
        endDrag(upEvent.clientY)
      }

      mouseCleanupRef.current?.()
      mouseCleanupRef.current = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [isOpen, isSwipeDisabled, beginDrag, moveDrag, endDrag]
  )

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') triggerClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, triggerClose])

  const isRendered = isOpen || isClosing

  const getTransform = () => {
    if (isSwipeDisabled) {
      return isClosing || !isVisible ? 'scale(0.96)' : 'scale(1)'
    }
    // A percentage makes the sheet travel exactly its own height, so it
    // ends fully below the viewport no matter how tall its content is.
    if (isClosing || !isVisible) return 'translate3d(0, 100%, 0)'

    // Slight upward rubber-band, capped so the sheet never jumps off-screen.
    const y = dragOffset < 0 ? Math.max(-12, dragOffset) : dragOffset
    return `translate3d(0, ${y}px, 0)`
  }

  const getTransition = () => {
    if (isSwipeDisabled) {
      return `opacity ${closeDuration}ms ${ENTER_EASING}, transform ${closeDuration}ms ${ENTER_EASING}`
    }
    if (isDragging) return 'none'
    if (isClosing) return `transform ${closeDuration}ms ${CLOSE_EASING}`
    if (isSnappingBack) return `transform ${SNAP_BACK_DURATION}ms ${SNAP_EASING}`
    return `transform ${animationDuration}ms ${ENTER_EASING}`
  }

  const getBackdropOpacity = () => {
    if (isClosing || !isVisible) return 0
    if (isDragging && dragOffset > 0) return Math.max(0.15, 1 - dragOffset / 400)
    return 1
  }

  return {
    isRendered,
    isClosing,
    isDragging: isSwipeDisabled ? false : isDragging,
    isDesktop,
    triggerClose,
    // Swipe is handled only by the drag handle, never by the scrollable body.
    containerProps: {},
    handleProps: isSwipeDisabled
      ? {}
      : {
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
          onTouchCancel: handleTouchCancel,
          onMouseDown: handleMouseDown,
          style: { touchAction: 'none' as const },
        },
    modalStyle: {
      transform: getTransform(),
      opacity: isSwipeDisabled ? (isClosing || !isVisible ? 0 : 1) : undefined,
      transition: getTransition(),
      willChange: 'transform',
      pointerEvents: isClosing ? ('none' as const) : undefined,
    },
    // Apply this to a dedicated backdrop layer, not to the modal's parent —
    // fading an ancestor would fade the sheet itself instead of sliding it.
    backdropStyle: {
      opacity: getBackdropOpacity(),
      transition: isDragging
        ? 'none'
        : `opacity ${isClosing ? closeDuration : BACKDROP_FADE_DURATION}ms ease`,
      pointerEvents: isClosing ? ('none' as const) : undefined,
    },
  }
}
