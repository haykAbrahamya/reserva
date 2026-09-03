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
