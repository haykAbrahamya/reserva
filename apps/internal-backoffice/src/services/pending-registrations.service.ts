import type { Paginated, PageParams } from '@/types'
import { apiGet, apiPost, apiDelete } from './http'

export type PendingStatus = 'pending' | 'expired'

export interface PendingRegistration {
  id: string
  companyName: string
  companyType: string
  slug: string
  adminName: string
  adminEmail: string
  adminPhone: string
  expiresAt: string
  createdAt: string
  expired: boolean
}

export interface ListPendingParams extends PageParams {
  status?: PendingStatus
}

export const pendingRegistrationsService = {
  list(params: ListPendingParams = {}): Promise<Paginated<PendingRegistration>> {
    return apiGet<Paginated<PendingRegistration>>('/platform/pending-registrations', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    })
  },

  /** Actionable-pending count for the nav badge. */
  count(): Promise<{ count: number }> {
    return apiGet<{ count: number }>('/platform/pending-registrations/count')
  },

  /** Resend the activation email (regenerates the link + extends expiry). */
  resend(id: string): Promise<{ email: string }> {
    return apiPost<{ email: string }>(`/platform/pending-registrations/${id}/resend`, {})
  },

  remove(id: string): Promise<void> {
    return apiDelete(`/platform/pending-registrations/${id}`)
  },
}
