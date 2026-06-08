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
import { apiGet, apiPost, apiPatch, apiDelete } from './http'

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

export type PartnerProfileResponse = Partner & { locationCount?: number }

export const partnersService = {
  // ── Partner profile (identity + branding + lightweight counts) ──
  async getOwn(): Promise<PartnerProfileResponse> {
    return apiGet<PartnerProfileResponse>('/partner')
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
