import { useState, useEffect } from 'react'
import { CalendarCheck, Phone } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher'
import { LogoMark } from '@/components/Logo/Logo'
import { marketingSiteUrl } from '@/hooks/useTenantSlug'
import { canBook, partnerTelHref, bookableLocations } from '@/services/booking.service'
import { useT } from '@/i18n'
import type { PublicPartner } from '@/mock/partners'
import { CallLocationModal } from '../CallLocationModal/CallLocationModal'
import s from './PartnerNav.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
}

export function PartnerNav({ partner, onBook }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [t1, t2] = partner.presentation.heroTints
  const t = useT()
  const telHref = partnerTelHref(partner)
  // With multiple branches, "Call now" opens a branch picker instead of dialing
  // the primary number directly.
  const callLocations = bookableLocations(partner)
  const multiLocation = callLocations.length > 1
  const [callOpen, setCallOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 300)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={[s.nav, scrolled ? s.scrolled : ''].filter(Boolean).join(' ')}>
      <div className={s.inner}>
        {/* Salon identity — appears once the hero scrolls away. Shows the
            partner's logo when set (matching the hero), else a gradient letter. */}
        <div className={[s.salon, scrolled ? s.show : ''].filter(Boolean).join(' ')}>
          {partner.presentation.logoUrl ? (
            <img src={partner.presentation.logoUrl} className={[s.salonMark, s.salonMarkImg].join(' ')} alt={partner.name} />
          ) : (
            <span className={s.salonMark} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
              {partner.name.charAt(0)}
            </span>
          )}
          <span className={s.salonName}>{partner.name}</span>
        </div>

        {/* Reserva back-link → the marketing site (apex), not the tenant page.
            Plain <a> with an absolute URL so it leaves the subdomain. */}
        <a href={marketingSiteUrl()} className={[s.back, scrolled ? s.hide : ''].filter(Boolean).join(' ')}>
          <span className={s.backMark}><LogoMark size={24} /></span>
          <span className={s.poweredText}>{t('partner.poweredBy')}</span>
        </a>

        <div className={s.spacer} />

        <div className={s.actions}>
          <LanguageSwitcher />
          <ThemeToggle />
          {/* Booking is the primary action; contact-only salons get "Call now". */}
          {canBook(partner) ? (
            <button className={s.bookBtn} onClick={onBook} aria-label={t('partner.bookNow')}>
              <CalendarCheck size={15} /> <span className={s.bookLabel}>{t('partner.bookNow')}</span>
            </button>
          ) : telHref && (
            multiLocation ? (
              <button className={s.bookBtn} onClick={() => setCallOpen(true)} aria-label={t('partner.callNow')}>
                <Phone size={15} /> <span className={s.bookLabel}>{t('partner.callNow')}</span>
              </button>
            ) : (
              <a className={s.bookBtn} href={telHref} aria-label={t('partner.callNow')}>
                <Phone size={15} /> <span className={s.bookLabel}>{t('partner.callNow')}</span>
              </a>
            )
          )}
        </div>
      </div>

      {callOpen && (
        <CallLocationModal partner={partner} locations={callLocations} onClose={() => setCallOpen(false)} />
      )}
    </header>
  )
}
