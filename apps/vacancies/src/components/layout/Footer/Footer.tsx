import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LogoMark } from '@reserva/ui'
import { useT } from '@/i18n'
import s from './Footer.module.scss'

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
          {/*
            Signup, not the backoffice login.
            A salon reading this has, by definition, not got an account yet —
            sending them to a login screen asks them to remember a password they
            have never set. The signup page carries the sign-in link for the
            ones who do.
          */}
          <Link className={s.ctaButton} to="/signup">
            {t('footer.forSalonsCta')}
            <ArrowRight size={15} />
          </Link>
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
