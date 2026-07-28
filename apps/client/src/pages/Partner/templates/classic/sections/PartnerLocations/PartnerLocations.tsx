import { MapPin, Phone, CalendarCheck, Clock, Users, Navigation } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { useI18n, useLocalized } from '@/i18n'
import { bookableLocations, canBook } from '@/services/booking.service'
import { summarizeHours } from '../../../../lib/summarizeHours'
import s from './PartnerLocations.module.scss'

interface Props {
  partner: PublicPartner
  onBook: () => void
  tone?: 'cream' | 'plain'
}

/** Google Maps URL for a location — exact pin when coordinates exist, else the
 *  address text. Opens directions/place view in a new tab. */
function mapsUrl(loc: { address: string; name: string; lat?: number | null; lng?: number | null }): string {
  const base = 'https://www.google.com/maps/search/?api=1&query='
  if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    return base + encodeURIComponent(`${loc.lat},${loc.lng}`)
  }
  return base + encodeURIComponent(`${loc.name} ${loc.address}`.trim())
}

export function PartnerLocations({ partner, onBook, tone = 'cream' }: Props) {
  const { t, tp } = useI18n()
  // Named `tr` (not `loc`) to avoid colliding with the `loc` location variable in
  // the branches map below.
  const tr = useLocalized()

  // Only functional branches (active + ≥1 active specialist). Shared helper so
  // every place that lists/counts locations agrees.
  const bookable = bookableLocations(partner)

  // Render the section whenever there's at least one bookable branch.
  if (bookable.length === 0) return null

  // A solo pro works alone at one spot, so the section is framed as "where to
  // find me" and the per-card "N specialists here" row is dropped (it would
  // always read "1 specialist here", which is noise).
  const isSingle = partner.kind === 'single'

  const [t1, t2] = partner.presentation.heroTints

  return (
    <section className={[s.section, tone === 'plain' ? s.plain : ''].filter(Boolean).join(' ')} id="locations">
      <div className={s.inner}>
        <div className={s.head}>
          {/* Solo pro at one spot → a single clean title, no redundant eyebrow. */}
          {!isSingle && <div className={s.eyebrow}>{t('partner.locations.eyebrow')}</div>}
          <h2 className={s.title}>
            {isSingle
              ? t('partner.locations.titleSingle')
              : tp('partner.locations.title', bookable.length, { count: bookable.length })}
          </h2>
        </div>

        <div className={s.grid}>
          {bookable.map((loc, i) => {
            const staffHere = partner.specialists.filter(sp => sp.active && sp.locationId === loc.id).length
            const hours = summarizeHours(loc.hours, t('partner.locations.closed'), {
              mon: t('partner.locations.days.mon'),
              tue: t('partner.locations.days.tue'),
              wed: t('partner.locations.days.wed'),
              thu: t('partner.locations.days.thu'),
              fri: t('partner.locations.days.fri'),
              sat: t('partner.locations.days.sat'),
              sun: t('partner.locations.days.sun'),
            })
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
                  <div className={s.branchName}>{tr(loc.name, loc.nameI18n)}</div>

                  <a
                    className={[s.row, s.addressLink].join(' ')}
                    href={mapsUrl(loc)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={t('partner.locations.openInMaps')}
                  >
                    <MapPin size={15} />
                    <span>{loc.address}</span>
                  </a>
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
                  {!isSingle && (
                    <div className={s.row}>
                      <Users size={15} />
                      <span>{tp('partner.locations.specialistsHere', staffHere)}</span>
                    </div>
                  )}

                  <div className={s.actions}>
                    {canBook(partner) && (
                      <button className={s.bookBtn} onClick={onBook}>
                        <CalendarCheck size={15} /> {t('partner.locations.bookHere')}
                      </button>
                    )}
                    <a className={s.callBtn} href={`tel:${loc.phone.replace(/\s/g, '')}`}>
                      <Phone size={15} /> {t('partner.locations.call')}
                    </a>
                    <a
                      className={s.mapBtn}
                      href={mapsUrl(loc)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation size={15} /> {t('partner.locations.directions')}
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
