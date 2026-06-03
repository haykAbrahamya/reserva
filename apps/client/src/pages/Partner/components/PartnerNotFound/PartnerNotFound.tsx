import { Link } from 'react-router-dom'
import { Home, Compass, Scissors, DoorClosed } from 'lucide-react'
import { LogoMark } from '@/components/Logo/Logo'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher'
import { useT } from '@/i18n'
import s from './PartnerNotFound.module.scss'

/**
 * Salon-specific "not found" page. Where the global 404 shows a missed-clock,
 * this shows a shuttered little storefront — an awning, a dark window, and a
 * swaying "Closed" sign on the door — to say "this salon isn't here" with a
 * touch of personality.
 */
export function PartnerNotFound() {
  const t = useT()

  return (
    <div className={s.page}>
      <div className={s.grid} />
      <span className={[s.orb, s.orb1].join(' ')} />
      <span className={[s.orb, s.orb2].join(' ')} />

      {/* Top bar */}
      <header className={s.top}>
        <Link to="/" className={s.brand}>
          <span className={s.brandMark}><LogoMark size={26} /></span>
          <span className={s.brandName}>Reserva</span>
        </Link>
        <div className={s.topActions}>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Scene — a closed storefront */}
      <main className={s.main}>
        <div className={s.scene} aria-hidden="true">
          <div className={s.shop}>
            {/* Striped awning */}
            <div className={s.awning}>
              <span className={s.awningScallop} />
            </div>

            {/* Shop facade with a dark window + door */}
            <div className={s.facade}>
              <div className={s.window}>
                <Scissors size={26} className={s.windowIcon} />
                <span className={s.reflection} />
              </div>
              <div className={s.door}>
                {/* Swaying "Closed" sign hung on the door */}
                <div className={s.sign}>
                  <DoorClosed size={13} />
                  <span>Closed</span>
                </div>
                <span className={s.handle} />
              </div>
            </div>
          </div>
        </div>

        <div className={s.copy}>
          <span className={s.eyebrow}><Compass size={14} /> {t('partner.notFoundEyebrow')}</span>
          <h1 className={s.title}>{t('partner.notFoundTitle')}</h1>
          <p className={s.text}>{t('partner.notFoundText')}</p>

          <div className={s.actions}>
            <Link to="/" className={s.primary}>
              <Home size={17} /> {t('partner.notFoundExplore')}
            </Link>
            <Link to="/" className={s.ghost}>
              {t('partner.backToReserva')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
