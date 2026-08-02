import { apiGet, apiPost, apiPatch, apiDelete } from './http'

export type NotificationType =
  | 'booking_created'
  | 'booking_rescheduled'
  | 'booking_cancelled'
  | 'booking_confirmed'
  | 'booking_completed'
  | 'booking_noshow'
  | 'course_registration'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  data: {
    bookingId?: string
    clientName?: string
    service?: string
    specialist?: string | null
    startAt?: string
    /** Course registration notifications. */
    courseId?: string
    courseTitle?: string
    memberName?: string
  }
  read: boolean
  createdAt: string
}

export interface NotificationsPage {
  items: AppNotification[]
  page: number
  pageSize: number
  total: number
  pageCount: number
  unread: number
}

export const notificationsService = {
  list(page = 1, pageSize = 12): Promise<NotificationsPage> {
    return apiGet<NotificationsPage>('/notifications', { params: { page, pageSize } })
  },

  async unreadCount(): Promise<number> {
    const res = await apiGet<{ count: number }>('/notifications/unread-count')
    return res.count
  },

  markRead(id: string): Promise<void> {
    return apiPatch<void>(`/notifications/${id}/read`)
  },

  markAllRead(): Promise<void> {
    return apiPost<void>('/notifications/read-all')
  },

  remove(id: string): Promise<void> {
    return apiDelete(`/notifications/${id}`)
  },
}
