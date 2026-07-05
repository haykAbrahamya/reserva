import { MapPin, Phone, Clock, Users, Navigation, CalendarCheck } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { useI18n } from '@/i18n'
import { bookableLocations, canBook } from '@/services/booking.service'
import { summarizeHours } from '../../../../lib/summarizeHours'
import s from './TabbedBranches.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
}

/** Google Maps URL — exact pin when coords exist, else address text. */
function mapsUrl(loc: { address: string; name: string; lat?: number | null; lng?: number | null }): string {
  const base = 'https://www.google.com/maps/search/?api=1&query='
  if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    return base + encodeURIComponent(`${loc.lat},${loc.lng}`)
  }
  return base + encodeURIComponent(`${loc.name} ${loc.address}`.trim())
}

/** Branches tab: a clean row list of bookable locations with address / phone /
 *  hours / staff count and quick actions. Reuses the shared hours summarizer. */
export function TabbedBranches({ partner, onBook }: Props) {
  const { t, tp } = useI18n()
  const bookable = bookableLocations(partner)
  if (bookable.length === 0) return null

  // Solo pro → drop the per-card "N specialists here" row (always "1", noise).
  const isSingle = partner.kind === 'single'

  const dayLabels = {
    mon: t('partner.locations.days.mon'), tue: t('partner.locations.days.tue'),
    wed: t('partner.locations.days.wed'), thu: t('partner.locations.days.thu'),
    fri: t('partner.locations.days.fri'), sat: t('partner.locations.days.sat'),
    sun: t('partner.locations.days.sun'),
  }
  const t1 = partner.presentation.heroTints[0] ?? partner.accent
  const t2 = partner.presentation.heroTints[1] ?? partner.accent

  return (
    <section className={s.section}>
      <div className={s.list}>
        {bookable.map((loc) => {
          const staffHere = partner.specialists.filter((sp) => sp.active && sp.locationId === loc.id).length
          const hours = summarizeHours(loc.hours, t('partner.locations.closed'), dayLabels)
          return (
            <div key={loc.id} className={s.card}>
              <a
                className={s.mapBanner}
                href={mapsUrl(loc)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: `linear-gradient(135deg, ${t1}, ${t2})` }}
                title={t('partner.locations.openInMaps')}
              >
                <span className={s.mapGrid} />
                <span className={s.mapPin}><MapPin size={20} /></span>
              </a>
              <div className={s.body}>
                <div className={s.name}>{loc.name}</div>
                <a className={s.row} href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer" title={t('partner.locations.openInMaps')}>
                  <MapPin size={15} /> <span>{loc.address}</span>
                </a>
                <a className={s.row} href={`tel:${loc.phone.replace(/\s/g, '')}`}>
                  <Phone size={15} /> <span>{loc.phone}</span>
                </a>
                {hours && <div className={s.row}><Clock size={15} /> <span>{hours}</span></div>}
                {!isSingle && (
                  <div className={s.row}><Users size={15} /> <span>{tp('partner.locations.specialistsHere', staffHere)}</span></div>
                )}
              </div>
              <div className={s.actions}>
                <a className={s.directions} href={mapsUrl(loc)} target="_blank" rel="noopener noreferrer">
                  <Navigation size={15} /> {t('partner.locations.directions')}
                </a>
                {canBook(partner) && (
                  <button className={s.bookHere} onClick={onBook}>
                    <CalendarCheck size={15} /> {t('partner.locations.bookHere')}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
