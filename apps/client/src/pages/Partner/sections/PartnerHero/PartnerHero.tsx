import { useState, useEffect } from 'react'
import { CalendarCheck, MapPin, Clock, Phone, ChevronDown } from 'lucide-react'
import { useT } from '@/i18n'
import type { PublicPartner } from '@/mock/partners'
import s from './PartnerHero.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
}

export function PartnerHero({ partner, onBook }: Props) {
  const { presentation: p } = partner
  const primaryLocation = partner.locations[0]
  const multiLocation = partner.locations.length > 1
  const [t1, t2] = p.heroTints
  const t = useT()

  // Hide the scroll hint once the user starts scrolling.
  const [showHint, setShowHint] = useState(true)
  useEffect(() => {
    const onScroll = () => setShowHint(window.scrollY < 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollDown = () => {
    window.scrollTo({ top: window.innerHeight * 0.82, behavior: 'smooth' })
  }

  return (
    <section className={s.hero}>
      {/* Branded background wash */}
      <div className={s.wash}>
        <div
          className={s.washOrb}
          style={{
            background: `radial-gradient(ellipse at center, ${t1}22 0%, ${t2}10 45%, transparent 70%)`,
          }}
        />
      </div>
      <div className={s.grid} />

      <div className={s.inner}>
        {/* Letter logo */}
        <div
          className={s.logo}
          style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}
        >
          {partner.name.charAt(0)}
        </div>

        <div className={s.typeRow}>
          <span className={s.type}>{partner.type}</span>
          <span className={s.rating}>
            <span className={s.stars}>★</span>
            <strong>{p.rating.toFixed(1)}</strong>
            <span className={s.reviewCount}>{t('partner.hero.reviews', { count: p.reviews })}</span>
          </span>
        </div>

        <h1 className={s.name}>{partner.name}</h1>
        <p className={s.tagline}>{p.tagline}</p>

        <div className={s.metaRow}>
          {multiLocation ? (
            <button className={s.metaLink} onClick={() => document.getElementById('locations')?.scrollIntoView({ behavior: 'smooth' })}>
              <MapPin size={16} />
              {t('partner.hero.locationsInYerevan', { count: partner.locations.length })}
            </button>
          ) : primaryLocation && (
            <span className={s.meta}>
              <MapPin size={16} />
              {primaryLocation.address}
            </span>
          )}
          <span className={s.meta}>
            <Clock size={16} />
            {p.hours}
          </span>
        </div>

        <div className={s.actions}>
          <button className={s.bookCta} onClick={onBook}>
            <CalendarCheck size={18} /> {t('partner.hero.bookAppointment')}
          </button>
          {primaryLocation && (
            <a className={s.callBtn} href={`tel:${primaryLocation.phone.replace(/\s/g, '')}`}>
              <Phone size={17} /> {t('partner.hero.call')}
            </a>
          )}
        </div>
      </div>

      {/* Animated scroll hint */}
      <button
        className={[s.scrollHint, showHint ? '' : s.hidden].filter(Boolean).join(' ')}
        onClick={scrollDown}
        aria-label={t('partner.hero.scrollDown')}
      >
        <span className={s.scrollText}>{t('partner.hero.scrollToExplore')}</span>
        <span className={s.scrollMouse}>
          <span className={s.scrollWheel} />
        </span>
        <ChevronDown size={16} className={s.scrollChevron} />
      </button>
    </section>
  )
}
