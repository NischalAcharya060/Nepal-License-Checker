// src/lib/pushClient.ts

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported'
  return Notification.permission
}

export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null

  try {
    let reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    }
    await navigator.serviceWorker.ready
    return reg
  } catch (error) {
    console.error('Failed to get/register service worker for push:', error)
    return null
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null

  try {
    const reg = await getOrRegisterServiceWorker()
    if (!reg) return null
    return await reg.pushManager.getSubscription()
  } catch (error) {
    console.error('Error fetching push subscription:', error)
    return null
  }
}

export async function subscribeUserToPush(options?: {
  licenseNumber?: string | null
  sendWelcome?: boolean
}): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushSupported()) {
    return {
      success: false,
      error: 'Push notifications are not supported in this browser.',
    }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return {
        success: false,
        error:
          permission === 'denied'
            ? 'Notification permission was denied. Please allow notifications in your browser settings.'
            : 'Notification permission was dismissed.',
      }
    }

    const reg = await getOrRegisterServiceWorker()
    if (!reg) {
      return {
        success: false,
        error: 'Could not initialize service worker for notifications.',
      }
    }

    // Retrieve VAPID public key
    let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      const res = await fetch('/api/push/key')
      if (res.ok) {
        const data = await res.json()
        publicKey = data.publicKey
      }
    }

    if (!publicKey) {
      return {
        success: false,
        error: 'VAPID public key could not be retrieved from server.',
      }
    }

    // Check existing or subscribe
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      })
    }

    // Send subscription payload to backend
    const subJson = subscription.toJSON()
    const apiRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subJson,
        licenseNumber: options?.licenseNumber || null,
        sendWelcome: options?.sendWelcome ?? true,
      }),
    })

    if (!apiRes.ok) {
      const errData = await apiRes.json().catch(() => null)
      return {
        success: false,
        error: errData?.error || 'Failed to save push subscription on server.',
      }
    }

    return { success: true, subscription }
  } catch (err: unknown) {
    const error = err as Error
    console.error('subscribeUserToPush error:', error)
    return { success: false, error: error.message || 'Unknown push subscription error' }
  }
}

export async function unsubscribeUserFromPush(options?: {
  licenseNumber?: string | null
}): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: true }

  try {
    const reg = await getOrRegisterServiceWorker()
    if (!reg) return { success: true }

    const subscription = await reg.pushManager.getSubscription()
    if (!subscription) return { success: true }

    // Inform server
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        licenseNumber: options?.licenseNumber || null,
      }),
    }).catch(() => undefined)

    // Unsubscribe locally
    await subscription.unsubscribe()
    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}

export async function sendTestPushToSelf(): Promise<{ success: boolean; error?: string }> {
  try {
    const sub = await getCurrentPushSubscription()
    if (!sub) {
      return { success: false, error: 'No active push subscription found on this device.' }
    }

    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    })

    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to dispatch test notification' }
    }

    return { success: true }
  } catch (err: unknown) {
    const error = err as Error
    return { success: false, error: error.message }
  }
}
