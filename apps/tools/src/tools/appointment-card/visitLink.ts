import type { IcsEvent } from '@reserva/shared'
import { LOCALES, type Locale } from '@/i18n'
import { fromBase64Url, toBase64Url } from '@/lib/base64url'
import { parseAppointment, type Appointment } from './model'

// ─────────────────────────────────────────────────────────────
// The appointment card's link. The whole visit travels INSIDE the link, after
// the '#': the fragment is never sent to any server, so a client's visit is
// not stored anywhere — the card page reads it straight from the address bar.
//
// Not secret: anyone holding the link can read it, exactly like the message
// it is sent in.
// ─────────────────────────────────────────────────────────────

export const VISIT_PATH = '/visit'

/** Bump when the layout of the payload changes; old links then read as invalid, not as garbage. */
const VERSION = 1

export interface Visit extends Appointment {
  /** The language the card was made in — the client sees it in that one unless they chose another. */
  locale: Locale
}

/** The visit as a compact array, UTF-8, base64url — short enough for a messenger. */
export function encodeVisit(visit: Visit): string {
  const payload = [
    VERSION,
    visit.locale,
    visit.salon.trim(),
    visit.service.trim(),
    visit.date,
    visit.time,
    visit.duration,
    visit.address.trim(),
    visit.phone.trim(),
    visit.note.trim(),
  ]
  return toBase64Url(new TextEncoder().encode(JSON.stringify(payload)))
}

/** The visit in a link's fragment, or null when it is missing, cut short or tampered with. */
export function decodeVisit(code: string): Visit | null {
  try {
    const payload: unknown = JSON.parse(new TextDecoder().decode(fromBase64Url(code)))
    if (!Array.isArray(payload) || payload[0] !== VERSION) return null
    const [, locale, salon, service, date, time, duration, address, phone, note] = payload
    const visit = parseAppointment({ salon, service, date, time, duration, address, phone, note })
    if (!visit || !visit.salon || !visit.date || !visit.time) return null
    return { ...visit, locale: (LOCALES as readonly string[]).includes(locale) ? (locale as Locale) : 'hy' }
  } catch {
    return null
  }
}

export function visitUrl(visit: Visit): string {
  return `${window.location.origin}${VISIT_PATH}#${encodeVisit(visit)}`
}

/** Salon time is Yerevan time: UTC+4 all year (Armenia has kept no DST since 2012). */
function salonInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+04:00`)
}

/** A small stable hash, so adding the same card twice updates one calendar event. */
function hash(text: string): string {
  let h = 5381
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function visitEvent(visit: Visit): IcsEvent {
  const start = salonInstant(visit.date, visit.time)
  return {
    uid: `visit-${hash(encodeVisit(visit))}`,
    start,
    end: new Date(start.getTime() + visit.duration * 60_000),
    title: visit.service.trim() ? `${visit.service.trim()} · ${visit.salon.trim()}` : visit.salon.trim(),
    description: [visit.note.trim(), visit.phone.trim()].filter(Boolean).join('\n'),
    location: visit.address.trim() || undefined,
    organizer: visit.salon.trim(),
  }
}

/** Has the visit's start already passed? */
export function isPast(visit: Visit): boolean {
  return salonInstant(visit.date, visit.time).getTime() < Date.now()
}

export const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

export const telUrl = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

export const whatsAppShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

/** Viber's own forward screen — opens the app on a phone with Viber installed. */
export const viberShareUrl = (text: string) => `viber://forward?text=${encodeURIComponent(text)}`
