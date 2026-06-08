import { useEffect, useState, useCallback } from 'react'
import { getPartnerBySlug } from '@/services/booking.service'
import { useTenantSlug } from '@/hooks/useTenantSlug'
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
import { useT } from '@/i18n'
import type { Specialist } from '@reserva/shared'
import s from './PartnerPage.module.scss'

export function PartnerPage() {
  const slug = useTenantSlug()
  const t = useT()
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
  const brandVars = partnerBrandVars(partner)

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
