import type { Booking, BookingStatus } from '@/types'
import { apiGet, apiPost, apiPatch, apiDelete } from './http'

// ── API shapes (backend uses startAt/endAt; UI uses startISO/endISO) ──
export interface ApiBooking {
  id: string
  partnerId: string
  locationId: string
  /** Null for facility/entry services (spa) that aren't tied to a specialist. */
  specialistId: string | null
  serviceId: string
  clientId: string
  clientName: string
  clientPhone: string
  startAt: string
  endAt: string
  status: BookingStatus
  notes?: string | null
  /** Lower bound / booked price snapshot (drams). */
  priceAtBooking?: number
  /** Upper bound snapshot for a range-priced booking; null for fixed. */
  priceMaxAtBooking?: number | null
  /** Exact amount charged, captured on completion of a range booking. */
  finalPrice?: number | null
  // Joined display data (see backend BOOKING_INCLUDE).
  service?: {
    id: string
    name: string
    price: number
    priceType?: 'fixed' | 'range'
    priceMax?: number | null
    duration: number
    capacity?: number
  } | null
  specialist?: { id: string; name: string; title: string } | null
  location?: { id: string; name: string; address: string } | null
}

interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  pageCount: number
}

/** Map an API booking (startAt/endAt) to the UI Booking (startISO/endISO). */
export function mapApiBooking(b: ApiBooking): Booking {
  return {
    id: b.id,
    partnerId: b.partnerId,
    locationId: b.locationId,
    specialistId: b.specialistId,
    serviceId: b.serviceId,
    clientName: b.clientName,
    clientPhone: b.clientPhone,
    startISO: b.startAt,
    endISO: b.endAt,
    status: b.status,
    notes: b.notes ?? undefined,
    priceAtBooking: b.priceAtBooking,
    priceMaxAtBooking: b.priceMaxAtBooking,
    finalPrice: b.finalPrice,
    service: b.service ?? null,
    specialist: b.specialist ?? null,
    location: b.location ?? null,
  }
}

export interface ListBookingsParams {
  page?: number
  pageSize?: number
  status?: string
  specialistId?: string
  locationId?: string
  from?: string
  to?: string
  search?: string
}

export interface PaginatedBookings {
  items: Booking[]
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export const bookingsService = {
  /** Server-paginated, filterable booking list (tenant-scoped via the JWT). */
  async list(params: ListBookingsParams = {}): Promise<PaginatedBookings> {
    const res = await apiGet<Paginated<ApiBooking>>('/bookings', { params })
    return { ...res, items: res.items.map(mapApiBooking) }
  },

  /** All bookings in a date window for the calendar (no pagination). */
  async calendar(from: string, to: string): Promise<Booking[]> {
    const rows = await apiGet<ApiBooking[]>('/bookings/calendar', { params: { from, to } })
    return rows.map(mapApiBooking)
  },

  async get(id: string): Promise<Booking | undefined> {
    const b = await apiGet<ApiBooking>(`/bookings/${id}`)
    return mapApiBooking(b)
  },

  async create(data: Omit<Booking, 'id'>): Promise<Booking> {
    const b = await apiPost<ApiBooking>('/bookings', {
      locationId: data.locationId,
      specialistId: data.specialistId,
      serviceId: data.serviceId,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      startAt: data.startISO,
      status: data.status,
      notes: data.notes,
    })
    return mapApiBooking(b)
  },

  async update(id: string, patch: Partial<Booking>): Promise<Booking> {
    const b = await apiPatch<ApiBooking>(`/bookings/${id}`, {
      ...(patch.specialistId !== undefined && { specialistId: patch.specialistId }),
      ...(patch.serviceId !== undefined && { serviceId: patch.serviceId }),
      ...(patch.startISO !== undefined && { startAt: patch.startISO }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
    })
    return mapApiBooking(b)
  },

  async updateStatus(id: string, status: BookingStatus, finalPrice?: number): Promise<Booking> {
    const b = await apiPatch<ApiBooking>(`/bookings/${id}/status`, {
      status,
      ...(finalPrice != null && { finalPrice }),
    })
    return mapApiBooking(b)
  },

  /** Edit/correct the final price of a range booking at any time. */
  async setFinalPrice(id: string, finalPrice: number): Promise<Booking> {
    const b = await apiPatch<ApiBooking>(`/bookings/${id}/final-price`, { finalPrice })
    return mapApiBooking(b)
  },

  async delete(id: string): Promise<void> {
    await apiDelete(`/bookings/${id}`)
  },
}
