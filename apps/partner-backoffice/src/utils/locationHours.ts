import type { WeekSchedule, WorkingDay } from '@/types'

/** Weekday order used across the app (Mon-first). */
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type DayKey = (typeof DAY_KEYS)[number]

const DAY: WorkingDay = { enabled: true, start: '10:00', end: '19:00' }

/** Every day 10:00–19:00. */
export function everyDaySchedule(start = '10:00', end = '19:00'): WeekSchedule {
  return Object.fromEntries(
    DAY_KEYS.map(k => [k, { enabled: true, start, end }]),
  ) as WeekSchedule
}

/** Every day except the last day of the week (Sunday) — Mon–Sat 10:00–19:00. */
export function exceptSundaySchedule(start = '10:00', end = '19:00'): WeekSchedule {
  return Object.fromEntries(
    DAY_KEYS.map(k => [k, { enabled: k !== 'sun', start, end }]),
  ) as WeekSchedule
}

/** Default schedule used when a location has no hours yet. */
export const DEFAULT_LOCATION_HOURS: WeekSchedule = everyDaySchedule()

export function dayOf(schedule: WeekSchedule | undefined, key: DayKey): WorkingDay {
  return schedule?.[key] ?? { ...DAY, enabled: false }
}

/**
 * Compact, human-readable summary of a week schedule, grouping consecutive
 * days that share the same hours. `dayLabel` localizes a day key.
 *
 *   Mon–Sat · 10:00–19:00
 *   Mon–Fri · 09:00–18:00, Sat · 10:00–14:00
 *   Closed (no open days)
 */
export function summarizeHours(
  schedule: WeekSchedule | undefined,
  dayLabel: (key: DayKey) => string,
  closedLabel: string,
): string {
  if (!schedule) return ''
  const open = DAY_KEYS.filter(k => schedule[k]?.enabled)
  if (open.length === 0) return closedLabel

  // Build runs of consecutive (in DAY_KEYS order) days with identical hours.
  const runs: { days: DayKey[]; start: string; end: string }[] = []
  for (const k of DAY_KEYS) {
    const d = schedule[k]
    if (!d?.enabled) continue
    const last = runs[runs.length - 1]
    const contiguous = last && DAY_KEYS.indexOf(k) === DAY_KEYS.indexOf(last.days[last.days.length - 1]) + 1
    if (last && contiguous && last.start === d.start && last.end === d.end) {
      last.days.push(k)
    } else {
      runs.push({ days: [k], start: d.start, end: d.end })
    }
  }

  return runs
    .map(r => {
      const span = r.days.length === 1
        ? dayLabel(r.days[0])
        : `${dayLabel(r.days[0])}–${dayLabel(r.days[r.days.length - 1])}`
      return `${span} · ${r.start}–${r.end}`
    })
    .join(', ')
}
