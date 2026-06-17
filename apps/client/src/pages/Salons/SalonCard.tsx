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
  const t1 = salon.heroTints[0] ?? salon.accent
  const t2 = salon.heroTints[1] ?? `color-mix(in srgb, ${salon.accent} 55%, #000)`
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
      {/* Branded header band */}
      <div className={s.banner} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
        <div className={s.bannerGrid} />
        <span className={s.logo}>{salon.name.charAt(0)}</span>
        {salon.rating > 0 && (
          <span className={s.rating}>
            <Star size={12} className={s.ratingStar} /> {salon.rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className={s.body}>
        <div className={s.titleRow}>
          <h3 className={s.name}>{salon.name}</h3>
          <span className={s.type}>{salon.type}</span>
        </div>

        {salon.tagline && <p className={s.tagline}>{salon.tagline}</p>}

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

        {/* Open-now status (hidden when we have no schedule to judge by) */}
        {!status.unknown && (
          status.open ? (
            <span className={[s.status, s.statusOpen].join(' ')}>
              <span className={s.statusDot} /> {t('salons.open.now')}
            </span>
          ) : (
            <span className={[s.status, s.statusClosed].join(' ')}>
              <Clock size={12} />
              {status.opensAt
                ? (status.opensDay
                    ? t('salons.open.opensDay', { day: status.opensDay, time: status.opensAt })
                    : t('salons.open.opensAt', { time: status.opensAt }))
                : t('salons.open.closed')}
            </span>
          )
        )}

        {/* Category chips */}
        {salon.categories.length > 0 && (
          <div className={s.chips}>
            {salon.categories.slice(0, 4).map((c) => {
              const hit = q !== '' && c.toLowerCase().includes(q)
              return (
                <span key={c} className={[s.chip, hit ? s.chipHit : ''].filter(Boolean).join(' ')}>
                  {c}
                </span>
              )
            })}
          </div>
        )}

        <div className={s.footer}>
          <div className={s.counts}>
            <span className={s.count}><Sparkles size={13} /> {salon.serviceCount}</span>
            <span className={s.count}><Users size={13} /> {salon.specialistCount}</span>
          </div>
          <span className={s.cta}>
            {t('salons.card.view')} <ArrowRight size={15} />
          </span>
        </div>
      </div>
    </button>
  )
})
