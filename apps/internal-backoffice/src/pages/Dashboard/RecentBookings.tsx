import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CalendarDays, Globe, RefreshCw, Store, TriangleAlert } from 'lucide-react'
import { Badge, Button, Empty, useToast, type BadgeVariant } from '@/components/ui'
import { AMD_SIGN } from '@/types'
import { errorMessage } from '@/services/errors'
import { ApiError } from '@/services/http'
import { recentBookingsService, type RecentBooking } from '@/services/recentBookings.service'
import s from './RecentBookings.module.scss'

const FIRST = 5
const MORE = 10
/** The API's page cap. */
const MAX_LIMIT = 50
const POLL_MS = 60_000
/** How long a booking that arrived on a refresh stays highlighted. */
const FRESH_MS = 4_000

const STATUSES: readonly BadgeVariant[] = ['pending', 'confirmed', 'cancelled', 'completed', 'noshow']
const NUM = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

/** "just now", "2 min ago", "3 h ago", "yesterday", "4 days ago", then a date. */
function fmtAgo(iso: string): string {
  const min = Math.floor(Math.max(0, Date.now() - Date.parse(iso)) / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d} days ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmtExact(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

/** The appointment: "Today, 15:30", "Tomorrow, 10:00", else "Tue 14 Oct, 15:30". */
function fmtAppointment(iso: string): string {
  const d = new Date(iso)
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diffDays = Math.round((day - today) / 86_400_000)
  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Tomorrow, ${time}`
  if (diffDays === -1) return `Yesterday, ${time}`
  const date = d.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  })
  return `${date}, ${time}`
}

/** The console's messages are written for records ("That item could no longer
 *  be found"); for this list a 404 can only mean the API has no such route yet. */
function loadErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 404) return 'This server doesn’t offer recent bookings yet.'
  return errorMessage(err)
}

/** "15,000 ֏" or "15,000–25,000 ֏"; null when the service has no price. */
function fmtPrice(p: RecentBooking['price']): string | null {
  if (!p) return null
  if (p.type === 'range' && p.max != null && p.max !== p.amount) {
    return `${NUM.format(p.amount)}–${NUM.format(p.max)} ${AMD_SIGN}`
  }
  return `${NUM.format(p.amount)} ${AMD_SIGN}`
}

/**
 * The newest bookings across every partner, so a jump in the Bookings number
 * comes with the answer to "for whom?". Refreshes itself quietly each minute
 * while the tab is visible; bookings that arrive that way are briefly marked.
 */
export function RecentBookings() {
  const toast = useToast()
  const [items, setItems] = useState<RecentBooking[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<unknown>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set())

  // Each reload bumps the generation; anything that started under an older
  // one (a slower reload, a "Show more") is dropped when it lands.
  const generation = useRef(0)
  const lastFetch = useRef(0)
  const itemsRef = useRef(items)
  itemsRef.current = items

  const load = useCallback(async (mode: 'initial' | 'manual' | 'auto') => {
    const mine = ++generation.current
    // Re-read as many rows as are showing, so new bookings push in at the top
    // instead of a list someone expanded collapsing back to five.
    const limit = Math.min(MAX_LIMIT, Math.max(FIRST, itemsRef.current.length))
    if (mode === 'initial') setPhase('loading')
    else setRefreshing(true)
    try {
      const page = await recentBookingsService.list({ limit })
      if (mine !== generation.current) return
      const known = new Set(itemsRef.current.map((b) => b.id))
      setItems(page.items)
      setCursor(page.nextCursor)
      setPhase('ready')
      setError(null)
      lastFetch.current = Date.now()
      if (mode !== 'initial' && known.size > 0) {
        setFresh(new Set(page.items.filter((b) => !known.has(b.id)).map((b) => b.id)))
      }
    } catch (err) {
      if (mine !== generation.current) return
      if (itemsRef.current.length === 0) {
        setError(err)
        setPhase('error')
      } else if (mode === 'manual') {
        toast(`Couldn’t refresh recent bookings. ${errorMessage(err)}`)
      }
      // A failed quiet refresh stays quiet: the list on screen is still right
      // as of its last load, and the next minute tries again.
    } finally {
      if (mine === generation.current) setRefreshing(false)
    }
  }, [toast])

  const more = async () => {
    if (!cursor) return
    const mine = generation.current
    setLoadingMore(true)
    try {
      const page = await recentBookingsService.list({ limit: MORE, cursor })
      if (mine !== generation.current) return
      setItems((prev) => [...prev, ...page.items.filter((b) => !prev.some((p) => p.id === b.id))])
      setCursor(page.nextCursor)
    } catch (err) {
      if (mine === generation.current) toast(`Couldn’t load more bookings. ${errorMessage(err)}`)
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => { void load('initial') }, [load])

  // Quiet refresh each minute — only while the page is actually being looked
  // at, and straight away on coming back to a tab left open for a while.
  useEffect(() => {
    const due = () => document.visibilityState === 'visible' && Date.now() - lastFetch.current >= POLL_MS - 1_000
    const timer = window.setInterval(() => { if (due()) void load('auto') }, POLL_MS)
    const onVisible = () => { if (due()) void load('auto') }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  useEffect(() => {
    if (fresh.size === 0) return
    const t = window.setTimeout(() => setFresh(new Set()), FRESH_MS)
    return () => window.clearTimeout(t)
  }, [fresh])

  return (
    <section className={s.card}>
      <div className={s.head}>
        <div>
          <h2 className={s.title}>Recent bookings</h2>
          <p className={s.sub}>Newest first, across every partner. Updates every minute.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void load('manual')} disabled={refreshing || phase === 'loading'}>
          <RefreshCw size={14} className={refreshing ? s.spin : undefined} /> Refresh
        </Button>
      </div>

      {phase === 'loading' ? (
        <ul className={s.list} aria-busy="true">
          {Array.from({ length: FIRST }, (_, i) => <li key={i} className={s.skelRow} />)}
        </ul>
      ) : phase === 'error' ? (
        <div className={s.error} role="alert">
          <TriangleAlert size={18} />
          <span className={s.errorText}>Couldn’t load recent bookings. {loadErrorMessage(error)}</span>
          <Button size="sm" onClick={() => void load('initial')}><RefreshCw size={13} /> Try again</Button>
        </div>
      ) : items.length === 0 ? (
        <div className={s.list}>
          <Empty
            icon={CalendarDays}
            title="No bookings yet"
            description="New appointments from every partner appear here as they’re made — online or by salon staff."
          />
        </div>
      ) : (
        <>
          <ul className={s.list}>
            {items.map((b) => <BookingRow key={b.id} b={b} fresh={fresh.has(b.id)} />)}
          </ul>
          {cursor && (
            <div className={s.moreRow}>
              <Button variant="ghost" size="sm" onClick={() => void more()} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Show more'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function BookingRow({ b, fresh }: { b: RecentBooking; fresh: boolean }) {
  // A solo professional is both the partner and the specialist; naming them
  // twice says nothing.
  const specialist = b.specialist && b.specialist.name !== b.partner.name ? b.specialist.name : null
  const details = [b.service?.name, specialist, b.location?.name].filter(Boolean).join(' · ')
  const price = fmtPrice(b.price)
  const online = b.source === 'public'

  return (
    <li className={[s.row, fresh ? s.fresh : ''].filter(Boolean).join(' ')}>
      <span className={s.when} title={`Booked ${fmtExact(b.createdAt)}`}>{fmtAgo(b.createdAt)}</span>
      <span className={s.who}>
        <Link to={`/partners/${b.partner.id}`} className={s.partner}>{b.partner.name}</Link>
        {details && <span className={s.details}>{details}</span>}
      </span>
      <span className={s.appt} title={`Appointment: ${fmtExact(b.startAt)}`}>
        <CalendarClock size={13} /> {fmtAppointment(b.startAt)}
      </span>
      <span className={s.badges}>
        <span
          className={[s.source, online ? s.online : ''].filter(Boolean).join(' ')}
          title={online ? 'Booked online by a client' : 'Entered by the salon’s staff'}
        >
          {online ? <Globe size={11} /> : <Store size={11} />}
          {online ? 'Online' : 'By staff'}
        </span>
        {STATUSES.includes(b.status) ? <Badge variant={b.status} /> : <span className={s.plain}>{b.status}</span>}
      </span>
      <span className={s.price}>{price}</span>
    </li>
  )
}
