import { fmtAMD } from '@reserva/shared'
import type { LocalizedText } from '@reserva/shared'
import type { PublicCourse } from '@/mock/partners'

/** Signature of the `useLocalized()` result — a base string + optional i18n blob. */
type Localizer = (base: string, i18n?: LocalizedText | null) => string

/** Course price by mode: null for 'hidden' (show nothing), the localized "Free"
 *  label for 'free', else the AMD amount for 'paid'. */
export function fmtCoursePrice(course: PublicCourse, freeLabel: string): string | null {
  if (course.priceMode === 'hidden') return null
  if (course.priceMode === 'free') return freeLabel
  return fmtAMD(course.price)
}

/**
 * Seats left for a course's current run:
 *   - null  → no run / unlimited (no seats indicator shown)
 *   - 0     → full
 *   - n>0   → available seats
 */
export function courseSeatsLeft(course: PublicCourse): number | null {
  const run = course.currentCohort
  if (!run || run.capacity <= 0) return null
  return Math.max(0, run.capacity - run.takenCount)
}

/** True when the course can currently accept a public registration. */
export function courseIsOpen(course: PublicCourse): boolean {
  const run = course.currentCohort
  if (!run) return false
  if (!run.registrationOpen) return false
  if (run.status !== 'open' && run.status !== 'running') return false
  const left = courseSeatsLeft(course)
  return left === null || left > 0
}

/** A friendly date/schedule label: explicit date range if set, else the free-text
 *  schedule, else empty. */
export function courseDateLabel(course: PublicCourse, locale: string): string {
  const run = course.currentCohort
  if (!run) return ''
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  if (run.startDate && run.endDate) return `${fmt(run.startDate)} – ${fmt(run.endDate)}`
  if (run.startDate) return fmt(run.startDate)
  return run.scheduleText || ''
}

/** The tutor's display name (linked specialist wins over free-text guest). */
export function courseTutorName(course: PublicCourse, loc: Localizer): string {
  const sp = course.tutorSpecialist
  if (sp) return loc(sp.name, sp.nameI18n)
  return course.tutorName
}
