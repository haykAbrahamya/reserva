/**
 * SEO category landing pages. Each entry maps a service category (as stored on
 * services, e.g. "Nails") to a clean URL slug + keyword-targeted Armenian head
 * copy so /salons/c/<slug> ranks for real Armenian beauty searches
 * (e.g. "Մատնահարդարում", "Գեղեցկության սրահ").
 *
 * The `match` list is what a category page filters by — it's fed into the
 * marketplace's existing `?service=` filter (case-insensitive substring), so a
 * page can gather several DB categories under one human landing page.
 *
 * This is the single source of truth for both the client route (SEO + pre-seeded
 * filter) and the build-time prerender/sitemap. Keep it curated: only add
 * categories worth a dedicated indexable page.
 */
export interface SeoCategory {
  /** URL slug: /salons/c/<slug>. */
  slug: string
  /** DB category term(s) this page filters the marketplace by. */
  match: string
  /** Armenian H1 (also the primary keyword). */
  h1: string
  /** <title> (brand appended by the caller). */
  title: string
  /** Meta description (~150–160 chars). */
  description: string
  /** Short intro paragraph rendered above the grid. */
  intro: string
}

// Single source of truth (also imported by scripts/prerender.mjs) — see
// categories.data.json. Keep it curated: only categories worth a dedicated page.
import data from './categories.data.json'

export const SEO_CATEGORIES: SeoCategory[] = data as SeoCategory[]

/** Lookup a category by its URL slug. */
export function categoryBySlug(slug: string): SeoCategory | undefined {
  return SEO_CATEGORIES.find((c) => c.slug === slug)
}
