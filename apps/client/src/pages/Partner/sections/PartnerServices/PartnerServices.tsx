import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { fmtServicePrice, fmtDuration } from '@reserva/shared'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { canBook } from '@/services/booking.service'
import { useT } from '@/i18n'
import s from './PartnerServices.module.scss'

interface Props {
  partner: PublicPartner
  onBook: (serviceId: string) => void
  tone?: 'cream' | 'plain'
}

const ALL = 'All'

export function PartnerServices({ partner, onBook, tone = 'cream' }: Props) {
  const t = useT()
  const bookable = canBook(partner)
  const services = useMemo(
    () => partner.services.filter(sv => sv.active),
    [partner]
  )

  const categories = useMemo(() => {
    const set = new Set(services.map(sv => sv.category))
    return [ALL, ...Array.from(set)]
  }, [services])

  const [cat, setCat] = useState(ALL)

  const filtered = cat === ALL ? services : services.filter(sv => sv.category === cat)

  return (
    <section className={[s.section, tone === 'plain' ? s.plain : ''].filter(Boolean).join(' ')} id="services">
      <div className={s.inner}>
        <div className={s.head}>
          <div className={s.eyebrow}>{t('partner.services.eyebrow')}</div>
          <h2 className={s.title}>{t('partner.services.title')}</h2>
        </div>

        {categories.length > 2 && (
          <div className={s.chips}>
            {categories.map(c => (
              <button
                key={c}
                className={[s.chip, c === cat ? s.active : ''].filter(Boolean).join(' ')}
                onClick={() => setCat(c)}
              >
                {c === ALL ? t('partner.services.all') : c}
              </button>
            ))}
          </div>
        )}

        <div className={s.list}>
          {filtered.map((sv, i) => (
            <Reveal key={sv.id} className={s.card} delay={(i % 2) * 60}>
              <div className={s.cardBody}>
                <div className={s.svcName}>{sv.name}</div>
                <div className={s.svcMeta}>
                  <span>{fmtDuration(sv.duration, { min: t('partner.services.min'), h: t('partner.services.hour') })}</span>
                  <span className={s.dot} />
                  <span>{sv.category}</span>
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
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
