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
  pushSupported, isSubscribed, enablePush, disablePush, notificationPermission, isIosSafari,
} from '@/services/push.service'
import s from './NotificationsBell.module.scss'

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
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const ICONS: Record<NotificationType, typeof Bell> = {
  booking_created: CalendarPlus,
  booking_rescheduled: CalendarClock,
  booking_cancelled: CalendarX,
  booking_confirmed: CheckCircle2,
  booking_completed: CheckCircle2,
  booking_noshow: XCircle,
}

const POLL_MS = 60_000

export function NotificationsBell() {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  // Poll the unread badge in the background.
  const refreshCount = useCallback(() => {
    notificationsService.unreadCount().then(setUnread).catch(() => {})
  }, [])

  useEffect(() => {
    refreshCount()
    const id = setInterval(refreshCount, POLL_MS)
    return () => clearInterval(id)
  }, [refreshCount])

  // Reflect current push subscription state.
  useEffect(() => {
    if (pushSupported()) isSubscribed().then(setPushOn).catch(() => {})
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
        <div className={s.panel} role="menu">
          <div className={s.head}>
            <span className={s.title}>Notifications</span>
            {unread > 0 && (
              <button className={s.markAll} onClick={markAll}>
                <Check size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* Push enable row */}
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
          {pushSupported() && isIosSafari() && !pushOn && (
            <div className={s.iosHint}>On iPhone: Share → Add to Home Screen first, then enable.</div>
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
        </div>
      )}
    </div>
  )
}
