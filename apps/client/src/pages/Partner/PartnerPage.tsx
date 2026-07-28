import { useEffect, useState, useCallback } from 'react'
import { getPartnerBySlug } from '@/services/booking.service'
import { useTenantSlug } from '@/hooks/useTenantSlug'
import { useAppSelector } from '@/store/hooks'
import type { PublicPartner } from '@/mock/partners'
import { partnerBrandVars } from './partnerBrand'
import { PartnerNotFound } from './components/PartnerNotFound/PartnerNotFound'
import { PartnerNav } from './components/PartnerNav/PartnerNav'
import { resolveTemplate } from './templates/registry'
import { BookingFlow } from './booking/BookingFlow'
import { SpecialistModal } from './components/SpecialistModal/SpecialistModal'
import { useSeo } from '@/hooks/useSeo'
import { useI18n } from '@/i18n'
import { hasExplicitLocaleChoice, isLocale } from '@/i18n/config'
import type { Specialist } from '@reserva/shared'
import s from './PartnerPage.module.scss'

// Map our weekly schedule ({ mon: { enabled, start, end }, … }) to schema.org
// OpeningHoursSpecification entries. Used in the partner LocalBusiness JSON-LD.
const DOW: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
}
function openingHoursSpec(hours: unknown): Array<Record<string, unknown>> {
  if (!hours || typeof hours !== 'object') return []
  const out: Array<Record<string, unknown>> = []
  for (const [key, day] of Object.entries(hours as Record<string, { enabled?: boolean; start?: string; end?: string }>)) {
    const name = DOW[key]
    if (!name || !day?.enabled || !day.start || !day.end) continue
    out.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: name,
      opens: day.start,
      closes: day.end,
    })
  }
  return out
}

