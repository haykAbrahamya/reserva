import type { WeekSchedule, WorkingDay } from '@reserva/shared'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type DayKey = (typeof DAY_KEYS)[number]

/** Short day labels keyed by day, e.g. `{ mon: 'Mon', … }`. */
export type DayLabels = Record<DayKey, string>

// English fallback so non-localized callers keep the "Mon–Sat" convention.
const SHORT: DayLabels = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
}

/**
 * Compact, human-readable summary of a location's weekly schedule, grouping
 * consecutive days that share the same hours:
 *   Mon–Sat · 10:00–19:00
 *   Mon–Fri · 09:00–18:00, Sat · 10:00–14:00
 * Returns `closedLabel` when no days are open, and '' when there's no schedule.
 * `dayLabels` supplies localized short day names (defaults to English).
 */
export function summarizeHours(
  schedule: WeekSchedule | undefined,
  closedLabel: string,
  dayLabels: DayLabels = SHORT,
): string {
  if (!schedule) return ''
  const open = DAY_KEYS.filter((k) => schedule[k]?.enabled)
  if (open.length === 0) return closedLabel

  const runs: { days: DayKey[]; start: string; end: string }[] = []
  for (const k of DAY_KEYS) {
    const d = schedule[k] as WorkingDay | undefined
    if (!d?.enabled) continue
    const last = runs[runs.length - 1]
    const contiguous =
      last && DAY_KEYS.indexOf(k) === DAY_KEYS.indexOf(last.days[last.days.length - 1]) + 1
    if (last && contiguous && last.start === d.start && last.end === d.end) {
      last.days.push(k)
    } else {
      runs.push({ days: [k], start: d.start, end: d.end })
    }
  }

  return runs
    .map((r) => {
      const span =
        r.days.length === 1
          ? dayLabels[r.days[0]]
          : `${dayLabels[r.days[0]]}–${dayLabels[r.days[r.days.length - 1]]}`
      return `${span} · ${r.start}–${r.end}`
    })
    .join(', ')
}
