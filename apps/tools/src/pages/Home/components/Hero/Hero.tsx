import { CircleCheck, Sparkles } from 'lucide-react'
import { useT } from '@/i18n'
import s from './Hero.module.scss'

const PERKS = ['free', 'noSignup', 'mobile'] as const

/** The home page heading: what this is, and the three things that make it easy to try. */
export function Hero() {
  const t = useT()

  return (
    <section className={s.hero}>
      <span className={s.rings} aria-hidden="true" />

      <div className={s.inner}>
        <span className={s.eyebrow}>
          <Sparkles size={14} />
          {t('home.eyebrow')}
        </span>
        <h1 className={s.title}>{t('home.title')}</h1>
        <p className={s.lead}>{t('home.lead')}</p>

        <ul className={s.perks}>
          {PERKS.map((perk) => (
            <li key={perk} className={s.perk}>
              <CircleCheck size={15} />
              {t(`home.perks.${perk}`)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
