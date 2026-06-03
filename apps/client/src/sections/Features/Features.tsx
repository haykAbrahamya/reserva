import { CalendarClock, Users, LayoutGrid, Bell, Globe, BarChart3 } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead/SectionHead'
import { Reveal } from '@/components/Reveal/Reveal'
import { useT } from '@/i18n'
import s from './Features.module.scss'

const FEATURES = [
  { icon: Globe,         key: 'bookingPage' },
  { icon: CalendarClock, key: 'calendar' },
  { icon: Users,         key: 'team' },
  { icon: Bell,          key: 'notifications' },
  { icon: LayoutGrid,    key: 'multiLocation' },
  { icon: BarChart3,     key: 'revenue' },
]

export function Features() {
  const t = useT()
  return (
    <section className={s.section} id="features">
      <div className={s.inner}>
        <SectionHead
          eyebrow={t('features.eyebrow')}
          title={<>{t('features.titlePre')}<em>{t('features.titleEm')}</em>{t('features.titlePost')}</>}
          subtitle={t('features.subtitle')}
        />

        <div className={s.grid}>
          {FEATURES.map((f, i) => (
            <Reveal key={f.key} className={s.cell} delay={(i % 3) * 80}>
              <article className={s.card}>
                <div className={s.iconWrap}>
                  <f.icon size={22} />
                </div>
                <h3 className={s.cardTitle}>{t(`features.items.${f.key}.title`)}</h3>
                <p className={s.cardText}>{t(`features.items.${f.key}.text`)}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
