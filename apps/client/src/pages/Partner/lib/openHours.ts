import type { WeekSchedule, WorkingDay } from '@reserva/shared'

/**
 * "Open now / opens at …" for weekly hours — a branch's opening hours or a
 * specialist's working week. Evaluated in the visitor's local time, like the
 * salon list's open status (salons and visitors are both in Yerevan).
 */

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export const WEEK: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** JS getDay() (0 = Sunday) → our Monday-first key. */
export const dayKeyOf = (d: Date): DayKey => WEEK[(d.getDay() + 6) % 7]
/** The key of the day after `day`. */
export const nextDayKey = (day: DayKey): DayKey => WEEK[(WEEK.indexOf(day) + 1) % 7]

/** One stretch of a week. An `end` at or before `start` closes after midnight. */
export interface WeekWindow {
  day: DayKey
  start: string
  end: string
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** [start, end) on the window's own day; `end` passes 1440 for an overnight shift. */
function span(w: WeekWindow): [number, number] {
  const start = toMin(w.start)
  let end = toMin(w.end)
  if (end <= start) end += 1440
  return [start, end]
}

export interface WeekState<W extends WeekWindow> {
  /** Inside a window right now. */
  open: boolean
  /** The window we're in, or the next one to start. */
  window?: W
  /** When `window` starts on a later day: that day. Undefined = today (or open now). */
  day?: DayKey
}

/**
 * Where a week of windows stands at `now`: inside one (open until its end — an
 * overnight window still counts in the small hours of the next day), or which
 * one starts next. Null when there are no windows at all.
 */
export function weekState<W extends WeekWindow>(windows: W[], now: Date = new Date()): WeekState<W> | null {
  if (!windows.length) return null
  const today = dayKeyOf(now)
  const yesterday = WEEK[(WEEK.indexOf(today) + 6) % 7]
  const nowMin = now.getHours() * 60 + now.getMinutes()

  for (const w of windows) {
    const [start, end] = span(w)
    if (w.day === yesterday && end > 1440 && nowMin < end - 1440) return { open: true, window: w }
    if (w.day === today && start <= nowMin && nowMin < end) return { open: true, window: w }
  }
  // The next start: later today, then the following days (up to the same
  // weekday next week, for a schedule that only has today).
  for (let i = 0; i <= 7; i++) {
    const day = WEEK[(WEEK.indexOf(today) + i) % 7]
    const next = windows
      .filter((w) => w.day === day && (i > 0 || toMin(w.start) > nowMin))
      .sort((a, b) => toMin(a.start) - toMin(b.start))[0]
    if (next) return { open: false, window: next, day: i === 0 ? undefined : day }
  }
  return { open: false }
}

/** A location's opening hours as windows (enabled days only). */
export function windowsOfHours(hours: WeekSchedule | null | undefined): WeekWindow[] {
  if (!hours) return []
  return WEEK.flatMap((day) => {
    const d = hours[day] as WorkingDay | undefined
    return d?.enabled ? [{ day, start: d.start, end: d.end }] : []
  })
}
