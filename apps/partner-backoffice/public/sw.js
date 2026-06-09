/* Reserva partner-backoffice service worker — Web Push only.
   Kept intentionally minimal: no asset caching (the app is API-driven and we
   want always-fresh data), just push display + click-to-open. */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Reserva', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Reserva'
  const options = {
    body: data.body || '',
    // Colored icon shown in the notification body.
    icon: '/notif-icon.png',
    // Monochrome (white + alpha) glyph for the Android status bar — Android
    // tints this; a colored/SVG image renders as an empty block, so use the PNG.
    badge: '/notif-badge.png',
    tag: data.tag, // collapse duplicates for the same booking
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
      // Focus an existing tab and navigate it; otherwise open a new one.
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
