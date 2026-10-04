'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import toast from 'react-hot-toast'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface PwaContextValue {
  /** A native install prompt is available (Chromium / Android / desktop). */
  canInstall: boolean
  /** The app is currently running as an installed PWA. */
  isInstalled: boolean
  /** iOS Safari never fires `beforeinstallprompt`, so we show manual steps instead. */
  needsIosHelp: boolean
  isOffline: boolean
  isUpdateReady: boolean
  install: () => Promise<void>
  applyUpdate: () => void
}

const PwaContext = createContext<PwaContextValue | null>(null)

const DISPLAY_MODE_QUERIES = [
  '(display-mode: standalone)',
  '(display-mode: fullscreen)',
  '(display-mode: minimal-ui)',
]

function getStandaloneSnapshot() {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    DISPLAY_MODE_QUERIES.some((query) => window.matchMedia(query).matches) || nav.standalone === true
  )
}

function subscribeToDisplayMode(onChange: () => void) {
  const queries = DISPLAY_MODE_QUERIES.map((query) => window.matchMedia(query))
  queries.forEach((query) => query.addEventListener('change', onChange))
  return () => queries.forEach((query) => query.removeEventListener('change', onChange))
}

function getOnlineSnapshot() {
  return window.navigator.onLine
}

function subscribeToConnection(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

function isIosBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIosDevice = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  return isIosDevice && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isUpdateReady, setIsUpdateReady] = useState(false)
  const waitingWorkerRef = useRef<ServiceWorker | null>(null)
  const reloadingRef = useRef(false)

  // Browser-provided state, read through external stores to stay hydration-safe.
  const isInstalled = useSyncExternalStore(subscribeToDisplayMode, getStandaloneSnapshot, () => false)
  const isOnline = useSyncExternalStore(subscribeToConnection, getOnlineSnapshot, () => true)
  const isIos = useState(() => isIosBrowser())[0]

  // Install prompt capture.
  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    const onInstalled = () => setDeferredPrompt(null)

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Service worker lifecycle: never in dev, so HMR is never served stale.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let cancelled = false

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        if (registration.waiting && navigator.serviceWorker.controller) {
          waitingWorkerRef.current = registration.waiting
          setIsUpdateReady(true)
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing
          if (!installingWorker) return

          installingWorker.addEventListener('statechange', () => {
            if (cancelled) return
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                waitingWorkerRef.current = installingWorker
                setIsUpdateReady(true)
              }
            }
          })
        })
      } catch (error) {
        console.warn('Service worker registration failed:', error)
      }
    }

    const onControllerChange = () => {
      if (reloadingRef.current) return
      reloadingRef.current = true
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    register()

    // Hourly check so a long-lived installed app picks up new releases.
    const interval = window.setInterval(() => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        registration?.update().catch(() => undefined)
      })
    }, 60 * 60 * 1000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const applyUpdate = useCallback(() => {
    const worker = waitingWorkerRef.current
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' })
      waitingWorkerRef.current = null
    }
    setIsUpdateReady(false)
    reloadingRef.current = false
    window.location.reload()
  }, [])

  // Surface a new release as a toast (only once per session).
  useEffect(() => {
    if (!isUpdateReady) return

    let isNe = false
    try {
      isNe = window.localStorage.getItem('ui-language') === 'ne'
    } catch {
      isNe = false
    }

    toast.custom((t) => (
      <div
        className={`${t.visible ? 'animate-rise-in' : 'opacity-0'} flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-primary)] px-4 py-3 shadow-lg`}
      >
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {isNe ? 'नयाँ अपडेट उपलब्ध छ' : 'A new update is available'}
        </span>
        <button
          type="button"
          onClick={applyUpdate}
          className="rounded-full bg-[var(--nepal-blue)] px-3 py-1 text-xs font-bold text-white transition hover:opacity-90 active:scale-95"
        >
          {isNe ? 'रिलोड' : 'Reload'}
        </button>
      </div>
    ), { duration: Infinity, id: 'pwa-update', position: 'top-center' })
  }, [isUpdateReady, applyUpdate])

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    let isNe = false
    try {
      isNe = window.localStorage.getItem('ui-language') === 'ne'
    } catch {
      isNe = false
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        toast.success(isNe ? 'एप इन्स्टल भयो।' : 'App installed. Find it on your home screen.')
      }
      setDeferredPrompt(null)
    } catch {
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  const value = useMemo<PwaContextValue>(
    () => ({
      canInstall: deferredPrompt !== null,
      isInstalled,
      needsIosHelp: isIos && !isInstalled,
      isOffline: !isOnline,
      isUpdateReady,
      install,
      applyUpdate,
    }),
    [deferredPrompt, isInstalled, isIos, isOnline, isUpdateReady, install, applyUpdate]
  )

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>
}

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) {
    throw new Error('usePwa must be used inside <PwaProvider>')
  }
  return context
}