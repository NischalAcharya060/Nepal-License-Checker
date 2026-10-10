/**
 * Nepal License Checker — service worker
 *
 * Strategies
 *  - navigations      : network-first (short timeout) → cached page → /offline.html
 *  - /api/* GET       : network-first (short timeout) → last successful response from cache
 *  - /_next/static/*  : cache-first (content-hashed, immutable)
 *  - images & other   : stale-while-revalidate
 *  - never cached     : non-GET requests, cross-origin requests, video/audio
 */

const VERSION = 'v5'
const PRECACHE = `nlc-precache-${VERSION}`
const PAGES = `nlc-pages-${VERSION}`
const ASSETS = `nlc-assets-${VERSION}`
const API = `nlc-api-${VERSION}`
const OWN_CACHES = [PRECACHE, PAGES, ASSETS, API]

const OFFLINE_URL = '/offline.html'
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · Nepal License Checker</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center">
<h1>You are offline</h1><p>Open the app once while online to enable offline mode.</p>
<a href="/">Try again</a></body></html>`
const NAV_TIMEOUT = 8000
const API_TIMEOUT = 15000
const MAX_API_ENTRIES = 60

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/site.webmanifest',
  '/site-dark.webmanifest',
  '/License-Checker-Nepal-logo.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/maskable-icon-192x192.png',
  '/maskable-icon-512x512.png',
  '/maskable-icon-dark-192x192.png',
  '/maskable-icon-dark-512x512.png',
  '/maskable-icon.svg',
  '/apple-touch-icon.png',
  '/',
]

/** @param {Request} request */
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    /\.(?:css|js|woff2?|ttf|otf|eot|png|jpe?g|webp|avif|svg|ico|webmanifest)$/i.test(url.pathname)
  )
}

/** Media is too large to be worth pre-caching on mobile data. */
function isHeavyMedia(url) {
  return /\.(?:mp4|webm|mov|mp3|wav|zip|pdf)$/i.test(url.pathname)
}

/**
 * Fetch with a hard timeout so a hanging connection never blocks the UI.
 * @param {RequestInfo} input
 * @param {RequestInit} init
 * @param {number} ms
 */
function fetchWithTimeout(input, init, ms) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ms)
    fetch(input, { ...init, signal: controller.signal })
      .then((response) => {
        clearTimeout(timer)
        resolve(response)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/** Keep a cache bounded — oldest keys are evicted first (insertion ordered). */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)))
}

/** @param {Request} request @param {Response} response */
async function putInCache(cacheName, request, response) {
  try {
    if (!response || !response.ok || response.status === 206) return
    const cache = await caches.open(cacheName)
    await cache.put(request, response)
  } catch {
    // A full or unavailable quota must never break the response path.
  }
}

async function handleNavigation(request) {
  const url = new URL(request.url)

  try {
    const response = await fetchWithTimeout(request, { redirect: 'follow' }, NAV_TIMEOUT)
    if (response && response.ok) {
      // Clone synchronously — the caller starts consuming the body right away.
      putInCache(PAGES, request, response.clone())
    }
    return response
  } catch {
    // Offline (or too slow) — prefer the freshest cached page, then the shell.
    const cachedPage = await caches.match(request, { cacheName: PAGES, ignoreSearch: true })
    if (cachedPage) return cachedPage

    const shell = await caches.match(url.origin + '/', { cacheName: PRECACHE })
    if (shell) return shell

    const offline = await caches.match(OFFLINE_URL, { cacheName: PRECACHE })
    if (offline) return offline

    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}

async function handleApi(request, url) {
  // Never cache administrative, maintenance, or internal cron operations in offline storage
  if (
    url.pathname.startsWith('/api/admin') ||
    url.pathname.startsWith('/api/maintenance') ||
    url.pathname.startsWith('/api/cron')
  ) {
    return fetch(request)
  }

  const cacheable = request.method === 'GET' && !url.searchParams.has('_rsc')

  try {
    const response = await fetch(request)
    if (cacheable && response && response.ok) {
      await putInCache(API, request, response.clone())
      trimCache(API, MAX_API_ENTRIES)
    }
    return response
  } catch {
const cached = await caches.match(request, { cacheName: API })
    if (cached) {
      // Mark the response so the UI can tell the user the data may be stale.
      const headers = new Headers(cached.headers)
      headers.set('X-From-Cache', '1')
      return new Response(await cached.blob(), {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      })
    }

    return new Response(
      JSON.stringify({
        status: 'error',
        error: 'You are offline and this lookup is not cached yet.',
        offline: true,
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-From-Cache': '1',
        },
      }
    )
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetchWithTimeout(request, undefined, API_TIMEOUT)
    if (response && response.ok) {
      putInCache(ASSETS, request, response.clone())
    }
    return response
  } catch (error) {
    const fallback = await caches.match(request, { ignoreSearch: true })
    if (fallback) return fallback
    throw error
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(request)

  const network = fetchWithTimeout(request, undefined, API_TIMEOUT)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)

  if (cached) {
    network.catch(() => undefined)
    return cached
  }

  const response = await network
  if (response) return response

  return new Response('', { status: 504, statusText: 'Offline' })
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE)
      // Add one by one so a single 404 cannot break the whole install.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((response) => {
              if (response && response.ok) return cache.put(url, response)
              return undefined
            })
            .catch(() => undefined)
        )
      )
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys.filter((key) => key.startsWith('nlc-') && !OWN_CACHES.includes(key)).map((key) => caches.delete(key))
      )
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.disable().catch(() => undefined)
      }
      await self.clients.claim()
    })()
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: VERSION })
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  if (url.origin !== self.location.origin) return
  if (isHeavyMedia(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApi(request, url))
    return
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request))
})