import type { Paginated, PageParams } from '@/types'
import { apiGet, apiPatch } from './http'

export type DemoRequestStatus = 'new' | 'done'

export interface DemoRequest {
  id: string
  name: string
  company: string | null
  phone: string | null
  email: string | null
  notes: string | null
  status: DemoRequestStatus
  handledBy: string | null
  handledAt: string | null
  createdAt: string
}

export interface DemoRequestsPage extends Paginated<DemoRequest> {
  /** Count of unhandled ('new') requests — for the nav badge. */
  newCount: number
}

export interface ListDemoRequestsParams extends PageParams {
  status?: DemoRequestStatus
}

export const demoRequestsService = {
  list(params: ListDemoRequestsParams = {}): Promise<DemoRequestsPage> {
    return apiGet<DemoRequestsPage>('/platform/demo-requests', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
        ...(params.status ? { status: params.status } : {}),
      },
    })
  },

  setStatus(id: string, status: DemoRequestStatus): Promise<DemoRequest> {
    return apiPatch<DemoRequest>(`/platform/demo-requests/${id}/status`, { status })
  },
}
