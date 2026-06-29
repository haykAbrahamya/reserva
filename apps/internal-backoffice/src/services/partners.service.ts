import type { Paginated, PageParams } from '@/types'
import { apiGet, apiPost, apiPatch, apiDelete } from './http'

export interface PartnerCounts {
  locations: number
  specialists: number
  services: number
  users: number
  bookings: number
}

export interface PartnerListItem {
  id: string
  slug: string
  name: string
  type: string
  accent: string
  active: boolean
  /** Featured in the public marketplace (/salons). Curated here by platform staff. */
  marketplaceListed: boolean
  /** Whether the public page accepts online bookings (off = contact-only). */
  bookingsEnabled: boolean
  /** 'salon' (team) or 'single' (solo professional). */
  kind: 'salon' | 'single'
  createdAt: string
  counts: PartnerCounts
}

export interface PartnerAdmin {
  id: string
  name: string
  email: string
  phone: string
  lastLogin: string | null
  active: boolean
}

/** A partner's user (admin or manager) as seen by platform staff. */
export interface PartnerUser {
  id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'manager'
  active: boolean
  mustChangePassword: boolean
  lastLogin: string | null
  createdAt: string
  location: { id: string; name: string } | null
}

export interface UpdatePartnerUserInput {
  name?: string
  phone?: string
  active?: boolean
}

export interface PartnerPresentation {
  tagline: string
  about: string
  hours: string
}

export interface PartnerDetail extends PartnerListItem {
  presentation: PartnerPresentation | null
  users: PartnerAdmin[]
}

export interface CreatePartnerInput {
  name: string
  slug: string
  type: string
  accent: string
  admin: { name: string; email: string; phone: string; password?: string }
}

export interface CreatePartnerResult {
  partner: { id: string; slug: string; name: string }
  adminOtp: string | null
}

export interface UpdatePartnerInput {
  name?: string
  type?: string
  accent?: string
  active?: boolean
  presentation?: Partial<PartnerPresentation>
}

interface ListParams extends PageParams {
  active?: boolean
}

export const partnersService = {
  list(params: ListParams = {}): Promise<Paginated<PartnerListItem>> {
    return apiGet<Paginated<PartnerListItem>>('/platform/partners', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 5,
        ...(params.search ? { search: params.search } : {}),
        ...(params.active !== undefined ? { active: params.active } : {}),
      },
    })
  },

  get(id: string): Promise<PartnerDetail> {
    return apiGet<PartnerDetail>(`/platform/partners/${id}`)
  },

  create(input: CreatePartnerInput): Promise<CreatePartnerResult> {
    return apiPost<CreatePartnerResult>('/platform/partners', input)
  },

  update(id: string, patch: UpdatePartnerInput): Promise<PartnerDetail> {
    return apiPatch<PartnerDetail>(`/platform/partners/${id}`, patch)
  },

  setActive(id: string, active: boolean): Promise<PartnerDetail> {
    return apiPatch<PartnerDetail>(`/platform/partners/${id}/active`, { active })
  },

  /** Feature/unfeature a salon in the public marketplace (/salons). */
  setMarketplace(id: string, listed: boolean): Promise<PartnerDetail> {
    return apiPatch<PartnerDetail>(`/platform/partners/${id}/marketplace`, { listed })
  },

  /** Enable/disable the public booking flow (off = contact-only page). */
  setBookings(id: string, enabled: boolean): Promise<PartnerDetail> {
    return apiPatch<PartnerDetail>(`/platform/partners/${id}/bookings`, { enabled })
  },

  /** Switch between salon (team) and single (solo) mode. */
  setKind(id: string, kind: 'salon' | 'single'): Promise<PartnerDetail> {
    return apiPatch<PartnerDetail>(`/platform/partners/${id}/kind`, { kind })
  },

  /** PERMANENTLY delete a partner and all connected data (owner-only). */
  hardDelete(id: string): Promise<void> {
    return apiDelete(`/platform/partners/${id}`)
  },

  // ── Partner users (platform support) ──
  listUsers(partnerId: string): Promise<PartnerUser[]> {
    return apiGet<PartnerUser[]>(`/platform/partners/${partnerId}/users`)
  },

  updateUser(partnerId: string, userId: string, patch: UpdatePartnerUserInput): Promise<PartnerUser> {
    return apiPatch<PartnerUser>(`/platform/partners/${partnerId}/users/${userId}`, patch)
  },

  /** Reset a user's password. Omit `password` to auto-generate; returns it once. */
  resetUserPassword(partnerId: string, userId: string, password?: string): Promise<{ password: string }> {
    return apiPost<{ password: string }>(
      `/platform/partners/${partnerId}/users/${userId}/reset-password`,
      password ? { password } : {},
    )
  },

  /**
   * Is a slug still available? Reuses the searchable list endpoint and checks
   * for an exact (case-insensitive) match, so no extra backend route is needed.
   * The backend create still enforces uniqueness authoritatively (SLUG_TAKEN);
   * this is just for live feedback in the create form.
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const normalized = slug.trim().toLowerCase()
    if (!normalized) return false
    const res = await apiGet<Paginated<PartnerListItem>>('/platform/partners', {
      params: { search: normalized, pageSize: 25 },
    })
    return !res.items.some((p) => p.slug.toLowerCase() === normalized)
  },
}
