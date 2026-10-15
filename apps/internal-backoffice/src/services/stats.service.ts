import { apiGet } from './http'

export interface PlatformOverview {
  partners: { total: number; active: number; inactive: number; recent: number }
  /** Partners on a free trial, and those whose payment is due. */
  billing: { trial: number; due: number }
  /** Leads nobody has contacted yet. */
  leads: { new: number }
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
