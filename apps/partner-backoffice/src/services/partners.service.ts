import type {
  Partner,
  Service,
  Specialist,
  SpecialistHours,
  SpecialistTimeOff,
  Location,
  WeekSchedule,
  Paginated,
  PageParams,
} from '@/types'
import http, { apiGet, apiPost, apiPatch, apiDelete } from './http'

// ─────────────────────────────────────────────────────────────
// API client for the partner-scoped backoffice resources. Each resource is
// fetched from its own endpoint (the partner profile no longer embeds the
// catalog), so the catalog store can load slices on demand.
//
// Boundary mapping: the API uses `serviceIds` on a specialist and stores its
// weekly `schedule` inline; the UI's Specialist type uses `services: string[]`.
// ─────────────────────────────────────────────────────────────

interface ApiSpecialist extends Omit<Specialist, 'services'> {
  serviceIds: string[]
  schedule?: WeekSchedule
}
interface ApiTimeOff {
  id: string
  specialistId: string
  startAt: string
  endAt: string
  allDay: boolean
  reason?: string | null
  createdById?: string | null
}

function toSpecialist(sp: ApiSpecialist): Specialist {
  const { serviceIds, ...rest } = sp
  return { ...rest, services: serviceIds }
}
function toTimeOff(t: ApiTimeOff): SpecialistTimeOff {
  return {
    id: t.id,
    specialistId: t.specialistId,
    startISO: t.startAt,
    endISO: t.endAt,
    allDay: t.allDay,
    reason: t.reason ?? undefined,
    createdBy: t.createdById ?? undefined,
  }
}

export interface ListServicesOpts {
  includeInactive?: boolean
}
export interface ListSpecialistsOpts {
  includeInactive?: boolean
  locationId?: string
}

/** A public review left for a specialist on the booking page. */
export interface SpecialistReview {
  id: string
  author: string
  rating: number
  text: string
  createdAt: string
}

/** A storefront gallery / works tile: a simple photo or a before/after pair. */
export interface GalleryItem {
  type?: 'simple' | 'beforeAfter'
  url?: string
  beforeUrl?: string
  afterUrl?: string
  label?: string
  tone?: string
}

/** The two independent photo lists: 'gallery' (Inside) and 'works'. */
export type PhotoList = 'gallery' | 'works'

export interface PartnerPresentationFields {
  about?: string
  tagline?: string
  instagram?: string
  facebook?: string
  /** WhatsApp number in international digits (e.g. "37491234567"). */
  whatsapp?: string
  logoUrl?: string
  /** Hero gradient tints [from, to]. */
  heroTints?: string[]
  gallery?: GalleryItem[]
  works?: GalleryItem[]
}

/** Public booking-page layout (presentation-only). */
export type PartnerTemplate = 'classic' | 'tabbed'

export type PartnerProfileResponse = Omit<Partner, 'slug'> & {
  /** Null until the partner sets a public handle in Settings. */
  slug: string | null
  locationCount?: number
  autoConfirmBookings?: boolean
  bookingsEnabled?: boolean
  kind?: 'salon' | 'single'
  /** Which public page layout the partner renders. Defaults to classic. */
  template?: PartnerTemplate
  /** Featured in the public marketplace (/salons). Read-only here — curated by
   *  Reserva platform staff from the internal console. */
  marketplaceListed?: boolean
  presentation?: PartnerPresentationFields | null
}

/** Admin-editable partner settings (PATCH /partner). */
export interface PartnerSettingsPatch {
  autoConfirmBookings?: boolean
  bookingsEnabled?: boolean
  name?: string
  type?: string
  accent?: string
  slug?: string
  template?: PartnerTemplate
  presentation?: PartnerPresentationFields
}

// Gallery URLs may come back as same-origin paths ("/uploads/..") relative to
// the API ORIGIN (not /api/v1). Resolve those for <img> display in the UI.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'
const API_ORIGIN = (() => {
  try { return new URL(API_URL).origin } catch { return '' }
})()
export function galleryImageUrl(url?: string): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

