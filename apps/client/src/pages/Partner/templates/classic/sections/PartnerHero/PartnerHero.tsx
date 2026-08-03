import { useState, useEffect } from 'react'
import { CalendarCheck, MapPin, Phone, ChevronDown, Instagram, Facebook, Star } from 'lucide-react'
import { WhatsappIcon } from '@reserva/ui'
import { useT, useLocalized } from '@/i18n'
import type { PublicPartner } from '@/mock/partners'
import { bookableLocations, canBook } from '@/services/booking.service'
import { CallLocationModal } from '../../../../components/CallLocationModal/CallLocationModal'
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
  const loc = useLocalized()

  // "Which branch?" call picker — only used when the partner has >1 location.
  const [callOpen, setCallOpen] = useState(false)

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

  // Clicking the rating jumps to where a visitor can actually read/leave reviews.
  // Mirrors ClassicTemplate's section visibility exactly: a salon surfaces its
  // reviews through the Team grid (each specialist opens a review modal), so we
  // scroll to #team; a solo pro gets a dedicated #reviews section. We compute the
  // target the SAME way the template decides which section to render, and only
  // make the rating a clickable button when that target will actually exist.
  const isSingle = partner.kind === 'single'
  const showTeam = !isSingle && partner.specialists.some((sp) => sp.active)
  const showReviews = isSingle && partner.specialists.length > 0
  const ratingTargetId = showTeam ? 'team' : showReviews ? 'reviews' : null
  const scrollToReviews = () => {
    if (ratingTargetId) document.getElementById(ratingTargetId)?.scrollIntoView({ behavior: 'smooth' })
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
        {
          partner.presentation.logoUrl 
            ? <img src={partner.presentation.logoUrl} className={s.logo}/>
            : <div
                className={s.logo}
                style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}
              >
                {partner.name.charAt(0)}
              </div>
        }
        <div className={s.typeRow}>
          <span className={s.type}>{loc(partner.type, partner.typeI18n)}</span>
          {/* Only show a rating when there's real review data — no fake stars. The
              partner-wide score is computed server-side from every specialist's
              reviews (works for solo pros and salons alike). */}
          {p.rating > 0 && p.reviews > 0 && (
            ratingTargetId ? (
              <button
                type="button"
                className={s.rating}
                onClick={scrollToReviews}
                title={t('partner.hero.ratingAria', { rating: p.rating.toFixed(1), count: p.reviews })}
              >
                <Star size={15} className={s.ratingStar} />
                <span className={s.ratingNum}>{p.rating.toFixed(1)}</span>
                <span className={s.reviewCount}>{t('partner.hero.reviews', { count: p.reviews })}</span>
              </button>
            ) : (
              <span
                className={s.rating}
                title={t('partner.hero.ratingAria', { rating: p.rating.toFixed(1), count: p.reviews })}
              >
                <Star size={15} className={s.ratingStar} />
                <span className={s.ratingNum}>{p.rating.toFixed(1)}</span>
                <span className={s.reviewCount}>{t('partner.hero.reviews', { count: p.reviews })}</span>
              </span>
            )
          )}
        </div>

        <h1 className={s.name}>{loc(partner.name, partner.nameI18n)}</h1>
        <p className={s.tagline}>{loc(p.tagline, p.taglineI18n)}</p>

        <div className={s.metaRow}>
          {multiLocation ? (
            <button className={s.metaLink} onClick={() => document.getElementById('locations')?.scrollIntoView({ behavior: 'smooth' })}>
              <MapPin size={16} />
              {t('partner.hero.locationsInYerevan', { count: locations.length })}
            </button>
          ) : primaryLocation && (
            <button className={s.metaLink} onClick={() => document.getElementById('locations')?.scrollIntoView({ behavior: 'smooth' })}>
              <MapPin size={16} />
              {primaryLocation.address}
            </button>
          )}
          {/* Per-branch hours live in the Locations section (branches may differ),
              so the hero no longer shows a single ambiguous hours summary. */}
        </div>

        <div className={s.actions}>
          {canBook(partner) && (
            <button className={s.bookCta} onClick={onBook}>
              <CalendarCheck size={18} /> {t('partner.hero.bookAppointment')}
            </button>
          )}
          {primaryLocation && (
            multiLocation ? (
              <button type="button" className={s.callBtn} onClick={() => setCallOpen(true)}>
                <Phone size={17} /> {t('partner.hero.call')}
              </button>
            ) : (
              <a className={s.callBtn} href={`tel:${primaryLocation.phone.replace(/\s/g, '')}`}>
                <Phone size={17} /> {t('partner.hero.call')}
              </a>
            )
          )}
          {(p.instagram || p.facebook || p.whatsapp) && (
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
              {p.whatsapp && (
                <a className={s.social} href={`https://wa.me/${p.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={t('partner.hero.whatsapp')}>
                  <WhatsappIcon size={18} />
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

      {callOpen && (
        <CallLocationModal partner={partner} locations={locations} onClose={() => setCallOpen(false)} />
      )}
    </section>
  )
}
