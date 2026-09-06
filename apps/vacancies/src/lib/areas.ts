import type { LocalizedText } from '@reserva/shared'
import type { AreaCatalogItem, AreaNode, Facet, SpecialtyGroup } from '@/api/types'

// ─────────────────────────────────────────────────────────────
// Working with the taxonomies the board ships whole.
//
// Both catalogs arrive complete (roughly 60 areas, 60 specialties), which is
// what makes everything here possible in the browser: expanding a city into
// its districts, matching an alias, counting a group. No round trip per
// keystroke, and the API filter stays a flat `key IN (...)` with no recursive
// query behind it.
// ─────────────────────────────────────────────────────────────

/** What `useLocalized()` returns. Exported so callers can type against the
 *  real thing rather than restating its shape and drifting from it. */
export type Localizer = (base: string, i18n?: LocalizedText | null) => string

/** Every selectable key under a node: the node itself plus its children. */
export function keysUnder(node: AreaNode): string[] {
  return [node.key, ...node.children.map((c) => c.key)]
}

/**
 * A city is selected when the city key OR any of its districts is.
 *
 * Two states, not three: `all` when every district is in, `some` when only
 * part is. That is what lets one checkbox mean "anywhere in Yerevan" while
 * still showing that three districts are picked.
 */
export function citySelection(
  node: AreaNode,
  selected: readonly string[],
): 'none' | 'some' | 'all' {
  const set = new Set(selected)
  if (set.has(node.key)) return 'all'
  if (node.children.length === 0) return 'none'
  const hits = node.children.filter((c) => set.has(c.key)).length
  if (hits === 0) return 'none'
  return hits === node.children.length ? 'all' : 'some'
}

/**
 * Toggle a whole city.
 *
 * Selecting one stores the CITY key, not its twelve districts: the URL stays
 * short and readable, and the server treats a city key as a real area (branches
 * in Gyumri carry the city key itself). Deselecting clears both the city and
 * any districts under it, so a half-selected city cannot survive the click.
 */
export function toggleCity(node: AreaNode, selected: readonly string[]): string[] {
  const state = citySelection(node, selected)
  const under = new Set(keysUnder(node))
  const rest = selected.filter((k) => !under.has(k))
  return state === 'all' ? rest : [...rest, node.key]
}

/**
 * Toggle a single district.
 *
 * If the city was selected wholesale, picking one district has to expand that
 * shorthand into the remaining districts first — otherwise unticking one
 * district inside "all of Yerevan" would appear to do nothing.
 */
export function toggleDistrict(
  node: AreaNode,
  districtKey: string,
  selected: readonly string[],
): string[] {
  const set = new Set(selected)

  if (set.has(node.key)) {
    const expanded = node.children.map((c) => c.key).filter((k) => k !== districtKey)
    return [...selected.filter((k) => k !== node.key), ...expanded]
  }

  const next = set.has(districtKey)
    ? selected.filter((k) => k !== districtKey)
    : [...selected, districtKey]

  // If that completed the set, collapse back to the city key so the URL and the
  // checkbox agree with each other.
  const chosen = new Set(next)
  const allIn = node.children.length > 0 && node.children.every((c) => chosen.has(c.key))
  if (!allIn) return next
  return [...next.filter((k) => !node.children.some((c) => c.key === k)), node.key]
}

/**
 * Does this area match what someone typed?
 *
 * Aliases are the whole reason this exists: people search for "Masiv", not
 * "Ajapnyak", and for "Ленинакан" rather than "Gyumri". The catalog carries
 * those synonyms so the box finds what its user means rather than what the
 * registry calls it.
 */
export function areaMatches(area: AreaCatalogItem, needle: string): boolean {
  if (!needle) return true
  const q = needle.toLowerCase()
  const fields = [
    area.key,
    area.name,
    area.nameI18n?.hy,
    area.nameI18n?.ru,
    area.nameI18n?.en,
    ...area.aliases,
  ]
  return fields.some((f) => (f ?? '').toLowerCase().includes(q))
}

/** Filter the tree, keeping a city whenever it OR one of its districts hits. */
export function filterAreaTree(tree: AreaNode[], needle: string): AreaNode[] {
  if (!needle.trim()) return tree
  const q = needle.trim()
  return tree
    .map((node) => {
      if (areaMatches(node, q)) return node
      const children = node.children.filter((c) => areaMatches(c, q))
      return children.length ? { ...node, children } : null
    })
    .filter((n): n is AreaNode => n !== null)
}

/** Human label for one area, with its city when that adds anything. */
export function areaLabel(
  key: string,
  tree: AreaNode[],
  loc: Localizer,
): { label: string; parent?: string } | null {
  for (const node of tree) {
    if (node.key === key) return { label: loc(node.name, node.nameI18n) }
    const child = node.children.find((c) => c.key === key)
    if (child) {
      return {
        label: loc(child.name, child.nameI18n),
        parent: loc(node.name, node.nameI18n),
      }
    }
  }
  return null
}

// ── Specialties ──────────────────────────────────────────────

export function specialtyMatches(
  s: { key: string; name: string; nameI18n: LocalizedText | null; roleName: string; roleNameI18n: LocalizedText | null; aliases: string[] },
  needle: string,
): boolean {
  if (!needle) return true
  const q = needle.toLowerCase()
  const fields = [
    s.key,
    s.name,
    s.roleName,
    s.nameI18n?.hy,
    s.nameI18n?.ru,
    s.nameI18n?.en,
    s.roleNameI18n?.hy,
    s.roleNameI18n?.ru,
    s.roleNameI18n?.en,
    ...s.aliases,
  ]
  return fields.some((f) => (f ?? '').toLowerCase().includes(q))
}

/** Filter groups, keeping a group when its name OR any specialty matches. */
export function filterSpecialtyGroups(groups: SpecialtyGroup[], needle: string): SpecialtyGroup[] {
  if (!needle.trim()) return groups
  const q = needle.trim().toLowerCase()
  return groups
    .map((g) => {
      const groupHit = [g.key, g.name, g.nameI18n?.hy, g.nameI18n?.ru, g.nameI18n?.en].some((f) =>
        (f ?? '').toLowerCase().includes(q),
      )
      if (groupHit) return g
      const specialties = g.specialties.filter((s) => specialtyMatches(s, q))
      return specialties.length ? { ...g, specialties } : null
    })
    .filter((g): g is SpecialtyGroup => g !== null)
}

// ── Facets ───────────────────────────────────────────────────

/** Facet lists to a lookup, so a render loop is O(1) per option. */
export function facetMap(facets: Facet[] | undefined): Map<string, number> {
  return new Map((facets ?? []).map((f) => [f.key, f.count]))
}
