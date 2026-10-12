// ─────────────────────────────────────────────────────────────
// Site analytics v1 ("pulse") — the browser half, shared by every Reserva site
// that reports to POST /public/pulse: reserva.am with its partner pages, and
// tools.reserva.am. Each site wraps it with its own event catalog.
//
// Call sites fire tiny events; they queue up and leave in batches, each batch
// sealed as
//   UTF-8 JSON → 0x01 | nonce(12) | ChaCha20-Poly1305(key, nonce, AAD) → base64url
// and sent as text/plain — a CORS "simple request" (no preflight) that
// navigator.sendBeacon can carry cross-origin (*.reserva.am → api.reserva.am).
// The key ships in the bundle, so the seal is tamper rejection and
// obfuscation, not secrecy: the server validates everything it receives.
//
// Privacy: ids (uuids) and short strings only — never names, phones, emails or
// form values. Like the page it measures, it must never throw or block render.
// ─────────────────────────────────────────────────────────────

import { chacha20poly1305 } from '@noble/ciphers/chacha.js'

/** Contract key K1 (base64url, 32 bytes); a site's VITE_SITE_PULSE_KEY overrides it. */
export const DEFAULT_PULSE_KEY = 'gHGgXRZFRUzCXtcUn1UiOQdJI4F_7Hfb_PeG0HjYdz4'
/** Wire version byte — tells the server which key sealed the batch. */
const VERSION = 0x01
const AAD = 'reserva.pulse.v1'

/** Server limit per request. */
const MAX_BATCH = 25
/** The longest an event waits for company before it is sent. */
const FLUSH_MS = 4_000
/** A visit ends after this long without an event (GA-style 30 minutes). */
const SESSION_IDLE_MS = 30 * 60_000

const VID_KEY = 'rsv.vid'
const SESSION_KEY = 'rsv.session'
const STAFF_KEY = 'rsv.staff'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Which Reserva site reports. The main site — reserva.am and its partner pages — names none. */
export type PulseSite = 'tools'

/** Where an event happened: path, host and — on a partner page — the partner slug. */
export interface Where {
  p: string
  h: string
  ps?: string
}

export interface PulseOptions {
  /** The API base, e.g. https://api.reserva.am/api/v1. */
  apiUrl: string
  /** A VITE_SITE_PULSE_KEY override; anything but 32 base64url bytes falls back to the contract key. */
  key?: string
  site?: PulseSite
  /** Where an event happened. Default: this page's path and host. */
  where?: () => Where
  /** Props that carry uuids: a malformed one is dropped so it can't cost the whole event. */
  uuidKeys?: ReadonlySet<string>
  /** Contract length limits per prop — cut here rather than have the server drop the event. Default 80. */
  maxLen?: Readonly<Record<string, number>>
  /** Events sent at once instead of waiting for company: taps that hand the phone to another app. */
  urgent?: ReadonlySet<string>
  /** Runs right before everything is sent on the way out (hidden or closed page). */
  beforeLeave?: () => void
}

export interface Pulse {
  /** Queue one event; `where` pins it to a place other than the current page. Never throws. */
  record(name: string, props?: object, where?: Where): void
  /** The current page, the way `where` describes it. */
  here(): Where
}

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

interface WireEvent extends Where {
  id: string
  n: string
  t: number
  x?: Record<string, unknown>
}

/**
 * One site's tracker. Creating it touches nothing — no storage, no listeners —
 * so it is safe at module level of code that also runs during prerender; all
 * of that waits for the first event in a browser.
 */
export function createPulse(options: PulseOptions): Pulse {
  const where = options.where ?? defaultWhere
  const uuidKeys = options.uuidKeys ?? new Set<string>()
  const maxLen = options.maxLen ?? {}
  const urgent = options.urgent ?? new Set<string>()

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
  let key: Uint8Array | null = null

  function record(name: string, props?: object, at?: Where): void {
    try {
      if (typeof window === 'undefined') return
      init()
      noteStaffParam()
      const sess = touchSession()
      if (queue.length && queued?.id !== sess.id) flush()
      queued = sess
      queue.push(makeEvent(name, props, at ?? where()))

      if (queue.length >= MAX_BATCH || urgent.has(name)) flush()
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
      const s = {
        ...sess.s,
        ...(options.site ? { site: options.site } : {}),
        ...(isInternal() ? { int: true } : {}),
      }
      while (queue.length) {
        const e = queue.splice(0, MAX_BATCH)
        send(sealPulse(JSON.stringify({ v: 1, sid: sess.id, vid, s, e }), randomBytes(12), pulseKey()))
      }
    } catch {
      queue = []
    }
  }

  /** Hidden/closing is the last reliable moment on mobile: send everything now. */
  function flushAll(): void {
    try {
      options.beforeLeave?.()
    } catch {
      // Never let tracking break the page.
    }
    flush()
  }

  function send(body: string): void {
    const url = `${options.apiUrl}/public/pulse`
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

  function makeEvent(name: string, props: object | undefined, at: Where): WireEvent {
    const x = cleanProps(props)
    return { id: uuid(), n: name, t: Date.now(), ...at, ...(x ? { x } : {}) }
  }

  /** Drop empties and malformed ids, cut strings to their contract length. */
  function cleanProps(props?: object): Record<string, unknown> | undefined {
    if (!props) return undefined
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === '') continue
      if (typeof v === 'string') {
        if (uuidKeys.has(k) && !UUID_RE.test(v)) continue
        out[k] = v.slice(0, maxLen[k] ?? 80)
      } else if (typeof v === 'number') {
        // Catalog numbers are small counts, positions and ratings: ints in 0..1000.
        if (Number.isFinite(v)) out[k] = Math.min(1000, Math.max(0, Math.round(v)))
      } else if (typeof v === 'boolean') {
        out[k] = v
      }
    }
    return Object.keys(out).length ? out : undefined
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

  function pulseKey(): Uint8Array {
    if (key) return key
    const custom = fromBase64url(String(options.key ?? ''))
    key = custom?.length === 32 ? custom : fromBase64url(DEFAULT_PULSE_KEY)!
    return key
  }

  return { record, here: () => where() }
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
export function sealPulse(
  json: string,
  nonce: Uint8Array = randomBytes(12),
  keyBytes: Uint8Array = fromBase64url(DEFAULT_PULSE_KEY)!,
): string {
  const utf8 = new TextEncoder()
  const sealed = chacha20poly1305(keyBytes, nonce, utf8.encode(AAD)).encrypt(utf8.encode(json))
  const out = new Uint8Array(1 + nonce.length + sealed.length)
  out[0] = VERSION
  out.set(nonce, 1)
  out.set(sealed, 1 + nonce.length)
  return toBase64url(out)
}

function defaultWhere(): Where {
  const { pathname, host } = window.location
  return { p: pathname.slice(0, 512), h: host.slice(0, 255) }
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
