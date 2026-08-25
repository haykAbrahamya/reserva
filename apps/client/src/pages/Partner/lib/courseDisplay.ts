import { fmtAMD } from '@reserva/shared'
import type { LocalizedText } from '@reserva/shared'
import type { PublicCourse, PublicPartner } from '@/mock/partners'
import { canBook, bookableLocations, partnerTelHref } from '@/services/booking.service'

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

/** The course's long-form description, localized and trimmed. Empty string
 *  when the partner never filled one in — the "see more info" affordance is
 *  hidden in that case, since the card already shows everything there is. */
export function courseDescription(course: PublicCourse, loc: Localizer): string {
  return loc(course.description, course.descriptionI18n).trim()
}

/** The course tutor for display: a linked specialist wins over the free-text
 *  guest fields. `name` is empty when the course has no tutor at all. */
export function courseTutor(course: PublicCourse, loc: Localizer): {
  name: string
  title: string
  avatarUrl?: string
} {
  const sp = course.tutorSpecialist
  if (sp) {
    return {
      name: loc(sp.name, sp.nameI18n),
      title: loc(sp.title, sp.titleI18n),
      avatarUrl: sp.avatarUrl,
    }
  }
  return { name: course.tutorName, title: course.tutorTitle }
}

/**
 * Which call-to-action a course should show, resolved in ONE place so the card
 * and the details popup can never disagree:
 *   - `register` → online sign-up is open
 *   - `call`     → contact-only partner (booking disabled); dial `telHref`, or
 *                  open the branch picker first when `pickBranch` is true
 *   - `closed`   → bookable partner but the run takes no more sign-ups
 */
export type CourseCta =
  | { kind: 'register' }
  | { kind: 'call'; telHref: string | null; pickBranch: boolean }
  | { kind: 'closed' }

export function courseCta(partner: PublicPartner, course: PublicCourse): CourseCta {
  if (!canBook(partner)) {
    return {
      kind: 'call',
      telHref: partnerTelHref(partner),
      pickBranch: bookableLocations(partner).length > 1,
    }
  }
  return courseIsOpen(course) ? { kind: 'register' } : { kind: 'closed' }
}
