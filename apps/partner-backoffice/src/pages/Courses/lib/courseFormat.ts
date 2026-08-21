import { fmtAMD } from '@reserva/shared'
import type { CohortStatus, CourseLevel, CoursePriceMode, EnrollmentStatus } from '@/types'

/** i18n key for a course level badge. */
export function levelKey(level?: CourseLevel | null): string | null {
  return level ? `courses.level.${level}` : null
}

/** i18n key for a run's status label. */
export function statusKey(status: CohortStatus): string {
  return `courses.status.${status}`
}

/** i18n key for a member's status label. */
export function memberStatusKey(status: EnrollmentStatus): string {
  return `courses.members.status.${status}`
}

/** Tone for a status pill — maps to a CSS class variant. */
export function statusTone(status: CohortStatus): 'draft' | 'open' | 'running' | 'done' | 'muted' {
  switch (status) {
    case 'draft': return 'draft'
    case 'open': return 'open'
    case 'running': return 'running'
    case 'completed': return 'done'
    case 'archived': return 'muted'
  }
}

export function memberStatusTone(status: EnrollmentStatus): 'pending' | 'confirmed' | 'muted' | 'done' {
  switch (status) {
    case 'pending': return 'pending'
    case 'confirmed': return 'confirmed'
    case 'completed': return 'done'
    case 'cancelled':
    case 'noshow': return 'muted'
  }
}

/** Course price label by mode: null for 'hidden' (render nothing), the "Free"
 *  label for 'free', else the formatted AMD amount for 'paid'. */
export function coursePriceLabel(
  mode: CoursePriceMode,
  price: number,
  freeLabel: string,
): string | null {
  if (mode === 'hidden') return null
  if (mode === 'free') return freeLabel
  return fmtAMD(price)
}

/** Format an optional ISO date range for display. Falls back to a dash. */
export function fmtDateRange(
  startISO: string | null | undefined,
  endISO: string | null | undefined,
  locale: string,
  dash: string,
): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
  if (startISO && endISO) return `${fmt(startISO)} – ${fmt(endISO)}`
  if (startISO) return fmt(startISO)
  if (endISO) return fmt(endISO)
  return dash
}
