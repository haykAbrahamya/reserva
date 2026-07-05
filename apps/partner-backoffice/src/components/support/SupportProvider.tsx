import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { supportService } from '@/services/support.service'
import { getSupportSocket, closeSupportSocket } from '@/services/supportSocket'

interface SupportContextValue {
  open: boolean
  unread: number
  openChat: () => void
  closeChat: () => void
  toggleChat: () => void
}

const SupportContext = createContext<SupportContextValue | null>(null)

/** Access the app-wide support widget state (open flag + unread badge count). */
export function useSupport(): SupportContextValue {
  const ctx = useContext(SupportContext)
  if (!ctx) throw new Error('useSupport must be used within SupportProvider')
  return ctx
}

/**
 * App-wide support state.
 *
 * The WebSocket is intentionally NOT persistent: it's opened only while the chat
 * panel is OPEN (see openChat/closeChat) and torn down on close, so idle
 * partners hold no socket. The SupportPanel binds its live listeners to that
 * same connection while mounted.
 *
 * The unread badge (shown while closed) therefore comes from cheap REST:
 *  - once on login,
 *  - and whenever the window regains focus (catches replies that arrived while
 *    away). Web push covers the fully-backgrounded/closed-tab case.
 */
export function SupportProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const openRef = useRef(open)
  openRef.current = open

  const refreshUnread = useCallback(() => {
    supportService.unread().then((r) => setUnread(r.count)).catch(() => undefined)
  }, [])

  // Seed + refresh the badge while logged in (no socket held here). On logout,
  // make sure any open socket is torn down and the badge cleared.
  useEffect(() => {
    if (!user) {
      closeSupportSocket()
      setUnread(0)
      return
    }
    refreshUnread()
    const onFocus = () => { if (!openRef.current) refreshUnread() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user, refreshUnread])

  const openChat = useCallback(() => {
    // Connect the socket now (lazily) — the panel uses it for live messages.
    getSupportSocket()
    setOpen(true)
    setUnread(0)
    supportService.markRead().catch(() => undefined)
  }, [])

  const closeChat = useCallback(() => {
    setOpen(false)
    // Drop the connection when the chat closes — no idle sockets.
    closeSupportSocket()
    refreshUnread()
  }, [refreshUnread])

  const toggleChat = useCallback(
    () => (openRef.current ? closeChat() : openChat()),
    [openChat, closeChat],
  )

  return (
    <SupportContext.Provider value={{ open, unread, openChat, closeChat, toggleChat }}>
      {children}
    </SupportContext.Provider>
  )
}
