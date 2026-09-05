import { parseFilters, type BoardFilters } from './filters'
import data from './landings.data.json'

// ─────────────────────────────────────────────────────────────
// Keyword landing pages.
//
// The board is one URL over a query string, and a filtered board is
// deliberately kept out of the index — every filter combination is a distinct
// URL over near-identical content. That is right for arbitrary filtering and
// wrong for the handful of searches people actually type: "վարսավիրի
// աշխատանք", "աթոռ վարձով", "աշխատանք Երևանում". Those deserve a real page
// with a real title, a real H1 and copy of their own.
//
// So this file is a CURATED list, not a generated cross product. Sixty
// specialties times sixty areas would be 3,600 near-identical pages, which is
// how a site earns a thin-content problem rather than traffic. Each entry here
// is a search someone performs, with copy written for that search.
//
// It is the single source of truth for three consumers:
//   - the /jobs/:slug route          (src/pages/Landing)
//   - the build-time prerender       (scripts/prerender.mjs)
//   - the static sitemap it emits    (dist/sitemap.xml)
// ─────────────────────────────────────────────────────────────

/** Which shelf an entry belongs on, for the browse links and the breadcrumb. */
export type LandingKind = 'role' | 'terms' | 'place'

export interface LandingCopy {
  /** The page's H1 — and the primary keyword. */
  h1: string
  /** <title>, brand appended by the caller. */
  title: string
  /** Meta description, ~150-160 characters. */
  description: string
  /** One line under the H1. */
  intro: string
  /**
   * A paragraph of genuine content about this kind of work.
   *
   * Load-bearing rather than padding: a young board has few listings, and a
   * page that is a heading over an empty list is thin whatever its title says.
   * This is also what keeps sixteen sibling pages from reading as one page
   * with the noun swapped.
   */
  body: string
}

export interface Landing {
  /** URL slug: /jobs/<slug>. Latin, because that is how people type Armenian
   *  into an address bar. */
  slug: string
  kind: LandingKind
  /**
   * The board query this page IS, as a query string.
   *
   * Deliberately a query string rather than a filter object: it round-trips
   * through the same `parseFilters` the address bar uses, so a landing page
   * cannot drift from what the equivalent filtered board would show, and
   * adding a filter later needs no change here.
   */
  query: string
  copy: Record<string, LandingCopy>
}

export const LANDINGS: Landing[] = data as Landing[]

/** The route prefix. One place, so a rename cannot half-happen. */
export const LANDING_PREFIX = '/jobs'

/**
 * A landing page's path — WITH a trailing slash, everywhere.
 *
 * Not cosmetic. These pages are prerendered to dist/jobs/<slug>/index.html, and
 * nginx answers a request for a directory with a 301 to the slashed form
 * (verified against the client app's /salons/c/<slug> pages in production). So
 * the slashed URL is the one actually served, and it is therefore the only
 * correct canonical. A canonical, a sitemap entry or an internal link in the
 * other shape either contradicts the served page — which Search Console
 * reports as "Alternate page with proper canonical tag" — or spends a redirect
 * hop on every crawl.
 *
 * One shape, used by the router, the links, the canonical and both sitemaps,
 * so the question cannot be answered differently in two places.
 */
export const landingPath = (slug: string): string => `${LANDING_PREFIX}/${slug}/`

export function landingBySlug(slug: string): Landing | undefined {
  return LANDINGS.find((l) => l.slug === slug)
}

/** This page's copy in the visitor's language, falling back to Armenian. */
export function landingCopy(landing: Landing, locale: string): LandingCopy {
  return landing.copy[locale] ?? landing.copy.hy
}

/** The board filters this page pre-selects. */
export function landingFilters(landing: Landing): BoardFilters {
  return parseFilters(new URLSearchParams(landing.query))
}

/**
 * Where to send someone who wants to keep filtering from here.
 *
 * The landing page is a fixed query with its own copy; the board is where a
 * selection can be changed. Handing over the same query string means nothing
 * is lost in the move.
 */
export function boardHrefFor(landing: Landing): string {
  return `/?${landing.query}`
}

/** The landings grouped for the browse block, in a fixed reading order. */
export const LANDING_KINDS: LandingKind[] = ['role', 'terms', 'place']

export function landingsByKind(kind: LandingKind): Landing[] {
  return LANDINGS.filter((l) => l.kind === kind)
}

/**
 * The landing pages a given listing belongs to.
 *
 * Used to link from a listing page back up to its categories. Deep pages
 * linking UP is what circulates authority through a site: a listing that ranks
 * passes some of that to "Վարսավիրի աշխատանք", which is the page that has to
 * rank for the search everyone actually types. It is also the useful next click
 * for a reader who has just decided this particular job is not for them.
 *
 * Matched by re-parsing each entry's own query rather than by a second table of
 * keys, so a page cannot claim a listing its filters would exclude.
 */
export function landingsForVacancy(
  input: { specialtyKey: string; areaKeys: string[]; payType: string },
  limit = 4,
): Landing[] {
  const { specialtyKey, areaKeys, payType } = input
  const hits: Landing[] = []
  for (const landing of LANDINGS) {
    const f = landingFilters(landing)
    const matches =
      (f.specialty.length > 0 && f.specialty.includes(specialtyKey)) ||
      (f.area.length > 0 && f.area.some((k) => areaKeys.includes(k))) ||
      (f.payType.length > 0 && (f.payType as string[]).includes(payType))
    if (matches) hits.push(landing)
    if (hits.length >= limit) break
  }
  return hits
}
