import { ArrowUpRight } from 'lucide-react'
import { LogoMark } from '@reserva/ui'
import { useT } from '@/i18n'
import s from './Footer.module.scss'

/** Where a salon goes to post a listing — the partner backoffice. */
const PARTNER_URL = import.meta.env.VITE_PARTNER_URL || 'https://partner.reserva.am'
const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL || 'https://reserva.am'

/**
 * The footer, which is really the board's other audience.
 *
 * Every visitor here is a professional looking for work — except the salon
 * owner who noticed the board and wants to be on it. That is the single most
 * valuable conversion this page can make, and it has no other home: the app is
 * unauthenticated, so there is no nav to put it in. So it sits at the bottom,
 * after the listings, where it interrupts nobody.
 */
export function Footer() {
  const t = useT()
  const year = new Date().getFullYear()

  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div className={s.cta}>
          <div className={s.ctaText}>
            <h2 className={s.ctaTitle}>{t('footer.forSalonsTitle')}</h2>
            <p className={s.ctaBody}>{t('footer.forSalonsBody')}</p>
          </div>
          <a className={s.ctaButton} href={PARTNER_URL} target="_blank" rel="noopener noreferrer">
            {t('footer.forSalonsCta')}
            <ArrowUpRight size={15} />
          </a>
        </div>

        <div className={s.base}>
          <a className={s.brand} href={PLATFORM_URL} target="_blank" rel="noopener noreferrer">
            <LogoMark size={22} />
            <span>{t('footer.platform')}</span>
          </a>
          <span className={s.legal}>
            © {year} {t('app.name')}. {t('footer.rights')}
          </span>
        </div>
      </div>
    </footer>
  )
}
