import type { LocalizedText } from '@reserva/shared'

// ─────────────────────────────────────────────────────────────
// The board's wire shapes.
//
// Hand-written rather than generated, and deliberately narrower than the
// backend row: this file is the contract, so a field that appears here is one
// the UI actually renders. If something is missing from a type, the endpoint is
// not sending it — which is the answer you want when a card renders blank.
//
// Translatable fields always travel as a PAIR: `x` (the base string, source of
// truth) and `xI18n` (per-locale overrides). Resolve them with useLocalized(),
// never by reading `xI18n[locale]` directly — the base is the fallback and
// skipping it is how a Russian visitor gets an empty card.
// ─────────────────────────────────────────────────────────────

export const PAY_TYPES = ['percentage', 'rent', 'salary', 'negotiable'] as const
export type PayType = (typeof PAY_TYPES)[number]

export type PayPeriod = 'day' | 'week' | 'month'

export const SCHEDULE_TYPES = ['full_time', 'part_time', 'shift', 'flexible'] as const
export type ScheduleType = (typeof SCHEDULE_TYPES)[number]

export const EXPERIENCE_LEVELS = ['any', 'junior', 'experienced'] as const
export type Experience = (typeof EXPERIENCE_LEVELS)[number]

export type ApplyMode = 'in_app' | 'phone' | 'both'

export type AreaKind = 'region' | 'city' | 'district'

/** A place as a listing carries it: the area plus the city above it. */
export interface AreaRef {
  key: string
  kind: AreaKind
  name: string
  nameI18n: LocalizedText | null
  parent: { key: string; name: string; nameI18n: LocalizedText | null } | null
}

/** A place as the catalog carries it — with aliases, which is what makes
 *  searching for "Masiv" or "Ленинакан" find anything. */
export interface AreaCatalogItem {
  key: string
  parentKey: string | null
  kind: AreaKind
  name: string
  nameI18n: LocalizedText | null
  aliases: string[]
  lat: number | null
  lng: number | null
}

export interface AreaNode extends AreaCatalogItem {
  children: AreaCatalogItem[]
}

/**
 * A field of work. Both names travel together: `name` labels the WORK ("Hair
 * colouring") and `roleName` labels the PERSON ("Colourist"). A vacancy is
 * about a person, so the board renders `roleName`.
 */
export interface SpecialtyRef {
  key: string
  groupKey: string
  name: string
  nameI18n: LocalizedText | null
  roleName: string
  roleNameI18n: LocalizedText | null
}

export interface SpecialtyCatalogItem extends SpecialtyRef {
  aliases: string[]
}

export interface SpecialtyGroup {
  key: string
  name: string
  nameI18n: LocalizedText | null
  specialties: SpecialtyCatalogItem[]
}

export interface SalonRef {
  id: string
  slug: string | null
  name: string
  nameI18n: LocalizedText | null
  type: string
  typeI18n: LocalizedText | null
  /** The salon's own brand colour. Used INSIDE its card only — never as app
   *  chrome, or the interface would repaint as you scroll. */
  accent: string
  kind: 'salon' | 'single'
  logoUrl: string | null
}

export interface BranchRef {
  id: string
  name: string
  nameI18n: LocalizedText | null
  address: string
  phone: string
  lat: number | null
  lng: number | null
  area: AreaRef | null
}

/** What a card in the list carries. No description — see board.view.ts. */
export interface VacancyCard {
  id: string
  title: string
  titleI18n: LocalizedText | null
  coverUrl: string
  seats: number

  payType: PayType
  /** The share the SALON keeps, so "60/40" can never be read backwards. */
  salonPercent: number | null
  salonPercentMax: number | null
  amount: number | null
  amountMax: number | null
  payPeriod: PayPeriod
  currency: string

  scheduleType: ScheduleType | null
  scheduleNote: string
  experience: Experience
  perks: string[]

  applyMode: ApplyMode
  publishedAt: string | null

  specialty: SpecialtyRef
  salon: SalonRef
  branch: BranchRef
}

export interface VacancyDetail extends VacancyCard {
  description: string
  descriptionI18n: LocalizedText | null
  expiresAt: string | null
  /** Resolved server-side, and EMPTY when the salon asked for online-only
   *  applications — so a call button can trust its presence. */
  contactPhone: string
  whatsapp: string
  acceptsApplications: boolean
}

export interface VacancyDetailResponse {
  vacancy: VacancyDetail
  moreFromSalon: VacancyCard[]
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export interface Facet {
  key: string
  count: number
}

export interface SalonFacet {
  id: string
  slug: string | null
  name: string
  nameI18n: LocalizedText | null
  accent: string
  logoUrl: string | null
  count: number
}

/** Observed min/max, or null when nothing on the board advertises this kind of
 *  pay — in which case the control is hidden rather than drawn dead. */
export interface Bounds {
  min: number
  max: number
}

export interface BoardMeta {
  total: number
  areas: Facet[]
  specialties: Facet[]
  groups: Facet[]
  payTypes: Facet[]
  experience: Facet[]
  schedule: Facet[]
  perks: Facet[]
  perkVocabulary: string[]
  salons: SalonFacet[]
  pay: {
    salary: Bounds | null
    rent: Bounds | null
    percent: Bounds | null
  }
  areaTree: AreaNode[]
  specialtyGroups: SpecialtyGroup[]
}

export interface ApplyResult {
  id: string
  /** True when this replaced an earlier application from the same number. */
  updated: boolean
}
