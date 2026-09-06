import { useMemo } from 'react'
import { fetchMeta } from '@/api/board.api'
import type { AreaNode, SpecialtyGroup } from '@/api/types'
import { useLocalized } from '@/i18n'
import { areaLabel, type Localizer } from './areas'
import { useAsync } from './useAsync'

/**
 * Turning catalog keys into words people read.
 *
 * A profile, a directory card and a public page all store the same flat arrays
 * of `specialtyKeys` and `areaKeys` and all three have to render them as
 * localized names. Before this, each would have walked the group tree itself —
 * three walks, three near-identical null-handling decisions, and three places
 * for an unknown key to render as a raw slug.
 *
 * The rule for an unknown key is the interesting part and it is decided once
 * here: show nothing rather than the key. A specialty that was renamed or
 * removed from the catalog leaves the key behind on every profile that claimed
 * it, and «hair-styling» printed in the middle of an Armenian page is worse
 * than one missing chip.
 */

/** Human label for one specialty key, or null when the catalog has no such key. */
export function specialtyLabel(
  key: string,
  groups: SpecialtyGroup[],
  loc: Localizer,
): { label: string; group?: string } | null {
  for (const group of groups) {
    const match = group.specialties.find((s) => s.key === key)
    if (match) {
      return {
        label: loc(match.roleName, match.roleNameI18n),
        group: loc(group.name, group.nameI18n),
      }
    }
  }
  return null
}

export interface Taxonomy {
  groups: SpecialtyGroup[]
  areaTree: AreaNode[]
  loading: boolean
  /** Localized specialty names, unknown keys dropped. */
  specialtyNames: (keys: string[]) => string[]
  /** Localized area names, unknown keys dropped. */
  areaNames: (keys: string[]) => string[]
}

/**
 * The board's catalogs, plus the two lookups every profile view needs.
 *
 * `fetchMeta` is the same call the board's filter panel makes and it carries
 * long cache headers, so a visitor moving from the board to a profile pays for
 * it once.
 */
export function useTaxonomy(): Taxonomy {
  const loc = useLocalized()
  const meta = useAsync((signal) => fetchMeta(signal), [])

  const groups = meta.data?.specialtyGroups ?? []
  const areaTree = meta.data?.areaTree ?? []

  return useMemo(
    () => ({
      groups,
      areaTree,
      loading: meta.loading && !meta.data,
      specialtyNames: (keys) =>
        keys.flatMap((k) => {
          const hit = specialtyLabel(k, groups, loc)
          return hit ? [hit.label] : []
        }),
      areaNames: (keys) =>
        keys.flatMap((k) => {
          const hit = areaLabel(k, areaTree, loc)
          return hit ? [hit.label] : []
        }),
    }),
    // `groups`/`areaTree` are derived from meta.data, so that is the real dep.
    [meta.data, meta.loading, loc], // eslint-disable-line react-hooks/exhaustive-deps
  )
}
