import { io, type Socket } from 'socket.io-client'
import { API_ORIGIN, tokenStore } from './http'
import type { SupportMessage } from './support.service'

/**
 * Singleton socket.io connection to the backend `/support` namespace, authed
 * with the PLATFORM access token. The server puts platform sockets in the shared
 * platform room, so every operator sees all threads' messages live.
 */
let socket: Socket | null = null

export function getSupportSocket(): Socket {
  if (socket) return socket
  socket = io(`${API_ORIGIN}/support`, {
    auth: (cb) => cb({ token: tokenStore.access ?? '' }),
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  })
  return socket
}

export function closeSupportSocket() {
  socket?.disconnect()
  socket = null
}

/** New message in ANY thread (platform room broadcast). */
export function onSupportMessage(handler: (m: SupportMessage) => void): () => void {
  const s = getSupportSocket()
  s.on('support:message', handler)
  return () => s.off('support:message', handler)
}

/** Hint to refresh the unread badge / thread list. */
export function onSupportBadge(handler: () => void): () => void {
  const s = getSupportSocket()
  s.on('support:badge', handler)
  return () => s.off('support:badge', handler)
}

/** A partner is typing (or stopped) in their thread. */
export function onSupportTyping(
  handler: (d: { from: 'partner'; partnerId: string; typing: boolean }) => void,
): () => void {
  const sk = getSupportSocket()
  sk.on('support:typing', handler)
  return () => sk.off('support:typing', handler)
}

/** A side read messages in a partner's thread. */
export function onSupportRead(
  handler: (d: { partnerId: string; reader: 'partner' | 'platform' }) => void,
): () => void {
  const sk = getSupportSocket()
  sk.on('support:read', handler)
  return () => sk.off('support:read', handler)
}

/** A ticket was closed/deleted → drop it everywhere. */
export function onSupportClosed(handler: (d: { partnerId: string }) => void): () => void {
  const sk = getSupportSocket()
  sk.on('support:closed', handler)
  return () => sk.off('support:closed', handler)
}

/** Tell the server we're typing in a specific partner's thread. */
export function emitTyping(threadPartnerId: string, typing: boolean) {
  getSupportSocket().emit('support:typing', { threadPartnerId, typing })
}
