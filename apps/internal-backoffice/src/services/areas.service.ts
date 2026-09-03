import { apiGet, apiPost, apiPatch, apiDelete } from './http'
import type { RequiredI18n } from './specialties.service'

// ─────────────────────────────────────────────────────────────
// The shared area catalog — the structured place a branch sits in. Platform
// vocabulary like specialties: partners pick from it, staff maintain it. It is
// what makes "vacancies in Davtashen" a filter rather than a text search.
// ─────────────────────────────────────────────────────────────

/**
 * How deep an area sits. One self-referencing tree rather than a fixed pair of
 * tables, because the depth genuinely varies — Yerevan has 12 districts, Gyumri
 * has none, and provinces sit above cities.
 */
export type AreaKind = 'region' | 'city' | 'district'

export interface Area {
  key: string
  parentKey: string | null
  kind: AreaKind
  /** English — source of truth for search and sort. */
  name: string
  /** Required { hy, ru }. Data, not an override blob. */
  nameI18n: RequiredI18n
  /** Search-only synonyms, lowercased server-side. Never rendered. */
  aliases: string[]
  lat: number | null
  lng: number | null
  sortOrder: number
  active: boolean
  /** Branches currently in this area — a non-zero count blocks deletion. */
  usageCount: number
  /** Child areas — a non-zero count also blocks deletion. */
  childCount: number
  parent: { key: string; name: string } | null
}

export interface AreaInput {
  key?: string
  parentKey: string | null
  kind: AreaKind
  name: string
  nameI18n: RequiredI18n
  aliases: string[]
  lat: number | null
  lng: number | null
  sortOrder: number
  active: boolean
}

export const areasService = {
  list(search?: string): Promise<Area[]> {
    return apiGet<Area[]>('/platform/areas', { params: search ? { search } : {} })
  },
  create(input: AreaInput): Promise<Area> {
    return apiPost<Area>('/platform/areas', input)
  },
  update(key: string, input: Partial<AreaInput>): Promise<Area> {
    return apiPatch<Area>(`/platform/areas/${key}`, input)
  },
  remove(key: string): Promise<void> {
    return apiDelete(`/platform/areas/${key}`)
  },
}
