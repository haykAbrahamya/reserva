import type { LocalizedText, Paginated } from '@/types'
import { apiGet, apiPost, apiPatch, apiDelete } from './http'

// ─────────────────────────────────────────────────────────────
// API client for the Vacancies product — open positions, chair rentals and
// commission places. Kept in its own module so the product stays isolated from
// bookings, exactly like courses.service.
// ─────────────────────────────────────────────────────────────

/**
 * How a position pays. `percentage` stores the share the SALON keeps — never
 * the master's — so "60/40" is unambiguous everywhere it is rendered.
 * `negotiable` means real terms exist but are not published, which reads as a
 * decision rather than a blank field.
 */
export type VacancyPayType = 'percentage' | 'rent' | 'salary' | 'negotiable'
export type VacancyPayPeriod = 'day' | 'week' | 'month'
export type VacancyScheduleType = 'full_time' | 'part_time' | 'shift' | 'flexible'
export type VacancyExperience = 'any' | 'junior' | 'experienced'
export type VacancyApplyMode = 'in_app' | 'phone' | 'both'
export type VacancyStatus = 'draft' | 'published' | 'paused' | 'closed' | 'expired'
export type VacancyAction = 'publish' | 'pause' | 'close' | 'renew'

/** One field of work: the craft (`name`) and the practitioner (`roleName`). */
export interface Specialty {
  key: string
  groupKey: string
  name: string
  nameI18n: LocalizedText
  roleName: string
  roleNameI18n: LocalizedText
  /** Search-only synonyms; filtered over locally so the picker feels instant. */
  aliases: string[]
}

export interface SpecialtyGroup {
  key: string
  name: string
  nameI18n: LocalizedText
  specialties: Specialty[]
}

export interface Vacancy {
  id: string
  partnerId: string
  locationId: string
  specialtyKey: string
  title: string
  titleI18n?: LocalizedText | null
  description: string
  descriptionI18n?: LocalizedText | null
  coverUrl: string
  seats: number

  payType: VacancyPayType
  salonPercent: number | null
  salonPercentMax: number | null
  amount: number | null
  amountMax: number | null
  payPeriod: VacancyPayPeriod
  currency: string

  scheduleType: VacancyScheduleType | null
  scheduleNote: string
  experience: VacancyExperience
  perks: string[]

  applyMode: VacancyApplyMode
  contactPhone: string

  status: VacancyStatus
  publishedAt: string | null
  expiresAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string

  /** Server-computed: `published` but past its expiry reads as expired. */
  effectiveStatus: VacancyStatus
  isExpired: boolean

  location: { id: string; name: string; address: string }
  specialty: Pick<Specialty, 'key' | 'name' | 'nameI18n' | 'roleName' | 'roleNameI18n' | 'groupKey'>
}

/** Writable fields. The server owns status and every lifecycle timestamp. */
export interface VacancyInput {
  locationId: string
  specialtyKey: string
  title?: string
  titleI18n?: LocalizedText | null
  description?: string
  descriptionI18n?: LocalizedText | null
  seats?: number

  payType?: VacancyPayType
  salonPercent?: number | null
  salonPercentMax?: number | null
  amount?: number | null
  amountMax?: number | null
  payPeriod?: VacancyPayPeriod

  scheduleType?: VacancyScheduleType | null
  scheduleNote?: string
  experience?: VacancyExperience
  perks?: string[]

  applyMode?: VacancyApplyMode
  contactPhone?: string
}

export interface ListVacanciesParams {
  status?: 'all' | VacancyStatus
  locationId?: string
  specialtyKey?: string
  search?: string
  page?: number
  pageSize?: number
}

/** Counts per status for the filter chips; `published` excludes expired. */
export type VacancyCounts = Record<string, number>

export const vacanciesService = {
  async list(params: ListVacanciesParams = {}): Promise<Paginated<Vacancy>> {
    return apiGet<Paginated<Vacancy>>('/vacancies', { params })
  },

  async counts(): Promise<VacancyCounts> {
    return apiGet<VacancyCounts>('/vacancies/counts')
  },

  async get(id: string): Promise<Vacancy> {
    return apiGet<Vacancy>(`/vacancies/${id}`)
  },

  async create(input: VacancyInput): Promise<Vacancy> {
    return apiPost<Vacancy>('/vacancies', input)
  },

  async update(id: string, input: Partial<VacancyInput>): Promise<Vacancy> {
    return apiPatch<Vacancy>(`/vacancies/${id}`, input)
  },

  /** Publish / pause / close / renew — verbs, so the server owns the dates. */
  async act(id: string, action: VacancyAction): Promise<Vacancy> {
    return apiPost<Vacancy>(`/vacancies/${id}/actions`, { action })
  },

  async remove(id: string): Promise<void> {
    return apiDelete(`/vacancies/${id}`)
  },
}

export const specialtiesService = {
  /** The whole active catalog, grouped — small enough to filter in the browser. */
  async catalog(): Promise<SpecialtyGroup[]> {
    return apiGet<SpecialtyGroup[]>('/specialties')
  },
}
