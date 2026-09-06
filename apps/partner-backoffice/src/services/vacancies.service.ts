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

/*
 * ── Applications ────────────────────────────────────────────
 *
 * The salon's side of the board. The public app writes these rows; everything
 * here reads and triages them.
 */

export type VacancyApplicationStatus = 'new' | 'contacted' | 'shortlisted' | 'rejected'
export type VacancyApplicationSource = 'board' | 'manual'

/**
 * What an application says about the account behind it.
 *
 * The server draws the privacy line, not this file: an application carries what
 * the applicant TYPED into this salon's form, while their profile is a separate
 * thing they may not have published. So `profileId` is null unless they did —
 * and `hasAccount` still tells the salon they are a registered specialist
 * rather than an anonymous walk-up, which is useful triage either way.
 */
export interface ApplicantAccount {
  hasAccount: boolean
  /** Non-null only when the applicant published their profile. */
  profileId: string | null
  /** Rides the same gate as the link: empty unless the profile is public. */
  avatarUrl: string
}

/**
 * What an application looks like when the API has not been deployed yet.
 *
 * This app and the API ship through separate pipelines, so a backoffice that
 * knows about `account` WILL at some point talk to an API that does not. That
 * is a missing feature, not a broken page — and the first version of this
 * crashed the whole Vacancies route on it, because a `.map` reached straight
 * into `a.account.avatarUrl`.
 */
const NO_ACCOUNT: ApplicantAccount = { hasAccount: false, profileId: null, avatarUrl: '' }

/** Read the account block defensively; an older API simply omits it. */
export function applicantAccount(application: VacancyApplication): ApplicantAccount {
  return application.account ?? NO_ACCOUNT
}

export interface VacancyApplication {
  id: string
  name: string
  phone: string
  email: string
  /** Their message to the salon — the free text that actually gets read. */
  note: string
  /** The UI language they applied in, so the salon calls back in it. */
  locale: string
  source: VacancyApplicationSource
  status: VacancyApplicationStatus
  /** First time somebody triaged it — what makes the "new" badge trustworthy. */
  seenAt: string | null
  createdAt: string
  /**
   * Absent from an API older than this field — read it through
   * `applicantAccount`, never directly.
   */
  account?: ApplicantAccount
}

/** Per-listing applicant totals, keyed by vacancy id. */
export type ApplicationCounts = Record<string, { total: number; unseen: number }>

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

  /**
   * Applicant totals for every listing, in one request.
   *
   * One grouped query on the server rather than a count per card — the
   * alternative is the classic N+1 that makes a list of twelve listings issue
   * twenty-five requests.
   */
  async applicationCounts(): Promise<ApplicationCounts> {
    return apiGet<ApplicationCounts>('/vacancies/applications/counts')
  },

  async applications(vacancyId: string): Promise<VacancyApplication[]> {
    return apiGet<VacancyApplication[]>(`/vacancies/${vacancyId}/applications`)
  },

  /**
   * Move an applicant through triage.
   *
   * Returns the updated row, so the caller replaces one item instead of
   * refetching a list the reader is looking at.
   */
  async triage(
    vacancyId: string,
    applicationId: string,
    status: VacancyApplicationStatus,
  ): Promise<VacancyApplication> {
    return apiPatch<VacancyApplication>(
      `/vacancies/${vacancyId}/applications/${applicationId}`,
      { status },
    )
  },
}

export const specialtiesService = {
  /** The whole active catalog, grouped — small enough to filter in the browser. */
  async catalog(): Promise<SpecialtyGroup[]> {
    return apiGet<SpecialtyGroup[]>('/specialties')
  },
}
