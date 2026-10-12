// ─────────────────────────────────────────────────────────────
// Site analytics v1 ("pulse") for reserva.am and its partner pages: this
// site's event catalog over the shared tracker (@reserva/shared/pulse — the
// queue, batching, sealing and sending live there).
//
// Privacy: ids (uuids) and short strings only — never names, phones, emails or
// form values. Like the page it measures, it must never throw or block render.
// ─────────────────────────────────────────────────────────────

import { createPulse, type Where } from '@reserva/shared/pulse'
import { slugFromHost } from '@/hooks/useTenantSlug'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

/** Pause in typing after which a search / filter text counts as one query. */
const TYPING_MS = 1_200

// ── Event catalog (contract §3): name → props ──

/** An optional uuid prop. null/undefined are dropped, so call sites can pass state as-is. */
type Id = string | null | undefined

export type PageType = 'home' | 'marketplace' | 'partner' | 'signup' | 'other'
export type BookSource =
  | 'hero' | 'nav' | 'services' | 'team' | 'specialist' | 'locations' | 'footer' | 'courses' | 'fab' | 'other'
export type ContactChannel =
  | 'call' | 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'directions' | 'website' | 'email'
export type BookingStep = 'branch' | 'service' | 'specialist' | 'datetime' | 'details' | 'confirm'

export interface PulseEvents {
  page_view: { pt: PageType }
  // Partner page
  book_click: { from: BookSource; svc?: Id; sp?: Id; loc?: Id }
  contact_click: { ch: ContactChannel; from?: string; loc?: Id }
  branch_switch: { loc: string }
  category_select: { cat: string }
  service_search: { q: string }
  specialist_open: { sp: string }
  gallery_open: { kind?: 'gallery' | 'works' }
  course_open: { course: string }
  course_register_click: { course: string }
  // Reviews — the stars only, never the author or the text
  reviews_open: { from: 'hero' | 'tab' }
  review_form_open: { sp: string }
  review_success: { sp: string; stars: number }
  review_error: { sp?: Id; code: string }
  // Booking flow
  booking_open: { from?: string; svc?: Id; sp?: Id; loc?: Id }
  booking_step: { step: BookingStep }
  booking_submit: { svc?: Id; sp?: Id; loc?: Id; any?: boolean }
  booking_success: { svc?: Id; sp?: Id; loc?: Id }
  booking_error: { code: string }
  booking_close: { step: string }
  // Sign-up
  signup_start: Record<string, never>
  signup_step: { step: string }
  signup_submit: Record<string, never>
  signup_error: { field?: string; code?: string }
  signup_success: Record<string, never>
  // Marketplace
  salons_search: { q: string }
  salons_filter: { cat?: string; area?: string }
  salon_click: { slug: string; pos?: number }
}
export type PulseEventName = keyof PulseEvents

/** Props may be left out exactly when every prop of that event is optional. */
type PropsArg<N extends PulseEventName> =
  {} extends PulseEvents[N] ? [props?: PulseEvents[N]] : [props: PulseEvents[N]]

/** Props that carry uuids: a malformed one is dropped so it can't cost the whole event. */
const UUID_KEYS = new Set(['svc', 'sp', 'loc', 'course'])
/** Contract length limits — cut here rather than have the server drop the event. */
const MAX_LEN: Record<string, number> = { from: 24, step: 24, code: 40, field: 40, q: 60, cat: 80, area: 80, slug: 80 }

// ── Module state (browser only; nothing here runs during prerender) ──

let lastBook: { from: string; at: number } | null = null
/** Typed text waiting for a pause, per event+field slot. */
const typing = new Map<string, { timer: ReturnType<typeof setTimeout>; fire: () => void }>()
/** The last text sent per slot and page, so retyping the same query isn't a new one. */
const lastTyped = new Map<string, string>()

