import { useT } from '@/i18n'
import s from './Trust.module.scss'

const BRANDS = [
  { name: 'Antheris', color: '#A8784B' },
  { name: 'BarberBro', color: '#2F4A3A' },
  { name: 'Lumé Studio', color: '#B07683' },
  { name: 'Glow Bar', color: '#4A6B8A' },
  { name: 'Néroli', color: '#C9883B' },
  { name: 'Studio Mane', color: '#7A4A55' },
]

export function Trust() {
  const t = useT()
  // Duplicate the list so the marquee loops seamlessly.
  const loop = [...BRANDS, ...BRANDS]

  return (
    <section className={s.trust}>
      <p className={s.label}>{t('trust.label')}</p>
      <div className={s.marquee}>
        <div className={s.track}>
          {loop.map((b, i) => (
            <span key={i} className={s.brand}>
              <span className={s.brandDot} style={{ background: b.color }} />
              {b.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
