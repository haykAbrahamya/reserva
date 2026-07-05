import { apiGet, apiPost } from './http'

// ─────────────────────────────────────────────────────────────
// Web Push enrolment for PLATFORM staff (support alerts). Registers the SW,
// subscribes via the backend's VAPID key, and syncs to the platform endpoints.
// ─────────────────────────────────────────────────────────────

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function notificationPermission(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
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

export async function isSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  return !!sub
}

/** Prompt for permission + subscribe + register with the platform backend. */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  return subscribeAndSync()
}

/** Silent re-subscribe if permission was already granted (e.g. after re-login). */
export async function resyncPush(): Promise<boolean> {
  if (!pushSupported()) return false
  if (Notification.permission !== 'granted') return false
  return subscribeAndSync()
}

async function subscribeAndSync(): Promise<boolean> {
  const { publicKey } = await apiGet<{ publicKey: string }>('/platform/support/push/vapid-public-key')
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
  await apiPost('/platform/support/push/subscribe', { endpoint: json.endpoint, keys: json.keys })
  return true
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  await apiPost('/platform/support/push/unsubscribe', { endpoint }).catch(() => {})
}
