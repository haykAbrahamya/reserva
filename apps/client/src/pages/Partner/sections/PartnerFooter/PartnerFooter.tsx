import { CalendarCheck } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { LogoMark } from '@/components/Logo/Logo'
import { marketingSiteUrl } from '@/hooks/useTenantSlug'
import { bookableLocations } from '@/services/booking.service'
import { useT } from '@/i18n'
import s from './PartnerFooter.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
}

export function PartnerFooter({ partner, onBook }: Props) {
  const [t1, t2] = partner.presentation.heroTints
  const loc = bookableLocations(partner)[0] ?? partner.locations[0]
  const t = useT()

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
                {t('partner.footer.text', { name: partner.name })}
              </p>
              <button className={s.bookBtn} onClick={onBook}>
                <CalendarCheck size={18} /> {t('partner.footer.bookNow')}
              </button>
            </div>
          </div>
        </Reveal>
      </section>

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
