// ─────────────────────────────────────────────────────────────
// Web Push enrolment for a public CLIENT, scoped to a single booking.
// Registers a minimal service worker, subscribes with the backend's VAPID
// public key, and posts the subscription tied to the booking id. The backend
// then pushes this device when the booking's status changes.
// No auth — these endpoints are public.
// ─────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

/** Push needs SW + PushManager + Notification support. */
export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
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

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/')
  return existing ?? navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

/**
 * Prompt for permission, subscribe, and register the subscription for this
 * booking. Returns true on success; false if unsupported, denied, or the
 * server has no VAPID key. Must be called from a user gesture.
 */
export async function enableBookingPush(bookingId: string): Promise<boolean> {
  if (!pushSupported()) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  // Fetch the VAPID public key.
  const keyRes = await fetch(`${API_URL}/public/push/public-key`)
  const keyJson = await keyRes.json().catch(() => null)
  const publicKey: string | null = (keyJson?.data ?? keyJson)?.key ?? null
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
  const res = await fetch(`${API_URL}/public/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingId,
      subscription: { endpoint: json.endpoint, keys: json.keys },
    }),
  })
  return res.ok
}
