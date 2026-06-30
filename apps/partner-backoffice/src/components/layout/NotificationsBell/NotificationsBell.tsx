import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Check, CalendarPlus, CalendarClock, CalendarX, CheckCircle2, XCircle, Trash2, BellRing, BellOff,
} from 'lucide-react'
import {
  notificationsService,
  type AppNotification,
  type NotificationType,
} from '@/services/notifications.service'
import {
  pushSupported, isSubscribed, enablePush, disablePush, resyncPush, notificationPermission, isIosSafari,
} from '@/services/push.service'
import { useDragDismiss } from '@/components/ui'
import s from './NotificationsBell.module.scss'

function useIsMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

/** Compact relative time: "just now", "5m", "3h", "2d", else a short date. */
function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

const ICONS: Record<NotificationType, typeof Bell> = {
  booking_created: CalendarPlus,
  booking_rescheduled: CalendarClock,
  booking_cancelled: CalendarX,
  booking_confirmed: CheckCircle2,
  booking_completed: CheckCircle2,
  booking_noshow: XCircle,
}

// Lightweight polling: the unread-count query is a cheap indexed COUNT. We
// only poll while the tab is visible, and refresh immediately on focus.
const POLL_MS = 25_000

export function NotificationsBell() {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  // Keep the live count in a ref so the poller can detect changes and refresh
  // the open dropdown without re-creating the interval.
  const unreadRef = useRef(0)
  const openRef = useRef(false)
  unreadRef.current = unread
  openRef.current = open

  const refreshCount = useCallback(async () => {
    try {
      const count = await notificationsService.unreadCount()
      // If new ones arrived while the panel is open, refresh the list too.
      if (count !== unreadRef.current && openRef.current) loadListRef.current()
      setUnread(count)
    } catch {
      /* ignore transient/auth errors */
    }
  }, [])

  // loadList is defined below; keep a stable ref so refreshCount can call it.
  const loadListRef = useRef<() => void>(() => {})

  // Poll only while the tab is visible; refresh instantly when it regains focus.
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (id) return
      refreshCount()
      id = setInterval(refreshCount, POLL_MS)
    }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    const onVisibility = () => (document.hidden ? stop() : start())

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility) }
  }, [refreshCount])

  // Reflect push state + silently re-subscribe if permission was already granted
  // (so push "just works" again after re-login without making the user re-tap).
  useEffect(() => {
    if (!pushSupported()) return
    resyncPush()
      .then((ok) => (ok ? setPushOn(true) : isSubscribed().then(setPushOn)))
      .catch(() => isSubscribed().then(setPushOn).catch(() => {}))
  }, [])

  // Load the list whenever the panel opens.
  const loadList = useCallback(() => {
    setLoading(true)
    notificationsService
      .list()
      .then((page) => { setItems(page.items); setUnread(page.unread) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  loadListRef.current = loadList

  useEffect(() => { if (open) loadList() }, [open, loadList])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const openNotification = async (n: AppNotification) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread((u) => Math.max(0, u - 1))
      notificationsService.markRead(n.id).catch(() => {})
    }
    setOpen(false)
    if (n.data.bookingId) navigate(`/bookings?focus=${n.data.bookingId}`)
  }

  const markAll = () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })))
    setUnread(0)
    notificationsService.markAllRead().catch(() => {})
  }

  const remove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const wasUnread = items.find((x) => x.id === id)?.read === false
    setItems((prev) => prev.filter((x) => x.id !== id))
    if (wasUnread) setUnread((u) => Math.max(0, u - 1))
    notificationsService.remove(id).catch(() => {})
  }

  const togglePush = async () => {
    setPushBusy(true)
    try {
      if (pushOn) { await disablePush(); setPushOn(false) }
      else { const ok = await enablePush(); setPushOn(ok) }
    } finally {
      setPushBusy(false)
    }
  }

  const denied = notificationPermission() === 'denied'

  // Mobile: render as a bottom sheet with Android-style drag-to-dismiss.
  const drag = useDragDismiss({
    onDismiss: () => setOpen(false),
    scrollSelector: `.${s.list}`,
    handleSelector: `.${s.grab}`,
    enabled: isMobile && open,
  })

  // Lock background scroll while the mobile sheet is open.
  useEffect(() => {
    if (!isMobile || !open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isMobile, open])

  const panelBody = (
    <>
      {/* Mobile sheet gets a grab handle for the drag-to-dismiss affordance. */}
      {isMobile && <div className={s.grab} />}
      <div className={s.head}>
        <span className={s.title}>Notifications</span>
        {unread > 0 && (
          <button className={s.markAll} onClick={markAll}>
            <Check size={13} /> Mark all read
          </button>
        )}
      </div>

      {/* Push enable row (when the browser supports web push). */}
      {pushSupported() && (
        <button className={s.pushRow} onClick={togglePush} disabled={pushBusy || denied}>
          {pushOn ? <BellRing size={15} /> : <BellOff size={15} />}
          <span className={s.pushText}>
            {denied
              ? 'Notifications blocked in browser settings'
              : pushOn
                ? 'Push notifications on'
                : 'Enable push on this device'}
          </span>
          {!denied && <span className={[s.pushPill, pushOn ? s.pushPillOn : ''].join(' ')}>{pushOn ? 'On' : 'Off'}</span>}
        </button>
      )}

      {/* iOS Safari (non-installed tab) can't do web push at all — `pushSupported()`
          is false there, so the enable row above never shows. Without this the
          user just sees an empty panel with no explanation. Tell them how to turn
          notifications on: install the PWA first, then enable from inside it. */}
      {!pushSupported() && isIosSafari() && (
        <div className={[s.pushRow, s.pushNote].join(' ')} role="note">
          <BellOff size={15} />
          <span className={s.pushText}>
            To get notifications on iPhone: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>,
            then open Reserva from your home screen and enable here.
          </span>
        </div>
      )}

      <div className={s.list}>
        {loading && items.length === 0 ? (
          <div className={s.empty}>Loading…</div>
        ) : items.length === 0 ? (
          <div className={s.empty}>
            <Bell size={22} strokeWidth={1.5} />
            <span>You're all caught up</span>
          </div>
        ) : (
          items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell
            return (
              <button
                key={n.id}
                className={[s.item, n.read ? '' : s.unread].filter(Boolean).join(' ')}
                onClick={() => openNotification(n)}
              >
                <span className={s.itemIcon}><Icon size={16} /></span>
                <span className={s.itemBody}>
                  <span className={s.itemTitle}>{n.title}</span>
                  <span className={s.itemText}>{n.body}</span>
                  <span className={s.itemTime}>{fmtRelative(n.createdAt)}</span>
                </span>
                {!n.read && <span className={s.dot} />}
                <span className={s.del} onClick={(e) => remove(e, n.id)} role="button" aria-label="Remove">
                  <Trash2 size={13} />
                </span>
              </button>
            )
          })
        )}
      </div>
    </>
  )

  return (
    <div ref={ref} className={s.wrap}>
      <button
        className={[s.bellBtn, open ? s.open : ''].filter(Boolean).join(' ')}
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={15} />
        {unread > 0 && <span className={s.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        isMobile ? (
          // Mobile: full-width bottom sheet + scrim, drag down to dismiss.
          <>
            <div className={s.scrim} onClick={() => setOpen(false)} />
            <div
              className={s.sheet}
              role="menu"
              {...drag.handlers}
              style={drag.style}
            >
              {panelBody}
            </div>
          </>
        ) : (
          // Desktop: anchored dropdown.
          <div className={s.panel} role="menu">
            {panelBody}
          </div>
        )
      )}
    </div>
  )
}
