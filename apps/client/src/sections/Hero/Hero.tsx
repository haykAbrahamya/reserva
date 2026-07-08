import { useNavigate } from 'react-router-dom'
import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react'
import { useT } from '@/i18n'
import s from './Hero.module.scss'

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function Hero() {
  const t = useT()
  const navigate = useNavigate()

  const KPIS = [
    { label: t('hero.previewBookingsToday'), num: '24', meta: t('hero.previewConfirmed') },
    { label: t('hero.previewThisWeek'), num: '142', meta: t('hero.previewVsLast') },
    { label: t('hero.previewRevenue'), num: '840K ֏', meta: t('hero.previewDays') },
  ]

  return (
    <section className={s.hero}>
      <div className={s.grid} />
      <div className={s.orb} />

      <div className={s.inner}>
        <span className={s.pill}>
          <span className={s.pillTag}>{t('hero.pillTag')}</span>
          <Sparkles size={13} style={{ color: 'var(--accent)' }} />
          {t('hero.pill')}
        </span>

        <h1 className={s.title}>
          {t('hero.titlePre')}<em className={s.nowrap}>{t('hero.titleEm')}</em>{t('hero.titlePost')}
        </h1>

        <p className={s.subtitle}>
          {t('hero.subtitle1')}
          <br className={s.brDesktop} /> {t('hero.subtitle2')}
        </p>

        <div className={s.actions}>
          <button className={s.ctaPrimary} onClick={() => navigate('/signup')}>
            {t('hero.startFree')} <ArrowRight size={17} />
          </button>
          <button className={s.ctaGhost} onClick={() => scrollToId('how')}>
            <PlayCircle size={17} /> {t('hero.seeHow')}
          </button>
        </div>
      </div>

      {/* Mock dashboard preview */}
      <div className={s.preview}>
        <div className={s.previewBar}>
          <span className={s.dot} style={{ background: '#E06C5E' }} />
          <span className={s.dot} style={{ background: '#E3B341' }} />
          <span className={s.dot} style={{ background: '#69A85C' }} />
        </div>
        <div className={s.previewBody}>
          {KPIS.map(k => (
            <div key={k.label} className={s.previewCard}>
              <div className={s.previewLabel}>{k.label}</div>
              <div className={s.previewNum}>{k.num}</div>
              <div className={s.previewMeta}>{k.meta}</div>
              <div className={s.previewBars}>
                {[40, 65, 50, 80, 55, 90, 70].map((h, i) => (
                  <span key={i} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
