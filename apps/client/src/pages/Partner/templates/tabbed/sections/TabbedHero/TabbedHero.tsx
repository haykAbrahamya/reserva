import { useState } from 'react'
import { MapPin, Phone, Instagram, Facebook, Star } from 'lucide-react'
import { WhatsappIcon } from '@reserva/ui'
import { useT, useLocalized } from '@/i18n'
import type { PublicPartner } from '@/mock/partners'
import { bookableLocations } from '@/services/booking.service'
import { CallLocationModal } from '../../../../components/CallLocationModal/CallLocationModal'
import s from './TabbedHero.module.scss'

interface Props {
  partner: PublicPartner
  /** Optional: clicking the rating jumps to the Reviews tab. Only wired by the
   *  template when a Reviews tab actually exists. */
  onReviewsClick?: () => void
}

/**
 * Compact hero for the tabbed template: a horizontal banner (logo + identity +
 * contact/socials) rather than the classic full-height scroll hero, since the
 * tab bar sits directly beneath it. The primary "Book" action is the persistent
 * top-nav button, so the hero deliberately doesn't repeat it.
 */
export function TabbedHero({ partner, onReviewsClick }: Props) {
  const { presentation: p } = partner
  const t = useT()
  const loc = useLocalized()
  const locations = bookableLocations(partner)
  const primary = locations[0]
  const multiLocation = locations.length > 1
  const [callOpen, setCallOpen] = useState(false)
  const t1 = p.heroTints[0] ?? partner.accent
  const t2 = p.heroTints[1] ?? `color-mix(in srgb, ${partner.accent} 55%, #7c3aed)`

  return (
    <section className={s.hero}>
      <div
        className={s.wash}
        style={{
          background: `radial-gradient(120% 140% at 15% 0%,
            color-mix(in srgb, ${t1} 26%, transparent) 0%,
            color-mix(in srgb, ${t2} 12%, transparent) 45%,
            transparent 78%)`,
        }}
      />
      <div className={s.inner}>
        {p.logoUrl ? (
          <img src={p.logoUrl} className={s.logo} alt={partner.name} />
        ) : (
          <div className={s.logo} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
            {partner.name.charAt(0)}
          </div>
        )}

        <div className={s.body}>
          <div className={s.typeRow}>
            <span className={s.type}>{partner.type}</span>
            {p.rating > 0 && p.reviews > 0 && (
              onReviewsClick ? (
                <button
                  type="button"
                  className={s.rating}
                  onClick={onReviewsClick}
                  title={t('partner.hero.ratingAria', { rating: p.rating.toFixed(1), count: p.reviews })}
                >
                  <Star size={14} className={s.ratingStar} />
                  <span className={s.ratingNum}>{p.rating.toFixed(1)}</span>
                  <span className={s.reviewCount}>{t('partner.hero.reviews', { count: p.reviews })}</span>
                </button>
              ) : (
                <span className={s.rating}>
                  <Star size={14} className={s.ratingStar} />
                  <span className={s.ratingNum}>{p.rating.toFixed(1)}</span>
                  <span className={s.reviewCount}>{t('partner.hero.reviews', { count: p.reviews })}</span>
                </span>
              )
            )}
          </div>
          <h1 className={s.name}>{partner.name}</h1>
          {p.tagline && <p className={s.tagline}>{loc(p.tagline, p.taglineI18n)}</p>}
          {primary && (
            <span className={s.meta}>
              <MapPin size={15} /> {primary.address}
            </span>
          )}

          {/* Contact + social links, inline under the profile. The primary
              "Book" action is the persistent top-nav button, so it's not
              repeated here. */}
          {(primary || p.instagram || p.facebook || p.whatsapp) && (
            <div className={s.socials}>
              {primary && (
                multiLocation ? (
                  <button type="button" className={s.iconBtn} onClick={() => setCallOpen(true)} aria-label={t('partner.hero.call')}>
                    <Phone size={17} />
                  </button>
                ) : (
                  <a className={s.iconBtn} href={`tel:${primary.phone.replace(/\s/g, '')}`} aria-label={t('partner.hero.call')}>
                    <Phone size={17} />
                  </a>
                )
              )}
              {p.instagram && (
                <a className={s.iconBtn} href={p.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <Instagram size={17} />
                </a>
              )}
              {p.facebook && (
                <a className={s.iconBtn} href={p.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <Facebook size={17} />
                </a>
              )}
              {p.whatsapp && (
                <a className={s.iconBtn} href={`https://wa.me/${p.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label={t('partner.hero.whatsapp')}>
                  <WhatsappIcon size={17} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {callOpen && (
        <CallLocationModal partner={partner} locations={locations} onClose={() => setCallOpen(false)} />
      )}
    </section>
  )
}
