const CACHE_NAME = 'hoic-app-cache-v1'

const PRECACHE_ASSETS = [
  '/',
  '/time',
  '/tasks',
  '/supplies',
  '/offline',
  '/manifest.webmanifest',
  '/icon.svg',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS)
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests
  if (event.request.method !== 'GET') return
  
  // Skip cross-origin requests, chrome-extension, and supabase API calls
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/_next/image')) return

  // For navigation requests (HTML), try network first, then cache, then offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response and cache it
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse
            return caches.match('/offline')
          })
        })
    )
    return
  }

  // For static assets (CSS, JS, Images), use Cache First, fallback to Network
  if (url.pathname.startsWith('/_next/static/') || PRECACHE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse
        return fetch(event.request).then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
      })
    )
    return
  }

  // For everything else, Network First, fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone)
        })
        return response
      })
      .catch(() => {
        return caches.match(event.request)
      })
  )
})
