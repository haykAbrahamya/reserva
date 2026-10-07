// ─────────────────────────────────────────────────────────────
// Date ranges for the analytics screens.
//
// The API buckets by Asia/Yerevan calendar day, so the presets must be counted
// in Yerevan days too — not in the browser's zone. A colleague abroad (or a
// laptop still on UTC) would otherwise ask for a window that starts or ends a
// day off from the one the numbers are bucketed in.
//
// Dates travel as 'YYYY-MM-DD' strings and all arithmetic is done on UTC
// midnights, which have no DST and no local-zone surprises.
// ─────────────────────────────────────────────────────────────

export type PresetKey = 'today' | '7d' | '30d' | '90d' | 'all'
export type RangeKey = PresetKey | 'custom'

/** The API's longest window (contract §8): three years. */
export const MAX_RANGE_DAYS = 1096

export const RANGE_PRESETS: { key: PresetKey; label: string; days: number | null }[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  // Starts at the first recorded event — known only once `bounds` answers.
  { key: 'all', label: 'All', days: null },
]

export const DEFAULT_RANGE: PresetKey = '30d'

export type RangeSelection = { key: PresetKey } | { key: 'custom'; from: string; to: string }

export function isPresetKey(v: string | null): v is PresetKey {
  return RANGE_PRESETS.some((p) => p.key === v)
}

/** Today's date on the Yerevan calendar, as 'YYYY-MM-DD'. */
export function yerevanToday(now: Date = new Date()): string {
  // formatToParts rather than relying on a locale that happens to print ISO order.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Yerevan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function toUtc(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** A real calendar day in 'YYYY-MM-DD' (rejects 2026-02-31 and friends). */
export function isYmd(v: string | null | undefined): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  return toUtc(v).toISOString().slice(0, 10) === v
}

export function addDays(ymd: string, n: number): string {
  const d = toUtc(ymd)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Both ends counted: 1 Oct → 7 Oct is 7 days. */
export function daysInclusive(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000) + 1
}

/** Monday on or before `ymd` — weeks start on Monday here, as in the calendar. */
export function startOfWeek(ymd: string): string {
  return addDays(ymd, -((toUtc(ymd).getUTCDay() + 6) % 7))
}

export function startOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`
}

/** Last day of the month `ymd` falls in. */
export function endOfMonth(ymd: string): string {
  const d = toUtc(startOfMonth(ymd))
  d.setUTCMonth(d.getUTCMonth() + 1, 0)
  return d.toISOString().slice(0, 10)
}

/** Why a hand-picked range can't be used, or null when it can. */
export function customRangeError(
  from: string,
  to: string,
  limits: { min?: string | null; max: string },
): string | null {
  if (!from || !to) return 'Pick both a start and an end date.'
  if (!isYmd(from) || !isYmd(to)) return 'That isn’t a valid date.'
  if (from > to) return 'The start date must be on or before the end date.'
  if (to > limits.max) return 'The end date can’t be in the future.'
  if (limits.min && from < limits.min) return `Data starts on ${fmtSpan(limits.min, limits.min)}.`
  if (daysInclusive(from, to) > MAX_RANGE_DAYS) return 'A range can span at most 1,096 days (3 years).'
  return null
}

export interface ResolvedRange {
  key: RangeKey
  from: string
  to: string
  days: number
  /** The equally long window right before `from` — what every delta compares to. */
  prevFrom: string
  prevTo: string
  /** False for All: there is no "previous period" before all time. */
  comparable: boolean
  /** The window's last day is today, so it is still filling up. */
  endsToday: boolean
}

/**
 * A selection as concrete inclusive dates.
 *
 * `first` is the first recorded event day for All: null when nothing has been
 * recorded yet (All is then just today), undefined when it could not be loaded
 * — All then falls back to the longest window the API allows, which still
 * holds everything there is.
 */
export function resolveRange(sel: RangeSelection, today: string, first?: string | null): ResolvedRange {
  let from: string
  let to = today
  if (sel.key === 'custom') {
    // A link can name days that haven't happened yet; they hold no data, and
    // would only draw a cliff at the end of the chart.
    to = sel.to > today ? today : sel.to
    from = sel.from > to ? to : sel.from
  } else if (sel.key === 'all') {
    const earliest = addDays(today, -(MAX_RANGE_DAYS - 1))
    from = first === undefined ? earliest : first ?? today
    // Never past today (clock skew) and never longer than the API accepts.
    if (from > today) from = today
    if (from < earliest) from = earliest
  } else {
    const days = RANGE_PRESETS.find((p) => p.key === sel.key)?.days ?? 30
    from = addDays(today, -(days - 1))
  }
  const days = daysInclusive(from, to)
  return {
    key: sel.key,
    from,
    to,
    days,
    prevFrom: addDays(from, -days),
    prevTo: addDays(from, -1),
    comparable: sel.key !== 'all',
    endsToday: to === today,
  }
}

const DAY_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const DAY_YEAR_FMT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const WEEKDAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const MONTH_FMT = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })
const MONTH_YEAR_FMT = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** '7 Oct' — axis labels. */
export function fmtDay(ymd: string): string {
  return DAY_FMT.format(toUtc(ymd))
}

/** 'Tue, 7 Oct 2026' — the chart tooltip. */
export function fmtDayLong(ymd: string): string {
  return WEEKDAY_FMT.format(toUtc(ymd))
}

/** "Oct ’25" — month axis labels; the short year keeps multi-year axes unambiguous. */
export function fmtMonthShort(ymd: string): string {
  return `${MONTH_FMT.format(toUtc(ymd))} ’${ymd.slice(2, 4)}`
}

/** 'October 2026'. */
export function fmtMonthLong(ymd: string): string {
  return MONTH_YEAR_FMT.format(toUtc(ymd))
}

/**
 * '1–7 Oct 2026', '8 Sep – 7 Oct 2026', '28 Dec 2025 – 3 Jan 2026', or a single
 * day. Each part is said once, at the widest level the two ends share.
 */
export function fmtSpan(from: string, to: string): string {
  if (from === to) return DAY_YEAR_FMT.format(toUtc(to))
  if (from.slice(0, 4) !== to.slice(0, 4)) {
    return `${DAY_YEAR_FMT.format(toUtc(from))} – ${DAY_YEAR_FMT.format(toUtc(to))}`
  }
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${Number(from.slice(8, 10))}–${DAY_YEAR_FMT.format(toUtc(to))}`
  }
  return `${DAY_FMT.format(toUtc(from))} – ${DAY_YEAR_FMT.format(toUtc(to))}`
}

/** 'the previous 30 days' / 'the previous day' — how a delta names its baseline. */
export function prevPeriodName(days: number): string {
  return days === 1 ? 'the previous day' : `the previous ${days} days`
}
