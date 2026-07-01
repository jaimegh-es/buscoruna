const CACHE_NAME = 'coruna-bus-v1'

const PRECACHE_URLS = [
  '/',
  '/logo.png',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
    ).catch(() => caches.match('/'))
  )
})

self.addEventListener('push', (event) => {
  let title = 'Coruña Bus'
  let body = ''
  let notificationData = {}
  if (event.data) {
    try {
      const parsed = event.data.json()
      title = parsed.title || title
      body = parsed.body || ''
      notificationData = parsed.data || {}
    } catch {
      body = event.data.text()
    }
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/logo.png',
      badge: '/logo.png',
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: notificationData,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length > 0) return clients[0].focus()
      return clients.openWindow('/')
    })
  )
})
