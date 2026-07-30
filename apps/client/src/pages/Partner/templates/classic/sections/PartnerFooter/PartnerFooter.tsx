import { useState } from 'react'
import { CalendarCheck, Phone } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { LogoMark } from '@/components/Logo/Logo'
import { marketingSiteUrl } from '@/hooks/useTenantSlug'
import { bookableLocations, canBook, partnerTelHref } from '@/services/booking.service'
import { useT } from '@/i18n'
import { CallLocationModal } from '../../../../components/CallLocationModal/CallLocationModal'
import s from './PartnerFooter.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
}

export function PartnerFooter({ partner, onBook }: Props) {
  const [t1, t2] = partner.presentation.heroTints
  const callLocations = bookableLocations(partner)
  const loc = callLocations[0] ?? partner.locations[0]
  const multiLocation = callLocations.length > 1
  const [callOpen, setCallOpen] = useState(false)
  const t = useT()
  const telHref = partnerTelHref(partner)

  return (
    <>
      <section className={s.cta}>
        <Reveal>
          <div
            className={s.panel}
            style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}
          >
            <div className={s.panelInner}>
              <h2 className={s.panelTitle}>{t('partner.footer.title')}</h2>
              <p className={s.panelText}>
                {t('partner.footer.text')}
              </p>
              {canBook(partner) ? (
                <button className={s.bookBtn} onClick={onBook}>
                  <CalendarCheck size={18} /> {t('partner.footer.bookNow')}
                </button>
              ) : telHref && (
                multiLocation ? (
                  <button className={s.bookBtn} onClick={() => setCallOpen(true)}>
                    <Phone size={18} /> {t('partner.callNow')}
                  </button>
                ) : (
                  <a className={s.bookBtn} href={telHref}>
                    <Phone size={18} /> {t('partner.callNow')}
                  </a>
                )
              )}
            </div>
          </div>
        </Reveal>
      </section>

      {callOpen && (
        <CallLocationModal partner={partner} locations={callLocations} onClose={() => setCallOpen(false)} />
      )}

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.salonInfo}>
            <span className={s.salonName}>{partner.name}</span>
            {loc && <> · {loc.address} · {loc.phone}</>}
          </div>
          <a href={marketingSiteUrl()} className={s.powered}>
            <span className={s.poweredMark}><LogoMark size={22} /></span>
            {t('partner.footer.poweredBy')}
          </a>
        </div>
      </footer>
    </>
  )
}
