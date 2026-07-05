import { io, type Socket } from 'socket.io-client'
import { API_ORIGIN, tokenStore } from './http'
import type { SupportMessage } from './support.service'

/**
 * Singleton socket.io connection to the backend `/support` namespace, authed
 * with the partner access token. Shared across the app so the widget and any
 * badge listener use ONE connection. Reconnects automatically; on auth failure
 * the server disconnects us and we surface it via the 'support:error' event.
 */
let socket: Socket | null = null

export function getSupportSocket(): Socket {
  if (socket) return socket
  socket = io(`${API_ORIGIN}/support`, {
    // Send the current access token on every (re)connect attempt.
    auth: (cb) => cb({ token: tokenStore.access ?? '' }),
    // Allow HTTP long-polling as a fallback and let socket.io upgrade to a real
    // WebSocket when the network/proxy permits. WS-only would silently fail
    // behind a proxy that doesn't forward the Upgrade headers (prod), leaving no
    // live updates at all — polling keeps the chat working regardless.
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  })
  return socket
}

/** Tear the connection down (on logout) so a stale token isn't reused. */
export function closeSupportSocket() {
  socket?.disconnect()
  socket = null
}

/** Typed helper: subscribe to new messages; returns an unsubscribe fn. */
export function onSupportMessage(handler: (m: SupportMessage) => void): () => void {
  const s = getSupportSocket()
  s.on('support:message', handler)
  return () => s.off('support:message', handler)
}

/** The platform is typing (or stopped). */
export function onSupportTyping(handler: (d: { from: 'platform'; typing: boolean }) => void): () => void {
  const s = getSupportSocket()
  s.on('support:typing', handler)
  return () => s.off('support:typing', handler)
}

/** The platform read our messages → mark them seen. */
export function onSupportRead(handler: (d: { reader: 'partner' | 'platform' }) => void): () => void {
  const s = getSupportSocket()
  s.on('support:read', handler)
  return () => s.off('support:read', handler)
}

/** The ticket was closed/deleted → reset to a fresh chat. */
export function onSupportClosed(handler: () => void): () => void {
  const s = getSupportSocket()
  s.on('support:closed', handler)
  return () => s.off('support:closed', handler)
}

/** Tell the server we're typing (or stopped). */
export function emitTyping(typing: boolean) {
  getSupportSocket().emit('support:typing', { typing })
}
