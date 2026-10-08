// ─────────────────────────────────────────────────────────────
// Site analytics v1 ("pulse"). Call sites fire tiny events; they queue up and
// leave in batches to POST /public/pulse, each batch sealed as
//   UTF-8 JSON → 0x01 | nonce(12) | ChaCha20-Poly1305(key, nonce, AAD) → base64url
// and sent as text/plain — a CORS "simple request" (no preflight) that
// navigator.sendBeacon can carry cross-origin (*.reserva.am → api.reserva.am).
// The key ships in this bundle, so the seal is tamper rejection and
// obfuscation, not secrecy: the server validates everything it receives.
//
// Privacy: ids (uuids) and short strings only — never names, phones, emails or
// form values. Like the page it measures, it must never throw or block render.
// ─────────────────────────────────────────────────────────────

import { chacha20poly1305 } from '@noble/ciphers/chacha.js'
import { slugFromHost } from '@/hooks/useTenantSlug'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

/** Contract key K1 (base64url, 32 bytes); VITE_SITE_PULSE_KEY overrides it. */
const DEFAULT_KEY = 'gHGgXRZFRUzCXtcUn1UiOQdJI4F_7Hfb_PeG0HjYdz4'
/** Wire version byte — tells the server which key sealed the batch. */
const VERSION = 0x01
const AAD = 'reserva.pulse.v1'

/** Server limit per request. */
const MAX_BATCH = 25
/** The longest an event waits for company before it is sent. */
const FLUSH_MS = 4_000
/** A visit ends after this long without an event (GA-style 30 minutes). */
const SESSION_IDLE_MS = 30 * 60_000
/** Pause in typing after which a search / filter text counts as one query. */
const TYPING_MS = 1_200

const VID_KEY = 'rsv.vid'
const SESSION_KEY = 'rsv.session'
const STAFF_KEY = 'rsv.staff'

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

// ── Wire shapes (contract §2) ──

type UtmKey = 'source' | 'medium' | 'campaign' | 'content' | 'term'

interface SessionContext {
  ref: string
  lp: string
  lh: string
  utm?: Partial<Record<UtmKey, string>>
  lang: string
  sw: number
  sh: number
}

interface Session {
  id: string
  /** Epoch ms of the last event — the idle clock for rotation. */
  last: number
  s: SessionContext
}

/** Where an event happened: path, host and — on a partner page — the partner slug. */
interface Where {
  p: string
  h: string
  ps?: string
}

interface WireEvent extends Where {
  id: string
  n: PulseEventName
  t: number
  x?: Record<string, unknown>
}

/** Props that carry uuids: a malformed one is dropped so it can't cost the whole event. */
const UUID_KEYS = new Set(['svc', 'sp', 'loc', 'course'])
/** Contract length limits — cut here rather than have the server drop the event. */
const MAX_LEN: Record<string, number> = { from: 24, step: 24, code: 40, field: 40, q: 60, cat: 80, area: 80, slug: 80 }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Module state (browser only; nothing here runs during prerender) ──

let queue: WireEvent[] = []
/** The session the queued events belong to — a batch never mixes two. */
let queued: Session | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let ready = false
// Memory fallbacks for blocked storage (private modes, strict cookie settings):
// the ids then simply last for this page load.
let memVid: string | null = null
let memSession: Session | null = null
/** `?internal=1` was seen in this page load (survives blocked storage). */
let staffUrl = false
let lastBook: { from: string; at: number } | null = null
let key: Uint8Array | null = null
/** Typed text waiting for a pause, per event+field slot. */
const typing = new Map<string, { timer: ReturnType<typeof setTimeout>; fire: () => void }>()
/** The last text sent per slot and page, so retyping the same query isn't a new one. */
const lastTyped = new Map<string, string>()

// ── Public API ──

/**
 * Record one event. Fire-and-forget: queues it and returns. The batch goes out
 * when 25 events are waiting, after ~4 s, or when the page is hidden/closed.
 */
export function track<N extends PulseEventName>(name: N, ...[props]: PropsArg<N>): void {
  record(name, props)
}

