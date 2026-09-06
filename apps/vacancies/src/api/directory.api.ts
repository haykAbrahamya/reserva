import { apiGet } from './client'

// ─────────────────────────────────────────────────────────────
// The specialist directory — the salon-facing half of the board.
//
// Public and unauthenticated, exactly like the vacancy search: these are
// profiles their owners chose to publish, served from `/board/*` alongside the
// listings. Nothing here needs a session, and nothing here can return an
// unpublished profile — the server decides that, not this file.
//
// A note on the word. The API calls this principal a `Professional` because
// `Specialist` already means something else in this codebase (a salon's staff
// member, owned by a partner). The USER-facing word in all three languages is
// "specialist", so the routes and the copy say specialist while the types say
// professional. That mismatch is deliberate; renaming either one would collide.
// ─────────────────────────────────────────────────────────────

/** One card in the directory. Shaped by the server, cut to card size there. */
export interface SpecialistCard {
  id: string
  name: string
  avatarUrl: string
  specialtyKeys: string[]
  areaKeys: string[]
  experienceYears: number | null
  /** Already truncated on a word boundary by the API. */
  excerpt: string
  previewPhotos: string[]
  photoCount: number
  contactVisible: boolean
  memberSince: string
}

/** A full public profile. Note there is no `email` field at all — by design. */
export interface SpecialistProfile {
  id: string
  name: string
  specialtyKeys: string[]
  areaKeys: string[]
  experienceYears: number | null
  about: string
  avatarUrl: string
  photos: { url: string; label?: string }[]
  /** Null unless the account chose to publish it. */
  phone: string | null
  contactVisible: boolean
  memberSince: string
}

export interface SpecialistSearchResult {
  items: SpecialistCard[]
  total: number
  page: number
  pageSize: number
}

export type SpecialistSort = 'relevant' | 'newest' | 'experience'

export interface SpecialistFilters {
  q: string
  specialty: string[]
  group: string[]
  area: string[]
  experienceMin: number | null
  withPhotos: boolean
  sort: SpecialistSort
  page: number
}

export const EMPTY_SPECIALIST_FILTERS: SpecialistFilters = {
  q: '',
  specialty: [],
  group: [],
  area: [],
  experienceMin: null,
  withPhotos: false,
  sort: 'relevant',
  page: 1,
}

/**
 * Filters → query string.
 *
 * Only non-default values are written, so a pristine search produces a bare
 * `/specialists` rather than a URL full of empty parameters — which is what
 * makes the address bar readable enough to share.
 */
export function specialistQuery(f: SpecialistFilters, pageSize = 12): string {
  const p = new URLSearchParams()
  if (f.q.trim()) p.set('q', f.q.trim())
  for (const [key, list] of [
    ['specialty', f.specialty],
    ['group', f.group],
    ['area', f.area],
  ] as const) {
    if (list.length) p.set(key, list.join(','))
  }
  if (f.experienceMin != null) p.set('experienceMin', String(f.experienceMin))
  if (f.withPhotos) p.set('withPhotos', 'true')
  if (f.sort !== 'relevant') p.set('sort', f.sort)
  if (f.page > 1) p.set('page', String(f.page))
  p.set('pageSize', String(pageSize))
  return p.toString()
}

export function searchSpecialists(
  filters: SpecialistFilters,
  signal?: AbortSignal,
  pageSize = 12,
): Promise<SpecialistSearchResult> {
  return apiGet<SpecialistSearchResult>(`/board/professionals?${specialistQuery(filters, pageSize)}`, signal)
}

export function fetchSpecialist(id: string, signal?: AbortSignal): Promise<SpecialistProfile> {
  return apiGet<SpecialistProfile>(`/board/professionals/${encodeURIComponent(id)}`, signal)
}

/** How many filters are actually narrowing the result — drives the "clear" affordance. */
export function activeSpecialistFilterCount(f: SpecialistFilters): number {
  return (
    (f.q.trim() ? 1 : 0) +
    f.specialty.length +
    f.group.length +
    f.area.length +
    (f.experienceMin != null ? 1 : 0) +
    (f.withPhotos ? 1 : 0)
  )
}
