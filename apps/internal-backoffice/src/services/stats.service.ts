import { apiGet } from './http'

export interface PlatformOverview {
  partners: { total: number; active: number; inactive: number; recent: number }
  catalog: { locations: number; specialists: number; bookings: number }
  staff: number
  recentPartners: {
    id: string
    name: string
    slug: string
    type: string
    accent: string
    active: boolean
    createdAt: string
  }[]
}

export const statsService = {
  overview(): Promise<PlatformOverview> {
    return apiGet<PlatformOverview>('/platform/stats/overview')
  },
}
