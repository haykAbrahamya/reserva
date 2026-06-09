import { apiGet, apiPost } from './http'

// ─────────────────────────────────────────────────────────────
// Web Push enrolment for backoffice staff. Registers the service worker,
// subscribes via the backend's VAPID public key, and syncs the subscription.
// ─────────────────────────────────────────────────────────────

/** Push is only possible with SW + PushManager + Notification support. */
export function pushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** iOS only allows web push from an installed (Add to Home Screen) PWA. */
export function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const iOS = /iP(hone|ad|od)/.test(ua)
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iOS && !standalone
}

export function notificationPermission(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  // type:'classic' module — sw.js is plain JS served from the origin root.
  const existing = await navigator.serviceWorker.getRegistration('/')
  return existing ?? navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** True if this device currently has an active push subscription. */
export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  return !!sub
}

/**
 * Prompt for permission, subscribe, and register with the backend.
 * Returns false if unsupported, denied, or no VAPID key is configured.
 * Must be called from a user gesture (browsers require it for the prompt).
 */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  return subscribeAndSync()
}

/**
 * Re-subscribe silently IF the user already granted permission before (e.g.
 * after re-login on a device they'd previously enabled). No prompt, no user
 * gesture needed — browsers allow subscribe() without a gesture when permission
 * is already 'granted'. Returns false (no-op) otherwise. Lets push "just work"
 * again after login without making the user re-tap Enable.
 */
export async function resyncPush(): Promise<boolean> {
  if (!pushSupported()) return false
  if (Notification.permission !== 'granted') return false
  return subscribeAndSync()
}

/** Core: ensure a subscription exists and register it with the backend. */
async function subscribeAndSync(): Promise<boolean> {
  const { publicKey } = await apiGet<{ publicKey: string }>('/push/vapid-public-key')
  if (!publicKey) return false

  const reg = await getRegistration()
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }

  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await apiPost('/push/subscribe', { endpoint: json.endpoint, keys: json.keys })
  return true
}

/** Unsubscribe this device and tell the backend to drop it. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  await apiPost('/push/unsubscribe', { endpoint }).catch(() => {})
}
