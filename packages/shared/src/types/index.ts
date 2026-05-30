// ─────────────────────────────────────────────────────────────
// Reserva domain models — shared across partner-backoffice,
// internal-backoffice and the public client app.
// ─────────────────────────────────────────────────────────────

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
}

export interface Specialist {
  id: string
  name: string
  title: string
  locationId: string
  active: boolean
  phone: string
  services: string[]
}

export interface Service {
  id: string
  name: string
  price: number
  duration: number
  active: boolean
  category: string
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
