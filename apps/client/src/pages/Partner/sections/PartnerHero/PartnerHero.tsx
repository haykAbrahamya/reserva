import { useState, useEffect } from 'react'
import { CalendarCheck, MapPin, Phone, ChevronDown, Instagram, Facebook } from 'lucide-react'
import { useT } from '@/i18n'
import type { PublicPartner } from '@/mock/partners'
import { bookableLocations } from '@/services/booking.service'
import s from './PartnerHero.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
}

export function PartnerHero({ partner, onBook }: Props) {
  const { presentation: p } = partner
  // Count only functional branches (active + ≥1 active specialist) so the hero
  // matches the Locations section and the booking flow.
  const locations = bookableLocations(partner)
  const primaryLocation = locations[0]
  const multiLocation = locations.length > 1
  // Hero tints: use the partner's explicit pair when set, otherwise derive a
  // tasteful two-stop ramp from the brand accent so every salon (incl. ones
  // created without tints) gets a branded hero instead of flat white.
  const t1 = p.heroTints[0] ?? partner.accent
  const t2 = p.heroTints[1] ?? `color-mix(in srgb, ${partner.accent} 55%, #7c3aed)`
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
      {/* Branded background wash. color-mix keeps this valid whether the tint is
          a hex value or a derived color-mix() string, and reads well in both
          light and dark themes. */}
      <div className={s.wash}>
        <div
          className={s.washOrb}
          style={{
            background: `radial-gradient(ellipse at center,
              color-mix(in srgb, ${t1} 38%, transparent) 0%,
              color-mix(in srgb, ${t2} 20%, transparent) 42%,
              transparent 72%)`,
          }}
        />
        {/* Second, tighter orb offset to the right adds depth + a sense of light
            coming from one side, so the hero never reads as a flat panel. */}
        <div
          className={s.washOrb2}
          style={{
            background: `radial-gradient(ellipse at center,
              color-mix(in srgb, ${t2} 30%, transparent) 0%,
              transparent 65%)`,
          }}
        />
        <div
          className={s.washTint}
          style={{
            background: `linear-gradient(180deg,
              color-mix(in srgb, ${t1} 18%, transparent) 0%,
              color-mix(in srgb, ${t1} 5%, transparent) 38%,
              transparent 64%)`,
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
              {t('partner.hero.locationsInYerevan', { count: locations.length })}
            </button>
          ) : primaryLocation && (
            <span className={s.meta}>
              <MapPin size={16} />
              {primaryLocation.address}
            </span>
          )}
          {/* Per-branch hours live in the Locations section (branches may differ),
              so the hero no longer shows a single ambiguous hours summary. */}
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
          {(p.instagram || p.facebook) && (
            <div className={s.socials}>
              {p.instagram && (
                <a className={s.social} href={p.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <Instagram size={18} />
                </a>
              )}
              {p.facebook && (
                <a className={s.social} href={p.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <Facebook size={18} />
                </a>
              )}
            </div>
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
