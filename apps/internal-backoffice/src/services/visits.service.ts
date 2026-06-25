import type { Paginated, PageParams } from '@/types'
import { apiGet } from './http'

/** A single page view recorded by the public client app. */
export interface Visit {
  id: string
  ip: string | null
  userAgent: string | null
  deviceType: string | null
  browser: string | null
  browserVer: string | null
  os: string | null
  osVer: string | null
  path: string | null
  host: string | null
  referrer: string | null
  language: string | null
  screenW: number | null
  screenH: number | null
  country: string | null
  city: string | null
  createdAt: string
}

interface ListParams extends PageParams {
  deviceType?: string
  country?: string
}

export const visitsService = {
  list(params: ListParams = {}): Promise<Paginated<Visit>> {
    return apiGet<Paginated<Visit>>('/platform/visits', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
        ...(params.deviceType ? { deviceType: params.deviceType } : {}),
        ...(params.country ? { country: params.country } : {}),
      },
    })
  },
}
