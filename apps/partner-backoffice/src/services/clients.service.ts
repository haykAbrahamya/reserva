import type { Booking } from '@/types'
import { apiGet, apiPatch } from './http'
import { mapApiBooking, type ApiBooking } from './bookings.service'

export interface ClientListItem {
  id: string
  partnerId: string
  name: string
  phone: string
  email?: string | null
  notes?: string | null
  visits: number
  totalSpend: number
  lastVisit: string | null
}

export interface ClientDetail extends Omit<ClientListItem, 'visits' | 'totalSpend' | 'lastVisit'> {
  stats: { visits: number; completed: number; totalSpend: number; lastVisit: string | null }
  bookings: Booking[]
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export interface ListClientsParams {
  page?: number
  pageSize?: number
  search?: string
}

export const clientsService = {
  /** Paginated, searchable client list with per-client stats (server-side). */
  list(params: ListClientsParams = {}): Promise<Paginated<ClientListItem>> {
    return apiGet<Paginated<ClientListItem>>('/clients', { params })
  },

  async get(id: string): Promise<ClientDetail> {
    const raw = await apiGet<Omit<ClientDetail, 'bookings'> & { bookings: ApiBooking[] }>(
      `/clients/${id}`,
    )
    return { ...raw, bookings: raw.bookings.map(mapApiBooking) }
  },

  update(id: string, patch: { name?: string; email?: string | null; notes?: string | null }) {
    return apiPatch<ClientListItem>(`/clients/${id}`, patch)
  },
}
