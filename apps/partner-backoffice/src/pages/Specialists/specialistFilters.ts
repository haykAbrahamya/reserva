import { worksAt } from '@reserva/shared'
import type { Service, Specialist } from '@/types'

export interface SpecialistFilter {
  /** Name search as typed — matched against every language of the name. */
  query: string
  /** Branch id; '' = every branch. */
  branchId: string
  /** Base service categories; a specialist matches when they do ANY of them. Empty = all. */
  categories: string[]
}

export const isFiltering = (f: SpecialistFilter) =>
  f.query.trim() !== '' || f.branchId !== '' || f.categories.length > 0

/**
 * The categories worth offering as a filter: those of services someone on the
 * roster actually does — a category nobody does could only ever filter to an
 * empty list. One service per category, so the caller can localize its label.
 */
export function rosterCategories(specialists: Specialist[], services: Service[]): Service[] {
  const done = new Set(specialists.flatMap(sp => sp.services))
  const byCategory = new Map<string, Service>()
  for (const svc of services) {
    const cat = svc.category?.trim()
    if (cat && done.has(svc.id) && !byCategory.has(cat)) byCategory.set(cat, svc)
  }
  return [...byCategory.values()]
}

/** The roster narrowed by name, branch and categories (all must match). */
export function filterSpecialists(
  specialists: Specialist[],
  services: Service[],
  f: SpecialistFilter,
): Specialist[] {
  const q = f.query.trim().toLocaleLowerCase()
  const wanted = new Set(f.categories)
  const categoryOf = new Map(services.map(svc => [svc.id, svc.category?.trim() ?? '']))

  return specialists.filter(sp =>
    (!q || [sp.name, sp.nameI18n?.hy, sp.nameI18n?.en, sp.nameI18n?.ru]
      .some(name => name?.toLocaleLowerCase().includes(q))) &&
    (!f.branchId || worksAt(sp, f.branchId)) &&
    (wanted.size === 0 || sp.services.some(id => wanted.has(categoryOf.get(id) ?? ''))),
  )
}
