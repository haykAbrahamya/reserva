import type { Kpi } from '@/services/analytics.service'
import { humanize } from './catalog'

const INT = new Intl.NumberFormat('en-GB')
const ONE_DECIMAL = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 12,480 */
export function fmtInt(n: number): string {
  return INT.format(n)
}

/** A ratio (0.042) as '4.2%'. Null — no denominator — reads as a dash. */
export function fmtPct(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—'
  return `${ONE_DECIMAL.format(ratio * 100)}%`
}

/** 12,960,000 → '12.4 MB'. Binary units, as Postgres's own pg_size_pretty. */
export function fmtBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${fmtInt(Math.max(0, Math.round(bytes || 0)))} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = bytes / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${ONE_DECIMAL.format(v)} ${units[i]}`
}

/** Seconds as a clock: '0:42', '12:05', '1:02:03'. */
export function fmtDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Share of a total, or a dash when there is nothing to share. */
export function fmtShare(part: number, total: number): string {
  return total > 0 ? fmtPct(part / total) : '—'
}

export type DeltaDir = 'up' | 'down' | 'flat' | 'new'

/**
 * Change against the previous period. `text` carries no arrow — the chip adds
 * the glyph, so the number and the direction can be styled apart.
 *
 * A zero baseline has no percentage: anything over nothing is not "+∞%", it is
 * simply new — and nothing over nothing is not a change, just a dash.
 */
export function kpiDelta({ value, prev }: Kpi): { dir: DeltaDir; text: string } {
  if (prev === 0) return value === 0 ? { dir: 'flat', text: '—' } : { dir: 'new', text: 'new' }
  const change = (value - prev) / prev
  // Below what one decimal can show, call it flat rather than "▲ 0.0%".
  if (Math.abs(change) < 0.0005) return { dir: 'flat', text: '0%' }
  return { dir: change > 0 ? 'up' : 'down', text: fmtPct(Math.abs(change)) }
}

const REGION = safeDisplayNames('region')
const LANGUAGE = safeDisplayNames('language')

function safeDisplayNames(type: 'region' | 'language'): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames(['en'], { type })
  } catch {
    return null
  }
}

/** 'AM' → 'Armenia'. Codes Intl does not know come back as-is. */
export function countryName(code: string | null | undefined): string {
  if (!code || code === 'unknown') return 'Unknown'
  try {
    return REGION?.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/** 'hy' → 'Armenian'. */
export function languageName(code: string | null | undefined): string {
  if (!code || code === 'unknown') return 'Unknown'
  try {
    return LANGUAGE?.of(code) ?? code
  } catch {
    return code
  }
}

const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Mobile',
  tablet: 'Tablet',
  desktop: 'Desktop',
  smarttv: 'Smart TV',
  console: 'Console',
  wearable: 'Wearable',
  xr: 'XR headset',
  embedded: 'Embedded',
}

export function deviceLabel(type: string | null | undefined): string {
  if (!type || type === 'unknown') return 'Unknown'
  return DEVICE_LABELS[type] ?? humanize(type)
}

const TIME = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const DAY_TIME = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const FULL = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
})

/** Seconds matter for a live log of today; older rows only need the day. */
export function fmtEventTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  return sameDay ? TIME.format(d) : DAY_TIME.format(d)
}

export function fmtEventTimeFull(iso: string): string {
  return FULL.format(new Date(iso))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v)
}
