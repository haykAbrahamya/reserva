import type { WeekSchedule, WorkingDay } from '@reserva/shared'
import type { SalonCard } from '@/services/salons.service'

// JS getDay(): 0=Sun..6=Sat. Our schedule keys are mon..sun.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export interface OpenStatus {
  /** true = at least one location is open right now. */
  open: boolean
  /** When closed but opening later today / on a known next day: "HH:mm". */
  opensAt?: string
  /** Weekday KEY (mon..sun) for opensAt when it's not today; the caller
   *  localizes it. undefined = opens today. */
  opensDay?: string
  /** No usable schedule on any location → we can't say. */
  unknown: boolean
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function hasSchedule(h?: WeekSchedule): boolean {
  return !!h && ORDER.some((k) => (h[k] as WorkingDay | undefined)?.enabled)
}

/**
 * Open/closed status for a single weekly schedule, evaluated against `now` in the
 * VISITOR'S local time (salons + visitors are local, so this is the right "now";
 * computing server-side would risk timezone bugs).
 */
function statusForSchedule(h: WeekSchedule, now: Date): { open: boolean; opensAt?: string; opensDay?: string } {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const todayKey = DAY_KEYS[now.getDay()]
  const today = h[todayKey] as WorkingDay | undefined

  // Open right now?
  if (today?.enabled && toMin(today.start) <= nowMin && nowMin < toMin(today.end)) {
    return { open: true }
  }
  // Opening later today?
  if (today?.enabled && toMin(today.start) > nowMin) {
    return { open: false, opensAt: today.start }
  }
  // Next open day within the coming week.
  const todayIdx = ORDER.indexOf(todayKey as (typeof ORDER)[number])
  for (let i = 1; i <= 7; i++) {
    const key = ORDER[(todayIdx + i) % 7]
    const day = h[key] as WorkingDay | undefined
    if (day?.enabled) return { open: false, opensAt: day.start, opensDay: key }
  }
  return { open: false }
}

/**
 * Aggregate open status across all of a salon's locations: open if ANY location
 * is open; otherwise the soonest next opening among them.
 */
export function salonOpenStatus(salon: SalonCard, now: Date = new Date()): OpenStatus {
  const schedules = salon.locations.map((l) => l.hours).filter(hasSchedule) as WeekSchedule[]
  if (schedules.length === 0) return { open: false, unknown: true }

  const results = schedules.map((h) => statusForSchedule(h, now))
  if (results.some((r) => r.open)) return { open: true, unknown: false }

  // Pick the earliest upcoming opening (today first, then nearest day).
  const upcoming = results.filter((r) => r.opensAt)
  if (upcoming.length === 0) return { open: false, unknown: false }
  // Prefer "today" openings (no opensDay) with the smallest time.
  const todayOpens = upcoming.filter((r) => !r.opensDay).sort((a, b) => toMin(a.opensAt!) - toMin(b.opensAt!))
  const chosen = todayOpens[0] ?? upcoming[0]
  return { open: false, opensAt: chosen.opensAt, opensDay: chosen.opensDay, unknown: false }
}
