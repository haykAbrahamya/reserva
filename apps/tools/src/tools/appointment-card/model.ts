import { isDay } from '@/lib/dates'
import { asRecord, readText } from '@/lib/storage'

export interface Appointment {
  /** The salon or specialist the client is visiting. */
  salon: string
  service: string
  /** 'YYYY-MM-DD'. */
  date: string
  /** 'HH:MM', salon time (Yerevan). */
  time: string
  /** Minutes — the calendar event's length. */
  duration: number
  address: string
  phone: string
  /** "Please come 5 minutes early." */
  note: string
}

export const LIMITS = {
  salon: 60,
  service: 80,
  address: 120,
  phone: 24,
  note: 160,
} as const

/** The durations offered, in minutes. */
export const DURATIONS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240] as const

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/
export const isTime = (value: unknown): value is string => typeof value === 'string' && TIME.test(value)
export const isDuration = (value: unknown): value is number =>
  typeof value === 'number' && (DURATIONS as readonly number[]).includes(value)

/** Enough to send: a card without a day, a time or a salon tells the client nothing. */
export function isComplete(visit: Appointment): boolean {
  return Boolean(visit.salon.trim() && isDay(visit.date) && isTime(visit.time))
}

/** "15:00" + 90 → "16:30" (wrapping past midnight). */
export function endTime(time: string, duration: number): string {
  const [h, m] = time.split(':').map(Number)
  const minutes = (h * 60 + m + duration) % (24 * 60)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/** Field-by-field check of untrusted data — a stored draft or a decoded link. */
export function parseAppointment(value: unknown): Appointment | null {
  const stored = asRecord(value)
  if (!stored) return null
  return {
    salon: readText(stored.salon, LIMITS.salon),
    service: readText(stored.service, LIMITS.service),
    date: isDay(stored.date) ? stored.date : '',
    time: isTime(stored.time) ? stored.time : '',
    duration: isDuration(stored.duration) ? stored.duration : 60,
    address: readText(stored.address, LIMITS.address),
    phone: readText(stored.phone, LIMITS.phone),
    note: readText(stored.note, LIMITS.note),
  }
}