export const partnersService = {
  // ── Partner profile (identity + branding + lightweight counts) ──
  async getOwn(): Promise<PartnerProfileResponse> {
    return apiGet<PartnerProfileResponse>('/partner')
  },

  /** Update partner profile/settings (admin-only on the backend). */
  async updateProfile(patch: PartnerSettingsPatch): Promise<PartnerProfileResponse> {
    return apiPatch<PartnerProfileResponse>('/partner', patch)
  },

  // ── Storefront photo lists (admin): 'gallery' (Inside) or 'works' ──
  /** Upload one simple photo to a list; returns the updated list. */
  async uploadGalleryImage(file: File, label = '', list: PhotoList = 'gallery'): Promise<GalleryItem[]> {
    const form = new FormData()
    form.append('file', file)
    form.append('list', list)
    if (label) form.append('label', label)
    const res = await http.post('/partner/gallery', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return (res.data?.data ?? res.data) as GalleryItem[]
  },
  /** Upload a before/after tile (two images) to a list; returns updated list. */
  async uploadBeforeAfter(before: File, after: File, label = '', list: PhotoList = 'works'): Promise<GalleryItem[]> {
    const form = new FormData()
    form.append('before', before)
    form.append('after', after)
    form.append('list', list)
    if (label) form.append('label', label)
    const res = await http.post('/partner/gallery/before-after', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return (res.data?.data ?? res.data) as GalleryItem[]
  },
  /** Remove an image by any of its urls from a list; returns the updated list. */
  async removeGalleryImage(url: string, list: PhotoList = 'gallery'): Promise<GalleryItem[]> {
    const res = await http.delete('/partner/gallery', { data: { url, list } })
    return (res.data?.data ?? res.data) as GalleryItem[]
  },
  // ── Brand logo (admin) ──
  /** Upload the brand logo; returns the new logo URL. */
  async uploadLogo(file: File): Promise<{ logoUrl: string }> {
    const form = new FormData()
    form.append('file', file)
    const res = await http.post('/partner/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return (res.data?.data ?? res.data) as { logoUrl: string }
  },
  /** Remove the brand logo; returns the (now empty) logo URL. */
  async removeLogo(): Promise<{ logoUrl: string }> {
    const res = await http.delete('/partner/logo')
    return (res.data?.data ?? res.data) as { logoUrl: string }
  },

  /** Persist a new tile order for a list; returns the updated list. */
  async reorderGallery(urls: string[], list: PhotoList = 'gallery'): Promise<GalleryItem[]> {
    return apiPatch<GalleryItem[]>('/partner/gallery/order', { urls, list })
  },

  // ── Services ──
  /** Full catalog (one page) — for dropdowns/selectors that need every option. */
  async listServices(opts: ListServicesOpts = {}): Promise<Service[]> {
    const res = await apiGet<Paginated<Service>>('/services', {
      params: { all: true, includeInactive: opts.includeInactive ?? false },
    })
    return res.items
  },
  /** Server-paginated services for the table page. */
  async listServicesPaged(
    params: PageParams & ListServicesOpts = {},
  ): Promise<Paginated<Service>> {
    return apiGet<Paginated<Service>>('/services', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 5,
        includeInactive: params.includeInactive ?? false,
        ...(params.search ? { search: params.search } : {}),
      },
    })
  },
  async createService(data: Omit<Service, 'id'>): Promise<Service> {
    return apiPost<Service>('/services', data)
  },
  async updateService(serviceId: string, patch: Partial<Service>): Promise<Service> {
    return apiPatch<Service>(`/services/${serviceId}`, patch)
  },
  async deleteService(serviceId: string): Promise<void> {
    await apiDelete(`/services/${serviceId}`)
  },

  // ── Specialists ──
  /** Full roster (one page) — for dropdowns/selectors and cross-page lookups. */
  async listSpecialists(opts: ListSpecialistsOpts = {}): Promise<Specialist[]> {
    const res = await apiGet<Paginated<ApiSpecialist>>('/specialists', {
      params: {
        all: true,
        includeInactive: opts.includeInactive ?? false,
        ...(opts.locationId ? { locationId: opts.locationId } : {}),
      },
    })
    return res.items.map(toSpecialist)
  },
  /** Server-paginated specialists for the table page. */
  async listSpecialistsPaged(
    params: PageParams & ListSpecialistsOpts = {},
  ): Promise<Paginated<Specialist>> {
    const res = await apiGet<Paginated<ApiSpecialist>>('/specialists', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 5,
        includeInactive: params.includeInactive ?? false,
        ...(params.locationId ? { locationId: params.locationId } : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    })
    return { ...res, items: res.items.map(toSpecialist) }
  },
  async getSpecialist(id: string): Promise<Specialist> {
    return toSpecialist(await apiGet<ApiSpecialist>(`/specialists/${id}`))
  },
  async createSpecialist(data: Omit<Specialist, 'id'>): Promise<Specialist> {
    const { services, ...rest } = data
    return toSpecialist(await apiPost<ApiSpecialist>('/specialists', { ...rest, serviceIds: services }))
  },
  async updateSpecialist(specialistId: string, patch: Partial<Specialist>): Promise<Specialist> {
    const { services, ...rest } = patch
    return toSpecialist(
      await apiPatch<ApiSpecialist>(`/specialists/${specialistId}`, {
        ...rest,
        ...(services !== undefined && { serviceIds: services }),
      }),
    )
  },
  async deleteSpecialist(specialistId: string): Promise<void> {
    await apiDelete(`/specialists/${specialistId}`)
  },

  // ── Specialist reviews ──
  async listSpecialistReviews(specialistId: string): Promise<SpecialistReview[]> {
    return apiGet<SpecialistReview[]>(`/specialists/${specialistId}/reviews`)
  },
  async deleteSpecialistReview(specialistId: string, reviewId: string): Promise<void> {
    await apiDelete(`/specialists/${specialistId}/reviews/${reviewId}`)
  },

  // ── Locations ──
  /** All branches (one page) — for dropdowns/selectors and cross-page lookups. */
  async listLocations(): Promise<Location[]> {
    const res = await apiGet<Paginated<Location>>('/locations', { params: { all: true } })
    return res.items
  },
  /** Server-paginated locations for the table page. */
  async listLocationsPaged(params: PageParams = {}): Promise<Paginated<Location>> {
    return apiGet<Paginated<Location>>('/locations', {
      params: {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 5,
        ...(params.search ? { search: params.search } : {}),
      },
    })
  },
  async createLocation(data: Omit<Location, 'id'>): Promise<Location> {
    return apiPost<Location>('/locations', data)
  },
  async updateLocation(locationId: string, patch: Partial<Location>): Promise<Location> {
    return apiPatch<Location>(`/locations/${locationId}`, patch)
  },
  async deleteLocation(locationId: string): Promise<void> {
    await apiDelete(`/locations/${locationId}`)
  },

  // ── Specialist weekly hours (stored inline on the specialist) ──
  async getHours(specialistId: string): Promise<SpecialistHours> {
    const sp = await apiGet<ApiSpecialist>(`/specialists/${specialistId}`)
    return { specialistId, schedule: sp.schedule ?? {} }
  },
  async updateHours(specialistId: string, schedule: WeekSchedule): Promise<void> {
    await apiPatch(`/specialists/${specialistId}`, { schedule })
  },

  // ── Time off (nested under a specialist) ──
  async listTimeOff(specialistId: string): Promise<SpecialistTimeOff[]> {
    const rows = await apiGet<ApiTimeOff[]>(`/specialists/${specialistId}/time-off`)
    return rows.map(toTimeOff)
  },
  async createTimeOff(data: Omit<SpecialistTimeOff, 'id'>): Promise<SpecialistTimeOff> {
    const row = await apiPost<ApiTimeOff>(`/specialists/${data.specialistId}/time-off`, {
      startAt: data.startISO,
      endAt: data.endISO,
      allDay: data.allDay,
      reason: data.reason,
    })
    return toTimeOff(row)
  },
  async updateTimeOff(
    specialistId: string,
    id: string,
    patch: Partial<SpecialistTimeOff>,
  ): Promise<void> {
    await apiPatch(`/specialists/${specialistId}/time-off/${id}`, {
      ...(patch.startISO !== undefined && { startAt: patch.startISO }),
      ...(patch.endISO !== undefined && { endAt: patch.endISO }),
      ...(patch.allDay !== undefined && { allDay: patch.allDay }),
      ...(patch.reason !== undefined && { reason: patch.reason }),
    })
  },
  async deleteTimeOff(specialistId: string, id: string): Promise<void> {
    await apiDelete(`/specialists/${specialistId}/time-off/${id}`)
  },

  /** Bookings that conflict with a prospective time-off window (backoffice gate). */
  async timeOffConflicts(specialistId: string, startISO: string, endISO: string): Promise<unknown[]> {
    return apiGet<unknown[]>(`/specialists/${specialistId}/time-off/conflicts`, {
      params: { startAt: startISO, endAt: endISO },
    })
  },
}
