// ─────────────────────────────────────────────────────────────
// Reserva domain models — shared across partner-backoffice,
// internal-backoffice and the public client app.
// ─────────────────────────────────────────────────────────────

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
  title: string
  locationId: string
  active: boolean
  phone: string
  services: string[]
  /** Recurring weekly schedule. Present when loaded from the API. */
  schedule?: WeekSchedule
}

export interface Service {
  id: string
  name: string
  price: number
  duration: number
  active: boolean
  category: string
  /** Recurrence interval in total days (null = no repeat). Backoffice-only. */
  repeatEveryDays?: number | null
}

export interface Booking {
  id: string
  partnerId: string
  locationId: string
  specialistId: string
  serviceId: string
  clientName: string
  clientPhone: string
  startISO: string
  endISO: string
  status: BookingStatus
  notes?: string
  /**
   * Embedded display data joined from the API so a booking row is
   * self-contained (no catalog lookup needed to render names/price).
   */
  service?: { id: string; name: string; price: number; duration: number } | null
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
  slug: string
  type: string
  accent: string
  locations: Location[]
  specialists: Specialist[]
  services: Service[]
}
