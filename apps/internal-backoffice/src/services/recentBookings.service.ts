import type { BookingStatus } from '@/types'
import { apiGet } from './http'

/** One booking as the Dashboard's "Recent bookings" shows it: who it is for
 *  and what was booked — no client details, by design. */
export interface RecentBooking {
  id: string
  createdAt: string            // ISO — when it was made
  startAt: string              // ISO — the appointment
  status: BookingStatus
  /** 'public' = booked online by a client; 'backoffice' = entered by the salon's staff. */
  source: 'public' | 'backoffice'
  partner: { id: string; name: string; slug: string; kind: 'salon' | 'single' }
  location: { id: string; name: string } | null
  service: { id: string; name: string } | null
  specialist: { id: string; name: string } | null
  /** The service's listed price when it was booked; null when it has none. */
  price: { type: 'fixed' | 'range'; amount: number; max: number | null } | null
}

/** Cursor-paged, newest first: pass `nextCursor` back for the next slice. */
export interface RecentBookingsPage {
  items: RecentBooking[]
  nextCursor: string | null
}

export const recentBookingsService = {
  list(params: { limit?: number; cursor?: string | null } = {}): Promise<RecentBookingsPage> {
    return apiGet<RecentBookingsPage>('/platform/bookings/recent', {
      params: {
        limit: params.limit ?? 5,
        ...(params.cursor ? { cursor: params.cursor } : {}),
      },
    })
  },
}
