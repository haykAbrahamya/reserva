import type { LocalizedText } from '@/types'
import { apiGet } from './http'

// ─────────────────────────────────────────────────────────────
// The shared area catalog — the structured place a branch sits in. Read-only
// here: partners pick from it, platform staff maintain it in the internal
// console. Not product-gated, because a branch's place is organization-level
// data that bookings, courses and vacancies all read.
// ─────────────────────────────────────────────────────────────

export type AreaKind = 'region' | 'city' | 'district'

export interface Area {
  key: string
  parentKey: string | null
  kind: AreaKind
  name: string
  nameI18n: LocalizedText
  /** Search-only synonyms — Soviet-era, colloquial and transliterated names. */
  aliases: string[]
  lat: number | null
  lng: number | null
}

/** A top-level place with the areas selectable underneath it. */
export interface AreaNode extends Area {
  children: Area[]
}

export const areasService = {
  /** The whole active catalog as a tree — ~60 rows, so it ships in one call and
   *  the picker filters it locally. */
  async catalog(): Promise<AreaNode[]> {
    return apiGet<AreaNode[]>('/areas')
  },
}
