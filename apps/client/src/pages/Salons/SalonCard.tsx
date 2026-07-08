import { memo } from 'react'
import { MapPin, Star, Sparkles, Users, ArrowRight, Clock, Navigation } from 'lucide-react'
import type { SalonCard as Salon } from '@/services/salons.service'
import { formatDistance } from '@/lib/geo'
import { salonOpenStatus } from './openStatus'
import { useT } from '@/i18n'
import s from './SalonCard.module.scss'

interface Props {
  salon: Salon
  /** When the grid is showing search results, cards get the result treatment. */
  isResult?: boolean
  /** The active query — used to subtly highlight matching chips. */
  query?: string
  /** Distance to the user's nearest branch (km), or null when not located. */
  distanceKm?: number | null
  onOpen: (slug: string) => void
}

export const SalonCard = memo(function SalonCard({ salon, isResult, query, distanceKm, onOpen }: Props) {
  const t = useT()
  const city = salon.locations[0]?.address ?? salon.locations[0]?.name ?? ''
  const q = query?.trim().toLowerCase() ?? ''
  const status = salonOpenStatus(salon)

  const open = () => salon.slug && onOpen(salon.slug)

  return (
    <button
      type="button"
      className={[s.card, isResult ? s.result : ''].filter(Boolean).join(' ')}
      onClick={open}
      style={{ ['--salon-accent' as string]: salon.accent }}
    >
      {/* Header — inline logo, name/type, rating */}
      <div className={s.head}>
        {salon.logoUrl ? (
          <img
            className={[s.logo, s.logoImg].join(' ')}
            src={salon.logoUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className={s.logo}>{salon.name.charAt(0)}</span>
        )}
        <div className={s.headText}>
          <h3 className={s.name}>{salon.name}</h3>
          <span className={s.type}>{salon.type}</span>
        </div>
        {salon.rating > 0 && (
          <span className={s.rating}>
            <Star size={12} className={s.ratingStar} /> {salon.rating.toFixed(1)}
          </span>
        )}
      </div>

      {salon.tagline && <p className={s.tagline}>{salon.tagline}</p>}

      {/* Category chips — quiet ghost tags */}
      {salon.categories.length > 0 && (
        <div className={s.chips}>
          {salon.categories.slice(0, 3).map((c) => {
            const hit = q !== '' && c.toLowerCase().includes(q)
            return (
              <span key={c} className={[s.chip, hit ? s.chipHit : ''].filter(Boolean).join(' ')}>
                {c}
              </span>
            )
          })}
        </div>
      )}

      {/* Location + open status, as one grouped meta block */}
      <div className={s.meta}>
        {city && (
          <div className={s.metaRow}>
            <MapPin size={14} />
            <span className={s.metaText}>{city}</span>
            {salon.locations.length > 1 && (
              <span className={s.more}>+{salon.locations.length - 1}</span>
            )}
            {typeof distanceKm === 'number' && (
              <span className={s.distance}>
                <Navigation size={11} /> {formatDistance(distanceKm)}
              </span>
            )}
          </div>
        )}
        {!status.unknown && (
          <div className={s.metaRow}>
            {status.open ? (
              <>
                <span className={[s.statusDot, s.statusDotOpen].join(' ')} />
                <span className={s.statusOpenText}>{t('salons.open.now')}</span>
              </>
            ) : (
              <>
                <Clock size={14} className={s.statusIcon} />
                <span className={s.metaText}>
                  {status.opensAt
                    ? (status.opensDay
                        ? t('salons.open.opensDay', { day: t(`partner.locations.days.${status.opensDay}`), time: status.opensAt })
                        : t('salons.open.opensAt', { time: status.opensAt }))
                    : t('salons.open.closed')}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      <div className={s.footer}>
        <div className={s.counts}>
          <span className={s.count}><Sparkles size={13} /> {salon.serviceCount}</span>
          <span className={s.count}><Users size={13} /> {salon.specialistCount}</span>
        </div>
        <span className={s.cta}>
          {t('salons.card.view')} <ArrowRight size={15} />
        </span>
      </div>
    </button>
  )
})