const pulse = createPulse({
  apiUrl: API_URL,
  key: import.meta.env.VITE_SITE_PULSE_KEY,
  where: here,
  uuidKeys: UUID_KEYS,
  maxLen: MAX_LEN,
  // A contact tap often hands the phone to another app (dialer, WhatsApp,
  // Maps) and a backgrounded tab may never get another tick — send it now.
  urgent: new Set(['contact_click']),
  // A query typed just before leaving still counts.
  beforeLeave: () => {
    for (const { timer: t, fire } of typing.values()) {
      clearTimeout(t)
      fire()
    }
  },
})

// ── Public API ──

/**
 * Record one event. Fire-and-forget: queues it and returns. The batch goes out
 * when 25 events are waiting, after ~4 s, or when the page is hidden/closed.
 */
export function track<N extends PulseEventName>(name: N, ...[props]: PropsArg<N>): void {
  pulse.record(name, props)
  try {
    if (name === 'book_click' && typeof window !== 'undefined') {
      lastBook = { from: String((props as { from?: string }).from), at: Date.now() }
    }
  } catch {
    // Never let tracking break the page.
  }
}

/** The page view for the current route (once per navigation, from App). */
export function trackPageView(): void {
  try {
    if (typeof window !== 'undefined') pulse.record('page_view', { pt: pageType(window.location.pathname) })
  } catch {
    // Never let tracking break the page.
  }
}

/**
 * Text typed into a search or filter box, sent once typing pauses (~1.2 s):
 * only for 2+ characters, and not again for the same text on the same page —
 * one query costs one event, not one per keystroke. `field` picks the prop:
 * `q` for the searches, `cat` / `area` for the marketplace filters.
 */
export function trackTyped(name: 'service_search' | 'salons_search', text: string): void
export function trackTyped(name: 'salons_filter', text: string, field: 'cat' | 'area'): void
export function trackTyped(
  name: 'service_search' | 'salons_search' | 'salons_filter',
  text: string,
  field: 'q' | 'cat' | 'area' = 'q',
): void {
  try {
    if (typeof window === 'undefined') return
    const slot = `${name}.${field}`
    const pending = typing.get(slot)
    if (pending) clearTimeout(pending.timer)
    typing.delete(slot)

    const value = text.trim().toLowerCase().slice(0, MAX_LEN[field])
    if (value.length < 2) return
    // Pinned now: the pause can outlast the page (type, then tap a result).
    const where = here()
    const fire = () => {
      typing.delete(slot)
      const seen = `${slot}|${where.h}${where.p}`
      if (lastTyped.get(seen) === value) return
      lastTyped.set(seen, value)
      pulse.record(name, { [field]: value }, where)
    }
    typing.set(slot, { timer: setTimeout(fire, TYPING_MS), fire })
  } catch {
    // Never let tracking break the page.
  }
}

/**
 * The `from` of a book_click made a moment ago (read once). Lets the booking
 * flow attribute its booking_open without every template threading the source
 * through its onBook callbacks.
 */
export function recentBookSource(): string | undefined {
  const b = lastBook
  lastBook = null
  return b && Date.now() - b.at < 3_000 ? b.from : undefined
}

// ── Where ──

function here(): Where {
  const { pathname, host } = window.location
  const ps = partnerSlug(pathname)
  return { p: pathname.slice(0, 512), h: host.slice(0, 255), ...(ps ? { ps: ps.slice(0, 80) } : {}) }
}

/** The partner slug when this is a partner page: /p/:slug, or a tenant subdomain's root. */
function partnerSlug(pathname: string): string | undefined {
  const m = /^\/p\/([a-z0-9-]+)/i.exec(pathname)
  if (m) return m[1].toLowerCase()
  const tenant = slugFromHost()
  return tenant && /^\/?$/.test(pathname) ? tenant : undefined
}

function pageType(pathname: string): PageType {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (partnerSlug(path)) return 'partner'
  if (path === '/') return 'home'
  if (path === '/salons' || path.startsWith('/salons/')) return 'marketplace'
  if (path === '/signup') return 'signup'
  return 'other'
}
