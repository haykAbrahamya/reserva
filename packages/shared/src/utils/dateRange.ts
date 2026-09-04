import { fmtDateInput } from './format'

/**
 * Quick date-range presets, as pure functions over "today".
 *
 * The set is deliberately BIDIRECTIONAL, which is the whole design decision
 * here. Every reporting UI ships "last 7 / last 30 days" because reports look
 * backwards — but a bookings list is not a report. A salon owner opening it
 * mostly wants to know who is coming, not who came: today, tomorrow, the week
 * ahead. Offering only backward ranges would answer the rarer question well and
 * the common one not at all, so the presets are grouped into UPCOMING and PAST
 * and the upcoming ones come first.
 *
 * Ranges are inclusive at both ends and expressed as 'YYYY-MM-DD', matching the
 * `from`/`to` query params the list endpoint already takes — so a preset is
 * indistinguishable from a hand-picked range to everything downstream, and a
 * preset selection stays shareable as a URL.
 */

export type DateRangePresetKey =
  | 'today'
  | 'tomorrow'
  | 'next7'
  | 'thisWeek'
  | 'thisMonth'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'lastMonth'

export interface DateRangeValue {
  from: string
  to: string
}

/**
 * Display order, and therefore MATCH order — see `matchDateRangePreset`. Two
 * groups rather than one long list: nine flat options is a wall, and the
 * upcoming/past split is the distinction a reader actually navigates by.
 */
export const DATE_RANGE_GROUPS: readonly {
  key: 'upcoming' | 'past'
  presets: readonly DateRangePresetKey[]
}[] = [
  { key: 'upcoming', presets: ['today', 'tomorrow', 'next7', 'thisWeek', 'thisMonth'] },
  { key: 'past', presets: ['yesterday', 'last7', 'last30', 'lastMonth'] },
]

/** Flattened, in display order. */
export const DATE_RANGE_PRESETS: readonly DateRangePresetKey[] = DATE_RANGE_GROUPS.flatMap(
  (g) => g.presets,
)

/** Midnight local, so day arithmetic never straddles a DST boundary. */
function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

function addDays(d: Date, days: number): Date {
  const out = startOfDay(d)
  // setDate handles month and year rollover, and every DST shift, for free.
  out.setDate(out.getDate() + days)
  return out
}

/** Monday, matching the calendar grid — which is Mon-first everywhere here. */
function startOfWeek(d: Date): Date {
  const out = startOfDay(d)
  const mondayOffset = (out.getDay() + 6) % 7
  out.setDate(out.getDate() - mondayOffset)
  return out
}

/** Day 0 of the next month is the last day of this one, whatever its length. */
function endOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

function startOfMonth(d: Date): Date {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1))
}

function range(from: Date, to: Date): DateRangeValue {
  return { from: fmtDateInput(from), to: fmtDateInput(to) }
}

/**
 * The inclusive range a preset covers, relative to `now`.
 *
 * `now` is injectable so this is testable and so a caller can keep a rendered
 * list stable across midnight rather than having labels silently change meaning
 * mid-session.
 */
export function dateRangeForPreset(key: DateRangePresetKey, now: Date = new Date()): DateRangeValue {
  const today = startOfDay(now)

  switch (key) {
    case 'today':
      return range(today, today)
    case 'tomorrow':
      return range(addDays(today, 1), addDays(today, 1))
    // Inclusive of today, so "next 7 days" really is seven days, not eight.
    case 'next7':
      return range(today, addDays(today, 6))
    case 'thisWeek':
      return range(startOfWeek(today), addDays(startOfWeek(today), 6))
    case 'thisMonth':
      return range(startOfMonth(today), endOfMonth(today))
    case 'yesterday':
      return range(addDays(today, -1), addDays(today, -1))
    case 'last7':
      return range(addDays(today, -6), today)
    case 'last30':
      return range(addDays(today, -29), today)
    case 'lastMonth': {
      const inLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return range(startOfMonth(inLastMonth), endOfMonth(inLastMonth))
    }
  }
}

/**
 * Which preset — if any — a from/to pair currently expresses.
 *
 * This is what keeps the control honest in BOTH directions: a range typed by
 * hand, restored from a URL, or arrived at by deep link lights up its preset
 * instead of reading "Custom", and a preset that has drifted out of date (a tab
 * left open overnight) correctly stops matching. Without it the label would be
 * a claim about the last button pressed rather than about the current filter.
 *
 * First match in display order wins, which matters because presets legitimately
 * coincide — on a Monday, "Next 7 days" and "This week" are the same seven days
 * — and the label should then agree with the option listed first.
 */
export function matchDateRangePreset(
  from: string,
  to: string,
  now: Date = new Date(),
): DateRangePresetKey | null {
  if (!from || !to) return null
  for (const key of DATE_RANGE_PRESETS) {
    const r = dateRangeForPreset(key, now)
    if (r.from === from && r.to === to) return key
  }
  return null
}
