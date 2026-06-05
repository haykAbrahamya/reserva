import type { Booking, SpecialistTimeOff } from '@/types'

/**
 * Pure helpers for reasoning about specialist time-off. Shared by the Hours
 * page (conflict detection), the Calendar (off-bands + flagged bookings) and
 * the booking flow (blocking new bookings). No I/O — just date math.
 */

/** Two [startMs, endMs) intervals overlap if each starts before the other ends. */
export function intervalsOverlap(
  aStart: number, aEnd: number, bStart: number, bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Does a booking fall (even partly) inside a time-off window? */
export function bookingHitsTimeOff(booking: Booking, off: SpecialistTimeOff): boolean {
  if (booking.specialistId !== off.specialistId) return false
  // Cancelled / no-show bookings don't count as real conflicts.
  if (booking.status === 'cancelled' || booking.status === 'noshow') return false
  return intervalsOverlap(
    new Date(booking.startISO).getTime(), new Date(booking.endISO).getTime(),
    new Date(off.startISO).getTime(),     new Date(off.endISO).getTime(),
  )
}

/**
 * Active (non-cancelled) bookings overlapping a prospective time-off window,
 * sorted by start time. This powers the manager confirmation dialog.
 */
export function findConflictingBookings(
  bookings: Booking[],
  specialistId: string,
  startISO: string,
  endISO: string,
): Booking[] {
  const probe: SpecialistTimeOff = { id: '', specialistId, startISO, endISO, allDay: false }
  return bookings
    .filter(b => bookingHitsTimeOff(b, probe))
    .sort((a, b) => a.startISO.localeCompare(b.startISO))
}

/** Is a specific booking in conflict with ANY of the given time-off entries? */
export function isBookingInAnyTimeOff(booking: Booking, offs: SpecialistTimeOff[]): boolean {
  return offs.some(off => bookingHitsTimeOff(booking, off))
}

/**
 * For a given calendar day, the time-off windows (in minutes-from-midnight)
 * that intersect that day — clamped to [0, 1440]. Used to paint off-bands on
 * the day/week grid. A multi-day entry yields a full 0–1440 band on inner days.
 */
export function offBandsForDay(
  offs: SpecialistTimeOff[],
  day: Date,
): { startMin: number; endMin: number; off: SpecialistTimeOff }[] {
  const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1)
  const dayStartMs = dayStart.getTime()
  const dayEndMs = dayEnd.getTime()

  const bands: { startMin: number; endMin: number; off: SpecialistTimeOff }[] = []
  for (const off of offs) {
    const s = new Date(off.startISO).getTime()
    const e = new Date(off.endISO).getTime()
    if (!intervalsOverlap(s, e, dayStartMs, dayEndMs)) continue
    const clampedStart = Math.max(s, dayStartMs)
    const clampedEnd = Math.min(e, dayEndMs)
    bands.push({
      startMin: Math.round((clampedStart - dayStartMs) / 60000),
      endMin: Math.round((clampedEnd - dayStartMs) / 60000),
      off,
    })
  }
  return bands
}

/** Does a prospective booking slot land inside any of the time-off windows? */
export function slotBlockedByTimeOff(
  offs: SpecialistTimeOff[],
  specialistId: string,
  slotStartMs: number,
  slotEndMs: number,
): boolean {
  return offs.some(off =>
    off.specialistId === specialistId &&
    intervalsOverlap(
      slotStartMs, slotEndMs,
      new Date(off.startISO).getTime(), new Date(off.endISO).getTime(),
    )
  )
}
