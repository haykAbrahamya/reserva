import { apiGet, apiPost, apiPatch, apiDelete } from './http'

// ─────────────────────────────────────────────────────────────
// The shared specialty taxonomy — platform-owned vocabulary that every product
// reads. Vacancies picks a role from it today; services and specialist titles
// will read the same rows, which is why translations here are required data
// rather than optional overrides.
// ─────────────────────────────────────────────────────────────

/** Required per-language names. `name`/`roleName` hold the English source. */
export interface RequiredI18n {
  hy: string
  ru: string
}

export interface SpecialtyGroup {
  key: string
  name: string
  nameI18n: RequiredI18n
  sortOrder: number
  active: boolean
  /** How many specialties sit in this group (blocks deleting a non-empty one). */
  specialtyCount: number
}

export interface Specialty {
  key: string
  groupKey: string
  /** The field of work — "Hair styling". */
  name: string
  nameI18n: RequiredI18n
  /** The practitioner — "Hair stylist". */
  roleName: string
  roleNameI18n: RequiredI18n
  /** Search-only synonyms, any language, lowercased server-side. */
  aliases: string[]
  sortOrder: number
  active: boolean
  /** Live vacancies using it — a non-zero count blocks deletion. */
  usageCount: number
}

export interface SpecialtyInput {
  key?: string
  groupKey: string
  name: string
  nameI18n: RequiredI18n
  roleName: string
  roleNameI18n: RequiredI18n
  aliases: string[]
  sortOrder: number
  active: boolean
}

export interface SpecialtyGroupInput {
  key?: string
  name: string
  nameI18n: RequiredI18n
  sortOrder: number
  active: boolean
}

export const specialtiesService = {
  listGroups(): Promise<SpecialtyGroup[]> {
    return apiGet<SpecialtyGroup[]>('/platform/specialty-groups')
  },
  createGroup(input: SpecialtyGroupInput): Promise<SpecialtyGroup> {
    return apiPost<SpecialtyGroup>('/platform/specialty-groups', input)
  },
  updateGroup(key: string, input: Partial<SpecialtyGroupInput>): Promise<SpecialtyGroup> {
    return apiPatch<SpecialtyGroup>(`/platform/specialty-groups/${key}`, input)
  },
  removeGroup(key: string): Promise<void> {
    return apiDelete(`/platform/specialty-groups/${key}`)
  },

  list(search?: string): Promise<Specialty[]> {
    return apiGet<Specialty[]>('/platform/specialties', {
      params: search ? { search } : {},
    })
  },
  create(input: SpecialtyInput): Promise<Specialty> {
    return apiPost<Specialty>('/platform/specialties', input)
  },
  update(key: string, input: Partial<SpecialtyInput>): Promise<Specialty> {
    return apiPatch<Specialty>(`/platform/specialties/${key}`, input)
  },
  remove(key: string): Promise<void> {
    return apiDelete(`/platform/specialties/${key}`)
  },
}
