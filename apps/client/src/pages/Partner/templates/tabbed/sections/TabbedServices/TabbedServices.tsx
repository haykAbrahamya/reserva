import { useState, useMemo } from 'react'
import { Plus, Clock } from 'lucide-react'
import { fmtServicePrice, fmtDuration } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { canBook } from '@/services/booking.service'
import { useT } from '@/i18n'
import s from './TabbedServices.module.scss'

interface Props {
  partner: PublicPartner
  onBook: (serviceId: string) => void
}

const ALL = 'All'

/** Services tab: category chips + a two-column service card grid. Reuses the
 *  shared price/duration formatters and the canBook rule. */
export function TabbedServices({ partner, onBook }: Props) {
  const t = useT()
  const bookable = canBook(partner)
  const services = useMemo(() => partner.services.filter((sv) => sv.active), [partner])
  const categories = useMemo(() => {
    const set = new Set(services.map((sv) => sv.category).filter(Boolean))
    return [ALL, ...Array.from(set)]
  }, [services])
  const [cat, setCat] = useState(ALL)
  const filtered = cat === ALL ? services : services.filter((sv) => sv.category === cat)

  return (
    <section className={s.section}>
      {categories.length > 2 && (
        <div className={s.chips}>
          {categories.map((c) => (
            <button
              key={c}
              className={[s.chip, c === cat ? s.chipActive : ''].filter(Boolean).join(' ')}
              onClick={() => setCat(c)}
            >
              {c === ALL ? t('partner.services.all') : c}
            </button>
          ))}
        </div>
      )}

      <div className={s.grid}>
        {filtered.map((sv) => (
          <div key={sv.id} className={s.card}>
            <div className={s.cardBody}>
              <div className={s.name}>{sv.name}</div>
              <div className={s.meta}>
                <span className={s.metaItem}>
                  <Clock size={13} /> {fmtDuration(sv.duration, { min: t('partner.services.min'), h: t('partner.services.hour') })}
                </span>
                {sv.category && <><span className={s.dot} /><span>{sv.category}</span></>}
              </div>
            </div>
            <div className={s.right}>
              <span className={s.price}>{fmtServicePrice(sv)}</span>
              {bookable && (
                <button className={s.bookBtn} onClick={() => onBook(sv.id)}>
                  <Plus size={14} /> {t('partner.services.book')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
