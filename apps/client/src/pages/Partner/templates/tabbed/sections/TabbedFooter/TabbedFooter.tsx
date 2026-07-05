import { CalendarCheck } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { canBook } from '@/services/booking.service'
import { useT } from '@/i18n'
import s from './TabbedFooter.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
}

/** Closing CTA band for the tabbed template. */
export function TabbedFooter({ partner, onBook }: Props) {
  const t = useT()
  const t1 = partner.presentation.heroTints[0] ?? partner.accent
  const t2 = partner.presentation.heroTints[1] ?? partner.accent

  return (
    <footer className={s.footer}>
      <div className={s.panel} style={{ background: `linear-gradient(135deg, ${t1}, ${t2})` }}>
        <div className={s.panelGrid} />
        <div className={s.panelInner}>
          <h2 className={s.title}>{t('partner.footer.title')}</h2>
          <p className={s.text}>{t('partner.footer.text')}</p>
          {canBook(partner) ? (
            <button className={s.cta} onClick={onBook}>
              <CalendarCheck size={18} /> {t('partner.footer.bookNow')}
            </button>
          ) : null}
        </div>
      </div>
      <div className={s.poweredBy}>{t('partner.footer.poweredBy')}</div>
    </footer>
  )
}
