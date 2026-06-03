import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher/LanguageSwitcher'
import { LogoMark } from '@/components/Logo/Logo'
import { useT } from '@/i18n'
import type { PublicPartner } from '@/mock/partners'
import s from './PartnerNav.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
}

export function PartnerNav({ partner, onBook }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [t1, t2] = partner.presentation.heroTints
  const t = useT()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 300)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={[s.nav, scrolled ? s.scrolled : ''].filter(Boolean).join(' ')}>
      <div className={s.inner}>
        {/* Salon identity — appears once the hero scrolls away */}
        <div className={[s.salon, scrolled ? s.show : ''].filter(Boolean).join(' ')}>
          <span className={s.salonMark} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
            {partner.name.charAt(0)}
          </span>
          <span className={s.salonName}>{partner.name}</span>
        </div>

        {/* Reserva back-link — fades out as the salon name fades in */}
        <Link to="/" className={[s.back, scrolled ? s.hide : ''].filter(Boolean).join(' ')}>
          <span className={s.backMark}><LogoMark size={24} /></span>
          <span className={s.poweredText}>{t('partner.poweredBy')}</span>
        </Link>

        <div className={s.spacer} />

        <div className={s.actions}>
          <LanguageSwitcher />
          <ThemeToggle />
          {/* Always available — booking is the primary action on this page */}
          <button className={s.bookBtn} onClick={onBook}>
            <CalendarCheck size={15} /> {t('partner.bookNow')}
          </button>
        </div>
      </div>
    </header>
  )
}