export function PartnerPage() {
  const slug = useTenantSlug()
  const { t, setLocale } = useI18n()
  const theme = useAppSelector((st) => st.theme.theme)
  const [partner, setPartner] = useState<PublicPartner | null>(null)
  const [loading, setLoading] = useState(true)

  // Booking flow state. `seedServiceId` lets a "Book" on a specific service
  // pre-select it when the flow opens.
  const [bookingOpen, setBookingOpen] = useState(false)
  const [seedServiceId, setSeedServiceId] = useState<string | null>(null)
  const [seedSpecialistId, setSeedSpecialistId] = useState<string | null>(null)

  // Specialist detail popup.
  const [activeSpecialist, setActiveSpecialist] = useState<Specialist | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    getPartnerBySlug(slug ?? '').then(p => {
      if (!active) return
      setPartner(p)
      setLoading(false)
      // Open the page in the partner's chosen default language — but ONLY for a
      // visitor who hasn't explicitly picked one (their choice always wins).
      if (p && !hasExplicitLocaleChoice() && isLocale(p.defaultLocale)) {
        setLocale(p.defaultLocale)
      }
    })
    return () => { active = false }
  }, [slug, setLocale])

  // Per-salon SEO: each partner page is a unique indexable URL. We give it the
  // salon's own title/description + a LocalBusiness structured-data record so it
  // can surface for "<salon name>" and local "book <service>" searches. Called
  // unconditionally (rules of hooks) with safe fallbacks until the data loads.
  const seoName = partner?.name ?? 'Reserva'
  const partnerUrl = slug ? `https://reserva.am/p/${slug}` : 'https://reserva.am'
  useSeo({
    title: partner ? t('seo.partner.title', { name: seoName }) : t('seo.home.title'),
    description: partner
      ? (partner.presentation?.about?.slice(0, 160) || t('seo.partner.description', { name: seoName }))
      : t('seo.home.description'),
    path: slug ? `/p/${slug}` : '/',
    image: partner?.presentation?.logoUrl || undefined,
    noindex: !partner,
    jsonLd: partner
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'HealthAndBeautyBusiness',
              '@id': `${partnerUrl}#business`,
              name: partner.name,
              description: partner.presentation?.about?.slice(0, 300),
              // Match the canonical host (reserva.am/p/:slug). The salon is also
              // reachable at slug.reserva.am, but we canonicalize to the path
              // form everywhere so Google sees one URL, not two duplicates.
              url: partnerUrl,
              ...(partner.presentation?.logoUrl ? { image: partner.presentation.logoUrl } : {}),
              ...(partner.presentation?.rating > 0 && partner.presentation?.reviews > 0
                ? {
                    aggregateRating: {
                      '@type': 'AggregateRating',
                      ratingValue: partner.presentation.rating,
                      reviewCount: partner.presentation.reviews,
                    },
                  }
                : {}),
              address: partner.locations?.map((l) => ({
                '@type': 'PostalAddress',
                streetAddress: l.address,
                addressLocality: 'Yerevan',
                addressCountry: 'AM',
              })),
              // First branch with real coordinates → a geo point (helps local
              // pack / map eligibility).
              ...(() => {
                const geo = partner.locations?.find(
                  (l) => typeof l.lat === 'number' && typeof l.lng === 'number',
                )
                return geo
                  ? { geo: { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng } }
                  : {}
              })(),
              telephone: partner.locations?.find((l) => l.phone)?.phone,
              // Weekly opening hours from the first branch's schedule.
              ...(() => {
                const spec = openingHoursSpec(partner.locations?.[0]?.hours)
                return spec.length ? { openingHoursSpecification: spec } : {}
              })(),
              ...(() => {
                const prices = partner.services?.filter((sv) => sv.active).map((sv) => sv.price) ?? []
                return prices.length
                  ? { priceRange: `${Math.min(...prices)}–${Math.max(...prices)} AMD` }
                  : {}
              })(),
              areaServed: { '@type': 'Country', name: 'Armenia' },
              makesOffer: partner.services
                ?.filter((sv) => sv.active)
                .slice(0, 20)
                .map((sv) => ({
                  '@type': 'Offer',
                  itemOffered: { '@type': 'Service', name: sv.name },
                  price: sv.price,
                  priceCurrency: 'AMD',
                })),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Reserva', item: 'https://reserva.am' },
                { '@type': 'ListItem', position: 2, name: t('salons.hero.title'), item: 'https://reserva.am/salons' },
                { '@type': 'ListItem', position: 3, name: partner.name, item: partnerUrl },
              ],
            },
          ],
        }
      : undefined,
  })

  const openBooking = useCallback((serviceId?: string) => {
    setSeedServiceId(serviceId ?? null)
    setSeedSpecialistId(null)
    setBookingOpen(true)
  }, [])

  const bookWithSpecialist = useCallback((specialistId: string) => {
    setSeedServiceId(null)
    setSeedSpecialistId(specialistId)
    setBookingOpen(true)
  }, [])

  if (loading) {
    return (
      <div className={s.loading}>
        <div className={s.spinner} />
        <div className={s.loadingText}>{t('partner.loading')}</div>
      </div>
    )
  }

  if (!partner) {
    return <PartnerNotFound />
  }

  // Re-skin the whole page in the partner's brand color. Every section reads
  // `--accent` / `--accent-soft` / `--accent-strong` / `--fg-on-accent` (via
  // the shared SCSS `$accent*` aliases), so overriding them here scopes the
  // partner's palette to this page — the same brand color used for the
  // specialist avatars. See partnerBrand.ts.
  const brandVars = partnerBrandVars(partner, theme === 'dark')

  // Pick the layout for this partner's template (defaults to classic). The
  // template is pure layout; this page still owns all booking state and renders
  // the shared BookingFlow / SpecialistModal below, so the booking flow is never
  // templatized or duplicated. See templates/registry.ts.
  const Template = resolveTemplate(partner.template)

  return (
    <div className={s.page} style={brandVars}>
      <PartnerNav partner={partner} onBook={() => openBooking()} />

      <Template partner={partner} onBook={openBooking} onOpenSpecialist={setActiveSpecialist} />

      {activeSpecialist && (
        <SpecialistModal
          partner={partner}
          specialist={activeSpecialist}
          onClose={() => setActiveSpecialist(null)}
          onBook={() => bookWithSpecialist(activeSpecialist.id)}
        />
      )}

      {bookingOpen && (
        <BookingFlow
          partner={partner}
          seedServiceId={seedServiceId}
          seedSpecialistId={seedSpecialistId}
          onClose={() => setBookingOpen(false)}
        />
      )}
    </div>
  )
}
