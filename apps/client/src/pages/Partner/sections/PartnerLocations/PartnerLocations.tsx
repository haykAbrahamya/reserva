import { MapPin, Phone, CalendarCheck, Clock, Users } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { useI18n } from '@/i18n'
import { bookableLocations } from '@/services/booking.service'
import { summarizeHours } from './summarizeHours'
import s from './PartnerLocations.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
}

export function PartnerLocations({ partner, onBook }: Props) {
  const { t, tp } = useI18n()

  // Only functional branches (active + ≥1 active specialist). Shared helper so
  // every place that lists/counts locations agrees.
  const bookable = bookableLocations(partner)

  // Render the section whenever there's at least one bookable branch.
  if (bookable.length === 0) return null

  const [t1, t2] = partner.presentation.heroTints

  return (
    <section className={s.section} id="locations">
      <div className={s.inner}>
        <div className={s.head}>
          <div className={s.eyebrow}>{t('partner.locations.eyebrow')}</div>
          <h2 className={s.title}>{tp('partner.locations.title', bookable.length, { count: bookable.length })}</h2>
        </div>

        <div className={s.grid}>
          {bookable.map((loc, i) => {
            const staffHere = partner.specialists.filter(sp => sp.active && sp.locationId === loc.id).length
            const hours = summarizeHours(loc.hours, t('partner.locations.closed'))
            return (
              <Reveal key={loc.id} className={s.card} delay={(i % 2) * 60}>
                <div
                  className={s.mapBanner}
                  style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}
                >
                  <div className={s.mapGrid} />
                  <span className={s.mapPin}><MapPin size={20} /></span>
                </div>

                <div className={s.cardBody}>
                  <div className={s.branchName}>{loc.name}</div>

                  <div className={s.row}>
                    <MapPin size={15} />
                    <span>{loc.address}</span>
                  </div>
                  <div className={s.row}>
                    <Phone size={15} />
                    <span>{loc.phone}</span>
                  </div>
                  {hours && (
                    <div className={s.row}>
                      <Clock size={15} />
                      <span>{hours}</span>
                    </div>
                  )}
                  <div className={s.row}>
                    <Users size={15} />
                    <span>{tp('partner.locations.specialistsHere', staffHere)}</span>
                  </div>

                  <div className={s.actions}>
                    <button className={s.bookBtn} onClick={onBook}>
                      <CalendarCheck size={15} /> {t('partner.locations.bookHere')}
                    </button>
                    <a className={s.callBtn} href={`tel:${loc.phone.replace(/\s/g, '')}`}>
                      <Phone size={15} /> {t('partner.locations.call')}
                    </a>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
