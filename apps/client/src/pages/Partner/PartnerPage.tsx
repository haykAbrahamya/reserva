import { useEffect, useState, useCallback } from 'react'
import { getPartnerBySlug } from '@/services/booking.service'
import { useTenantSlug } from '@/hooks/useTenantSlug'
import { useAppSelector } from '@/store/hooks'
import type { PublicPartner } from '@/mock/partners'
import { partnerBrandVars } from './partnerBrand'
import { PartnerNotFound } from './components/PartnerNotFound/PartnerNotFound'
import { PartnerNav } from './components/PartnerNav/PartnerNav'
import { PartnerHero } from './sections/PartnerHero/PartnerHero'
import { PartnerAbout } from './sections/PartnerAbout/PartnerAbout'
import { PartnerGallery } from './sections/PartnerGallery/PartnerGallery'
import { PartnerServices } from './sections/PartnerServices/PartnerServices'
import { PartnerLocations } from './sections/PartnerLocations/PartnerLocations'
import { PartnerTeam } from './sections/PartnerTeam/PartnerTeam'
import { PartnerFooter } from './sections/PartnerFooter/PartnerFooter'
import { BookingFlow } from './booking/BookingFlow'
import { SpecialistModal } from './components/SpecialistModal/SpecialistModal'
import { useSeo } from '@/hooks/useSeo'
import { useT } from '@/i18n'
import type { Specialist } from '@reserva/shared'
import s from './PartnerPage.module.scss'

export function PartnerPage() {
  const slug = useTenantSlug()
  const t = useT()
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
    })
    return () => { active = false }
  }, [slug])

  // Per-salon SEO: each partner page is a unique indexable URL. We give it the
  // salon's own title/description + a LocalBusiness structured-data record so it
  // can surface for "<salon name>" and local "book <service>" searches. Called
  // unconditionally (rules of hooks) with safe fallbacks until the data loads.
  const seoName = partner?.name ?? 'Reserva'
  useSeo({
    title: partner ? t('seo.partner.title', { name: seoName }) : t('seo.home.title'),
    description: partner
      ? (partner.presentation?.about?.slice(0, 160) || t('seo.partner.description', { name: seoName }))
      : t('seo.home.description'),
    path: slug ? `/p/${slug}` : '/',
    noindex: !partner,
    jsonLd: partner
      ? {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: partner.name,
          description: partner.presentation?.about?.slice(0, 300),
          url: slug ? `https://${slug}.reserva.am` : 'https://reserva.am',
          address: partner.locations?.map((l) => ({
            '@type': 'PostalAddress',
            streetAddress: l.address,
            addressLocality: 'Yerevan',
            addressCountry: 'AM',
          })),
          telephone: partner.locations?.[0]?.phone,
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

  return (
    <div className={s.page} style={brandVars}>
      <PartnerNav partner={partner} onBook={() => openBooking()} />

      <main>
        {/* Flow: hook → what they came for (services) → trust (about) →
            where + who → vibe (gallery) → final CTA */}
        <PartnerHero partner={partner} onBook={() => openBooking()} />
        <PartnerServices partner={partner} onBook={openBooking} />
        <PartnerAbout partner={partner} />
        <PartnerLocations partner={partner} onBook={() => openBooking()} />
        <PartnerTeam partner={partner} onSelect={setActiveSpecialist} />
        <PartnerGallery partner={partner} />
        <PartnerFooter partner={partner} onBook={() => openBooking()} />
      </main>

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
