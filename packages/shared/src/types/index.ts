// ─────────────────────────────────────────────────────────────
// Reserva domain models — shared across partner-backoffice,
// internal-backoffice and the public client app.
// ─────────────────────────────────────────────────────────────

/** Locales that can carry a tenant-content translation (matches app locales). */
export type ContentLocale = 'hy' | 'en' | 'ru'

/** Per-language overrides for one translatable field. Any locale may be absent
 *  → the field falls back to its base string. See utils/localize. */
export interface LocalizedText {
  hy?: string | null
  en?: string | null
  ru?: string | null
}

/** Server-side pagination envelope returned by every list endpoint. */
export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  pageCount: number
}

/** Query params accepted by every paginated list endpoint. */
export interface PageParams {
  page?: number
  pageSize?: number
  search?: string
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'noshow'

export interface Location {
  id: string
  name: string
  /** Optional per-language overrides for `name` (falls back to `name`). Only the
   *  branch name is translatable — address/geo stay single-value. */
  nameI18n?: LocalizedText | null
  address: string
  phone: string
  /** Opening hours per weekday. Optional — older locations may not have it set. */
  hours?: WeekSchedule
  /** Geo coordinates from the map picker. Null/absent until an owner sets a pin. */
  lat?: number | null
  lng?: number | null
}

export interface Specialist {
  id: string
  name: string
  /** Optional per-language overrides for `name` (falls back to `name`). */
  nameI18n?: LocalizedText | null
  title: string
  /** Optional per-language overrides for `title` (falls back to `title`). */
  titleI18n?: LocalizedText | null
  locationId: string
  active: boolean
  phone: string
  services: string[]
  /** Optional profile photo URL. Empty/absent → letter-initial avatar. */
  avatarUrl?: string
  /** Recurring weekly schedule. Present when loaded from the API. */
  schedule?: WeekSchedule
  /** Computed average rating (0 when no reviews). Present on public payloads. */
  rating?: number
  /** Number of public reviews (0 when none). Present on public payloads. */
  reviewCount?: number
}

/** Fixed exact price, or a min–max range whose exact charge is captured per
 *  booking on completion. */
export type ServicePriceType = 'fixed' | 'range'

export interface Service {
  id: string
  name: string
  /** Optional per-language overrides for `name` (falls back to `name`). */
  nameI18n?: LocalizedText | null
  /** 'fixed' → `price` is exact. 'range' → `price`..`priceMax`. Absent = fixed. */
  priceType?: ServicePriceType
  /** Fixed price, or the LOWER bound for a range service. */
  price: number
  /** Upper bound for a range service; null/absent for fixed. */
  priceMax?: number | null
  duration: number
  active: boolean
  category: string
  /** Optional per-language overrides for `category` (falls back to `category`). */
  categoryI18n?: LocalizedText | null
  /** Recurrence interval in total days (null = no repeat). Backoffice-only. */
  repeatEveryDays?: number | null
  /**
   * When false this is a facility/entry service (spa sauna, pool, day pass):
   * it isn't tied to a person, so booking skips specialist selection and uses
   * the location's hours + `capacity` instead. Defaults to true. Optional
   * because older fixtures / partial payloads may omit it — treat absent as true.
   */
  requiresSpecialist?: boolean
  /** Max concurrent bookings per slot for a facility service (≥1, default 1). */
  capacity?: number
  /** Manual display order within the partner's list (0-based, lower = first).
   *  Server-owned — set via drag-to-reorder, never sent on create/update.
   *  Optional because older/partial payloads may omit it. */
  sortOrder?: number
}

// ── Courses ─────────────────────────────────────────────────
// A salon "academy": a Course (reusable template) is run as one or more
// Cohorts (a "group/run" with its own dates + members). Members (Enrollments)
// are self-contained — a course student is NOT a booking Client.

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'

/** How a course price is presented: hidden (nothing shown), free ("Free"), or
 *  paid (shows the amount). */
export type CoursePriceMode = 'hidden' | 'free' | 'paid'

/** Lifecycle of one course run. */
export type CohortStatus = 'draft' | 'open' | 'running' | 'completed' | 'archived'

export type EnrollmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'noshow'

export type EnrollmentSource = 'public' | 'backoffice'

/** Lightweight rollup of a course's current run, embedded on the Course by the
 *  API so a list can render "active run · N members" without extra fetches. */
export interface CurrentCohortSummary {
  id: string
  status: CohortStatus
  startDate: string | null
  endDate: string | null
  scheduleText: string
  capacity: number
  registrationOpen: boolean
  locationId: string | null
  /** Confirmed members currently occupying a seat. */
  confirmedCount: number
}

/** The tutor credited on a course — either a linked specialist or a guest. */
export interface CourseTutor {
  id: string
  name: string
  nameI18n?: LocalizedText | null
  title: string
  titleI18n?: LocalizedText | null
  avatarUrl?: string
}

export interface Course {
  id: string
  partnerId: string
  title: string
  /** Optional per-language overrides for `title` (falls back to `title`). */
  titleI18n?: LocalizedText | null
  summary: string
  summaryI18n?: LocalizedText | null
  description: string
  descriptionI18n?: LocalizedText | null
  /** Cover image URL. Empty → gradient placeholder. */
  coverUrl: string
  /** How the price is presented: 'hidden' (none), 'free', or 'paid'. */
  priceMode: CoursePriceMode
  /** Price in whole AMD. Only meaningful when priceMode is 'paid'. */
  price: number
  /** Linked tutor specialist id, or null for a guest/none. */
  tutorSpecialistId?: string | null
  /** Free-text guest tutor (used when there's no linked specialist). */
  tutorName: string
  tutorTitle: string
  level?: CourseLevel | null
  active: boolean
  /** Joined tutor specialist (present when `tutorSpecialistId` is set). */
  tutorSpecialist?: CourseTutor | null
  /** The current (non-archived) run + a rollup; null if none. */
  currentCohort?: CurrentCohortSummary | null
  /** Total number of runs (incl. archived). */
  cohortCount?: number
}

/** One run of a course (the editable/lifecycle unit). */
export interface CourseCohort {
  id: string
  courseId: string
  partnerId: string
  locationId: string | null
  startDate: string | null
  endDate: string | null
  scheduleText: string
  /** Max confirmed members. 0 = unlimited. */
  capacity: number
  status: CohortStatus
  registrationOpen: boolean
}

/** A member of a course run. Self-contained contact (not a booking Client). */
export interface CourseEnrollment {
  id: string
  cohortId: string
  partnerId: string
  memberName: string
  memberPhone: string
  memberEmail: string
  status: EnrollmentStatus
  source: EnrollmentSource
  notes?: string | null
  /** Price captured at enrollment time (drams). */
  priceAtEnroll: number
  /** UI language the member registered in; null for staff adds. */
  locale?: string | null
  createdAt: string
}

export interface Booking {
  id: string
  partnerId: string
  locationId: string
  /** Null for facility/entry services (spa) that aren't tied to a specialist. */
  specialistId: string | null
  serviceId: string
  clientName: string
  clientPhone: string
  startISO: string
  endISO: string
  status: BookingStatus
  notes?: string
  /** Lower bound / booked price snapshot (drams). */
  priceAtBooking?: number
  /** Upper bound snapshot for a range-priced booking; null for fixed. */
  priceMaxAtBooking?: number | null
  /** Exact amount charged, captured on completion of a range booking. */
  finalPrice?: number | null
  /**
   * Embedded display data joined from the API so a booking row is
   * self-contained (no catalog lookup needed to render names/price).
   */
  service?: {
    id: string
    name: string
    price: number
    priceType?: ServicePriceType
    priceMax?: number | null
    duration: number
    capacity?: number
  } | null
  specialist?: { id: string; name: string; title: string } | null
  location?: { id: string; name: string; address: string } | null
}

export interface WorkingDay {
  enabled: boolean
  start: string
  end: string
}

export type WeekSchedule = Record<string, WorkingDay>

export interface SpecialistHours {
  specialistId: string
  schedule: WeekSchedule
}

/**
 * A one-off exception to a specialist's recurring weekly schedule — time the
 * specialist is NOT available. Recurring/structural changes belong in the
 * weekly schedule; this is strictly for dated, non-repeating time off.
 *
 * One shape covers every case via the start/end datetimes:
 *  - Partial day:  start = Jun 12 15:00, end = Jun 12 17:00, allDay = false
 *  - Full day:     start = Jun 12 00:00, end = Jun 12 23:59, allDay = true
 *  - Multi-day:    start = Jun 12 00:00, end = Jun 20 23:59, allDay = true
 */
export interface SpecialistTimeOff {
  id: string
  specialistId: string
  startISO: string
  endISO: string
  /** When true the UI hides the time window and treats whole days as off. */
  allDay: boolean
  /** Optional backoffice-only note (e.g. "Vacation", "Dentist"). */
  reason?: string
  /** User id of the admin/manager who created it — light audit trail. */
  createdBy?: string
}

export interface Partner {
  id: string
  name: string
  /** Optional per-language overrides for `name` (the public hero title). Falls
   *  back to `name`, which stays the source of truth for search/emails/slug. */
  nameI18n?: LocalizedText | null
  slug: string
  type: string
  /** Optional per-language overrides for `type` (the public category chip).
   *  Falls back to `type`. */
  typeI18n?: LocalizedText | null
  accent: string
  locations: Location[]
  specialists: Specialist[]
  services: Service[]
}
