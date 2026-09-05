import type { VacancyDetail } from '@/api/types'

// ─────────────────────────────────────────────────────────────
// schema.org JobPosting.
//
// The highest-leverage SEO on the whole product: Google surfaces JobPosting
// markup in its jobs experience, which is where people actually search for
// work. A listing page without it is a page that competes on ordinary blue
// links; with it, the role, the place and the pay appear in the result itself.
//
// Everything below is drawn from real fields. Nothing is invented to satisfy a
// recommended property — a fabricated salary or a guessed employment type is
// worse than an absent one, both for the searcher and because structured data
// that contradicts the page is a manual-action risk.
// ─────────────────────────────────────────────────────────────

/** Our schedule vocabulary mapped onto schema.org's employmentType. */
const EMPLOYMENT_TYPE: Record<string, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  shift: 'PART_TIME',
  flexible: 'CONTRACTOR',
}

/**
 * A chair rental is not employment, and a commission place usually is not
 * either — so both are declared as CONTRACTOR rather than borrowing the
 * schedule's type. Getting this wrong would put self-employed chair rentals in
 * front of people filtering for salaried jobs.
 */
function employmentType(v: VacancyDetail): string[] {
  if (v.payType === 'rent') return ['CONTRACTOR']
  const fromSchedule = v.scheduleType ? EMPLOYMENT_TYPE[v.scheduleType] : undefined
  if (v.payType === 'percentage') return [fromSchedule ?? 'CONTRACTOR']
  return fromSchedule ? [fromSchedule] : []
}

/**
 * baseSalary, only where it is honestly a salary.
 *
 * A rent is money flowing the other way and a commission split is a
 * percentage, so neither is expressed here — publishing a chair rent as a
 * salary would advertise 150,000 as earnings when it is a cost.
 */
function baseSalary(v: VacancyDetail): Record<string, unknown> | undefined {
  if (v.payType !== 'salary' || v.amount == null) return undefined

  const value =
    v.amountMax != null && v.amountMax !== v.amount
      ? { '@type': 'QuantitativeValue', minValue: v.amount, maxValue: v.amountMax, unitText: 'MONTH' }
      : { '@type': 'QuantitativeValue', value: v.amount, unitText: 'MONTH' }

  return { '@type': 'MonetaryAmount', currency: v.currency || 'AMD', value }
}

export function jobPostingJsonLd(
  v: VacancyDetail,
  title: string,
  salonName: string,
): Record<string, unknown> {
  const area = v.branch.area
  const city = area?.parent?.name ?? area?.name ?? ''

  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    // Google requires a description and rejects an empty one, so a listing with
    // no text falls back to the facts the page does state rather than to ''.
    description:
      v.description.trim() ||
      `${title} — ${salonName}${city ? `, ${city}` : ''}. ${v.branch.address}`,
    datePosted: v.publishedAt ?? undefined,
    validThrough: v.expiresAt ?? undefined,
    hiringOrganization: {
      '@type': 'Organization',
      name: salonName,
      ...(v.salon.slug ? { sameAs: `https://${v.salon.slug}.reserva.am` } : {}),
      ...(v.salon.logoUrl ? { logo: v.salon.logoUrl } : {}),
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: v.branch.address,
        addressLocality: city || undefined,
        addressRegion: area?.name || undefined,
        addressCountry: 'AM',
      },
      ...(v.branch.lat != null && v.branch.lng != null
        ? {
            geo: { '@type': 'GeoCoordinates', latitude: v.branch.lat, longitude: v.branch.lng },
          }
        : {}),
    },
    ...(v.seats > 1 ? { totalJobOpenings: v.seats } : {}),
  }

  const employment = employmentType(v)
  if (employment.length) json.employmentType = employment

  const salary = baseSalary(v)
  if (salary) json.baseSalary = salary

  // Drop the keys that came out undefined: a JSON-LD block containing
  // "datePosted": null is invalid markup, not a missing field.
  return Object.fromEntries(Object.entries(json).filter(([, value]) => value !== undefined))
}

// ─────────────────────────────────────────────────────────────
// The other three shapes this site emits.
//
// A JobPosting describes ONE listing. A landing page is a collection, a
// listing sits inside a hierarchy, and the site as a whole is an entity — and
// Google reads each of those as a different type. Building them here keeps
// every `@context` in one file, so a page can never ship half a graph.
// ─────────────────────────────────────────────────────────────

/** Absolute URL for a path on this origin. */
const abs = (path: string): string =>
  typeof window === 'undefined' ? path : `${window.location.origin}${path}`

export interface Crumb {
  name: string
  path: string
}

/**
 * BreadcrumbList.
 *
 * Worth the few lines because Google renders it IN the result, replacing the
 * raw URL with "Reserva › Chair rental › …". On a job board, where a searcher
 * is scanning a page of near-identical blue links, that trail is often the only
 * thing distinguishing one result from the next.
 */
export function breadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  }
}

/**
 * A landing page: CollectionPage wrapping an ItemList of the listings on it,
 * plus its breadcrumb.
 *
 * The items carry a URL and a name only. A full JobPosting per card would
 * duplicate what the listing page itself declares, and duplicated postings
 * across two URLs is exactly what Google's job guidelines warn against.
 */
export function collectionJsonLd(input: {
  name: string
  description: string
  path: string
  crumbs: Crumb[]
  items: Array<{ id: string; title: string }>
}): Record<string, unknown> {
  const { name, description, path, crumbs, items } = input
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: abs(path),
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: abs(c.path),
      })),
    },
    ...(items.length
      ? {
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: items.length,
            itemListElement: items.slice(0, 20).map((v, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: abs(`/v/${v.id}`),
              name: v.title,
            })),
          },
        }
      : {}),
  }
}

/**
 * WebSite + Organization for the board itself.
 *
 * `potentialAction` declares the search endpoint, which is what lets Google
 * offer a search box for the site directly in its results. It points at the
 * board's own `?q=` — the same parameter the address bar uses — so the feature
 * cannot drift from the app.
 */
export function siteJsonLd(name: string, description: string): Record<string, unknown> {
  const site = abs('/')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${site}#website`,
        url: site,
        name,
        description,
        inLanguage: ['hy', 'en', 'ru'],
        publisher: { '@id': `${site}#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${site}?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${site}#organization`,
        name: 'Reserva',
        url: 'https://reserva.am',
        logo: 'https://reserva.am/icon-512.png',
        areaServed: { '@type': 'Country', name: 'Armenia' },
      },
    ],
  }
}

/**
 * Combine several nodes into one @graph.
 *
 * Each builder above returns a standalone, valid document with its own
 * `@context`, because most pages emit exactly one. When a page emits two — a
 * listing declares both what it is and how you got to it — nesting those
 * documents would repeat `@context` inside the graph. Harmless, but it makes
 * the markup read as two pasted-together fragments rather than one statement
 * about one page, so the key is lifted to the top and dropped from the nodes.
 */
export function graph(...nodes: Array<Record<string, unknown> | null>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter((n): n is Record<string, unknown> => n !== null).map((n) => {
      const { '@context': _dropped, ...rest } = n
      return rest
    }),
  }
}
