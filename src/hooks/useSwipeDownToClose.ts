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

/**
 * SSR-safe media query subscription using React 18+ useSyncExternalStore.
 */
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

export function useSwipeDownToClose({
  isOpen,
  onClose,
  threshold = 75,
  velocityThreshold = 0.35,
  animationDuration = 300,
  onStartClosing,
  disableOnDesktop = true,
  desktopBreakpoint = 640,
}: UseSwipeDownOptions) {
  const isDesktop = useMediaQuery(`(min-width: ${desktopBreakpoint}px)`, false)
  const isSwipeDisabled = disableOnDesktop && isDesktop

  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const isDraggingRef = useRef(false)
  const isClosingRef = useRef(false)
  const startYRef = useRef(0)
  const startXRef = useRef(0)
  const currentYRef = useRef(0)
  const startTimeRef = useRef(0)

  // Trigger smooth closing animation
  const triggerClose = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    setIsClosing(true)
    setIsDragging(false)
    isDraggingRef.current = false
    setIsVisible(false)
    onStartClosing?.()

    const closeDuration = isSwipeDisabled ? Math.min(animationDuration, 200) : animationDuration

    setTimeout(() => {
      onClose()
      setIsClosing(false)
      isClosingRef.current = false
      setDragOffset(0)
    }, closeDuration)
  }, [onClose, onStartClosing, animationDuration, isSwipeDisabled])

  // Animate in via requestAnimationFrame callback
  useEffect(() => {
    if (isOpen) {
      const frame1 = requestAnimationFrame(() => {
        const frame2 = requestAnimationFrame(() => {
          setIsVisible(true)
        })
        return () => cancelAnimationFrame(frame2)
      })
      return () => cancelAnimationFrame(frame1)
    } else {
      const frame = requestAnimationFrame(() => {
        setIsVisible(false)
        setIsClosing(false)
        isClosingRef.current = false
        setDragOffset(0)
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [isOpen])

  const isInteractiveElement = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    return !!target.closest('button, a, input, select, textarea, [role="button"]')
  }

  // Touch handlers (active on mobile only)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isOpen || isClosingRef.current || isSwipeDisabled) return
      if (isInteractiveElement(e.target)) return

      const touch = e.touches[0]
      startYRef.current = touch.clientY
      startXRef.current = touch.clientX
      currentYRef.current = touch.clientY
      startTimeRef.current = Date.now()
      isDraggingRef.current = true
      setIsDragging(true)
    },
    [isOpen, isSwipeDisabled]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDraggingRef.current || !isOpen || isClosingRef.current || isSwipeDisabled) return

      const touch = e.touches[0]
      const deltaY = touch.clientY - startYRef.current
      const deltaX = touch.clientX - startXRef.current

      // Ignore if predominantly horizontal gesture
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10 && deltaY < 10) {
        return
      }

      if (deltaY > 0) {
        // Dragging downwards: 1:1 direct tracking
        currentYRef.current = touch.clientY
        setDragOffset(deltaY)
        if (e.cancelable) {
          e.preventDefault()
        }
      } else {
        // Dragging upwards: heavy rubber-band damping
        currentYRef.current = touch.clientY
        setDragOffset(deltaY * 0.12)
      }
    },
    [isOpen, isSwipeDisabled]
  )

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingRef.current || !isOpen || isClosingRef.current || isSwipeDisabled) return
    isDraggingRef.current = false
    setIsDragging(false)

    const deltaY = currentYRef.current - startYRef.current
    const deltaTime = Math.max(1, Date.now() - startTimeRef.current)
    const velocity = deltaY / deltaTime

    if (deltaY > threshold || (velocity > velocityThreshold && deltaY > 25)) {
      // Swipe down threshold reached: animate smoothly down below the screen
      triggerClose()
    } else {
      // Snap back up to top position
      setDragOffset(0)
    }
  }, [isOpen, isSwipeDisabled, threshold, velocityThreshold, triggerClose])

  // Mouse drag handlers (active on mobile-mode only)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isOpen || isClosingRef.current || isSwipeDisabled || e.button !== 0) return
      if (isInteractiveElement(e.target)) return

      startYRef.current = e.clientY
      currentYRef.current = e.clientY
      startTimeRef.current = Date.now()
      isDraggingRef.current = true
      setIsDragging(true)

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!isDraggingRef.current) return
        const deltaY = moveEvent.clientY - startYRef.current
        if (deltaY > 0) {
          currentYRef.current = moveEvent.clientY
          setDragOffset(deltaY)
        } else {
          currentYRef.current = moveEvent.clientY
          setDragOffset(deltaY * 0.12)
        }
      }

      const onMouseUp = (upEvent: MouseEvent) => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        if (!isDraggingRef.current) return
        isDraggingRef.current = false
        setIsDragging(false)

        const deltaY = upEvent.clientY - startYRef.current
        const deltaTime = Math.max(1, Date.now() - startTimeRef.current)
        const velocity = deltaY / deltaTime

        if (deltaY > threshold || (velocity > velocityThreshold && deltaY > 25)) {
          triggerClose()
        } else {
          setDragOffset(0)
        }
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [isOpen, isSwipeDisabled, threshold, velocityThreshold, triggerClose]
  )

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, triggerClose])

  const isRendered = isOpen || isClosing

  const getTransform = () => {
    if (isSwipeDisabled) {
      if (isClosing || !isVisible) return 'scale(0.96)'
      return 'scale(1)'
    }
    if (isClosing) return 'translateY(100%)'
    if (isDragging) return `translateY(${Math.max(0, dragOffset)}px)`
    if (!isVisible) return 'translateY(100%)'
    return dragOffset !== 0 ? `translateY(${Math.max(0, dragOffset)}px)` : 'translateY(0)'
  }

  const getOpacity = () => {
    if (isSwipeDisabled) {
      if (isClosing || !isVisible) return 0
      return 1
    }
    return undefined
  }

  const getTransition = () => {
    if (isSwipeDisabled) {
      return 'opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }
    if (isDragging) return 'none'
    if (isClosing) return 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
    return 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
  }

  const getBackdropOpacity = () => {
    if (isClosing || !isVisible) return 0
    if (!isSwipeDisabled && isDragging && dragOffset > 0) return Math.max(0.05, 1 - dragOffset / 350)
    return 1
  }

  return {
    isRendered,
    isClosing,
    isDragging: isSwipeDisabled ? false : isDragging,
    isDesktop,
    triggerClose,
    containerProps: isSwipeDisabled
      ? {}
      : {
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
        },
    handleProps: isSwipeDisabled
      ? {}
      : {
          onTouchStart: handleTouchStart,
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd,
          onMouseDown: handleMouseDown,
        },
    modalStyle: {
      transform: getTransform(),
      opacity: getOpacity(),
      transition: getTransition(),
      willChange: isSwipeDisabled ? 'transform, opacity' : 'transform',
    },
    backdropStyle: {
      opacity: getBackdropOpacity(),
      transition: isDragging ? 'none' : 'opacity 0.25s ease',
      pointerEvents: isClosing ? ('none' as const) : undefined,
    },
  }
}