/** The page view for the current route (once per navigation, from App). */
export function trackPageView(): void {
  try {
    if (typeof window !== 'undefined') record('page_view', { pt: pageType(window.location.pathname) })
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
      record(name, { [field]: value }, where)
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

/**
 * Seal a batch's JSON for the wire (contract §1):
 * base64url( 0x01 | nonce(12) | ChaCha20-Poly1305(key, nonce, AAD).encrypt(json) ).
 *
 * Synchronous on purpose: a pagehide/visibilitychange handler gets no later
 * tick, so an async (WebCrypto) seal would lose exactly the events fired on the
 * way out — the WhatsApp tap, the Call, the Directions. Nonce and key are
 * injectable for the contract's known-answer test.
 */
export function sealPulse(json: string, nonce: Uint8Array = randomBytes(12), keyBytes: Uint8Array = pulseKey()): string {
  const utf8 = new TextEncoder()
  const sealed = chacha20poly1305(keyBytes, nonce, utf8.encode(AAD)).encrypt(utf8.encode(json))
  const out = new Uint8Array(1 + nonce.length + sealed.length)
  out[0] = VERSION
  out.set(nonce, 1)
  out.set(sealed, 1 + nonce.length)
  return toBase64url(out)
}

// ── Queue + flush ──

function record(name: PulseEventName, props?: object, where?: Where): void {
  try {
    if (typeof window === 'undefined') return
    init()
    noteStaffParam()
    const sess = touchSession()
    if (queue.length && queued?.id !== sess.id) flush()
    queued = sess
    queue.push(makeEvent(name, props, where ?? here()))
    if (name === 'book_click') lastBook = { from: String((props as { from?: string }).from), at: Date.now() }

    // A contact tap often hands the phone to another app (dialer, WhatsApp,
    // Maps) and a backgrounded tab may never get another tick — send it now.
    if (queue.length >= MAX_BATCH || name === 'contact_click') flush()
    else if (timer === undefined) timer = setTimeout(flush, FLUSH_MS)
  } catch {
    // Never let tracking break the page.
  }
}

function flush(): void {
  try {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    const sess = queued
    if (!queue.length || !sess) return
    const vid = visitorId()
    // Re-checked per batch: a staff login mid-visit still marks the session.
    const s = isInternal() ? { ...sess.s, int: true } : sess.s
    while (queue.length) {
      const e = queue.splice(0, MAX_BATCH)
      send(sealPulse(JSON.stringify({ v: 1, sid: sess.id, vid, s, e })))
    }
  } catch {
    queue = []
  }
}

/** Hidden/closing is the last reliable moment on mobile: send everything now. */
function flushAll(): void {
  try {
    // A query typed just before leaving still counts.
    for (const { timer: t, fire } of typing.values()) {
      clearTimeout(t)
      fire()
    }
  } catch {
    // Never let tracking break the page.
  }
  flush()
}

function send(body: string): void {
  const url = `${API_URL}/public/pulse`
  try {
    // sendBeacon survives unload; it returns false when the browser won't queue it.
    if (typeof navigator.sendBeacon === 'function'
      && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return
  } catch {
    // Fall through to fetch.
  }
  try {
    void fetch(url, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Never let tracking break the page.
  }
}

function init(): void {
  if (ready) return
  ready = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAll()
  })
  window.addEventListener('pagehide', flushAll)
}

// ── Events ──

function makeEvent(name: PulseEventName, props: object | undefined, where: Where): WireEvent {
  const x = cleanProps(props)
  return { id: uuid(), n: name, t: Date.now(), ...where, ...(x ? { x } : {}) }
}

function here(): Where {
  const { pathname, host } = window.location
  const ps = partnerSlug(pathname)
  return { p: pathname.slice(0, 512), h: host.slice(0, 255), ...(ps ? { ps: ps.slice(0, 80) } : {}) }
}

/** Drop empties and malformed ids, cut strings to their contract length. */
function cleanProps(props?: object): Record<string, unknown> | undefined {
  if (!props) return undefined
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === '') continue
    if (typeof v === 'string') {
      if (UUID_KEYS.has(k) && !UUID_RE.test(v)) continue
      out[k] = v.slice(0, MAX_LEN[k] ?? 80)
    } else if (typeof v === 'number') {
      // The catalog's numbers are `pos` (0..1000) and `stars` (1..5): ints in 0..1000.
      if (Number.isFinite(v)) out[k] = Math.min(1000, Math.max(0, Math.round(v)))
    } else if (typeof v === 'boolean') {
      out[k] = v
    }
  }
  return Object.keys(out).length ? out : undefined
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

// ── Visitor + session ──

function visitorId(): string {
  const stored = read(VID_KEY)
  if (stored && UUID_RE.test(stored)) return stored
  memVid ??= uuid()
  write(VID_KEY, memVid)
  return memVid
}

/** The current session, rotated after 30 idle minutes; marks this moment as activity. */
function touchSession(): Session {
  const now = Date.now()
  let sess = parseSession(read(SESSION_KEY)) ?? memSession
  if (!sess || now - sess.last > SESSION_IDLE_MS) sess = { id: uuid(), last: now, s: context() }
  sess.last = now
  memSession = sess
  write(SESSION_KEY, JSON.stringify(sess))
  return sess
}

function parseSession(raw: string | null): Session | null {
  try {
    const v = raw ? (JSON.parse(raw) as Session) : null
    return v && UUID_RE.test(v.id) && typeof v.last === 'number' && v.s && typeof v.s === 'object' ? v : null
  } catch {
    return null
  }
}

/** Where this visit came from — captured once, at the session's first event. */
function context(): SessionContext {
  const { pathname, search, host } = window.location
  const params = new URLSearchParams(search)
  const utm: Partial<Record<UtmKey, string>> = {}
  for (const k of ['source', 'medium', 'campaign', 'content', 'term'] as const) {
    const v = params.get(`utm_${k}`)?.trim()
    if (v) utm[k] = v.slice(0, 120)
  }
  return {
    ref: (document.referrer || '').slice(0, 1024),
    lp: (pathname + search).slice(0, 512),
    lh: host.slice(0, 255),
    ...(Object.keys(utm).length ? { utm } : {}),
    lang: (navigator.language || '').slice(0, 35),
    sw: screenSize(window.screen?.width),
    sh: screenSize(window.screen?.height),
  }
}

function screenSize(n: unknown): number {
  return typeof n === 'number' && Number.isFinite(n) ? Math.min(100_000, Math.max(0, Math.round(n))) : 0
}

/** `?internal=1` flags this device as staff for good (contract §6). */
function noteStaffParam(): void {
  if (staffUrl || new URLSearchParams(window.location.search).get('internal') !== '1') return
  staffUrl = true
  write(STAFF_KEY, '1')
}

/** Staff traffic: the backoffice/console login cookie, or a device flagged via ?internal=1. */
function isInternal(): boolean {
  try {
    return staffUrl || read(STAFF_KEY) === '1' || /(?:^|;\s*)rsv_staff=1(?:;|$)/.test(document.cookie)
  } catch {
    return staffUrl
  }
}

function read(k: string): string | null {
  try {
    return window.localStorage.getItem(k)
  } catch {
    return null
  }
}

function write(k: string, v: string): void {
  try {
    window.localStorage.setItem(k, v)
  } catch {
    // Blocked storage — memory only.
  }
}

// ── Bytes ──

function uuid(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  // randomUUID needs a secure context (missing on http://192.168.x.x during
  // device testing); build an RFC 4122 v4 from random bytes instead.
  const b = randomBytes(16)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n)
  const c = globalThis.crypto
  if (typeof c?.getRandomValues === 'function') c.getRandomValues(out)
  else for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256)
  return out
}

function pulseKey(): Uint8Array {
  if (key) return key
  const custom = fromBase64url(String(import.meta.env.VITE_SITE_PULSE_KEY ?? ''))
  key = custom?.length === 32 ? custom : fromBase64url(DEFAULT_KEY)!
  return key
}

function fromBase64url(s: string): Uint8Array | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
  } catch {
    return null
  }
}

const B64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** base64url without padding (contract §1). */
function toBase64url(bytes: Uint8Array): string {
  let out = ''
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    out += B64URL[n >> 18] + B64URL[(n >> 12) & 63] + B64URL[(n >> 6) & 63] + B64URL[n & 63]
  }
  if (i < bytes.length) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8)
    out += B64URL[n >> 18] + B64URL[(n >> 12) & 63]
    if (i + 1 < bytes.length) out += B64URL[(n >> 6) & 63]
  }
  return out
}
