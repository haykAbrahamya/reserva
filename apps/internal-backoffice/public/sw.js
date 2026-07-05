/* Reserva internal-backoffice service worker — Web Push only.
   Minimal: no asset caching (API-driven app), just push display + click-to-open.
   Bump SW_VERSION on every change so the browser installs the new worker. */
const SW_VERSION = 'v1-2026-07-06'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  console.log('[sw] activated', SW_VERSION)
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Reserva', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Reserva Internal'
  const options = {
    body: data.body || '',
    icon: '/notif-icon.png',
    badge: '/notif-badge.png',
    tag: data.tag,
    data: { url: data.url || '/' },
    renotify: !!data.tag,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(target).catch(() => {})
          return
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    }),
  )
})
