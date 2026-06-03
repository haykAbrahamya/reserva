import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, Sparkles, Zap } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead/SectionHead'
import { Reveal } from '@/components/Reveal/Reveal'
import { useT } from '@/i18n'
import s from './Pricing.module.scss'

const PRICE = 35000
const REGULAR = 49000 // shown struck-through to frame the special offer

// All features — single all-inclusive plan.
const FEATURES = [
  'brandedPage',
  'unlimitedSpecialists',
  'unlimitedServices',
  'multipleLocations',
  'calendarList',
  'hoursPerSpecialist',
  'telegram',
  'insights',
  'roles',
  'prioritySupport',
]

function fmtPrice(amd: number): string {
  return '₮ ' + amd.toLocaleString('en-US')
}

export function Pricing() {
  const t = useT()
  const navigate = useNavigate()

  return (
    <section className={s.section} id="pricing">
      <div className={s.inner}>
        <SectionHead
          eyebrow={t('pricing.eyebrow')}
          title={<>{t('pricing.titlePre')}<em>{t('pricing.titleEm')}</em>{t('pricing.titlePost')}</>}
          subtitle={t('pricing.subtitle')}
        />

        <Reveal className={s.cell}>
          <div className={s.card}>
            <div className={s.glow} />
            {/* Limited-offer ribbon */}
            <div className={s.ribbon}>
              <Zap size={13} className={s.ribbonIcon} />
              {t('pricing.offerBadge')}
            </div>

            <div className={s.body}>
              {/* Left: pitch + price + CTA */}
              <div className={s.left}>
                <div className={s.planName}>
                  <Sparkles size={16} className={s.planIcon} />
                  {t('pricing.planName')}
                </div>
                <p className={s.planDesc}>{t('pricing.planDesc')}</p>

                <div className={s.priceBlock}>
                  <span className={s.regular}>{fmtPrice(REGULAR)}</span>
                  <div className={s.priceRow}>
                    <span className={s.price}>{fmtPrice(PRICE)}</span>
                    <span className={s.period}>{t('pricing.perMonth')}</span>
                  </div>
                  <div className={s.offerNote}>{t('pricing.offerNote')}</div>
                </div>

                <button className={s.cta} onClick={() => navigate('/signup?plan=all')}>
                  {t('pricing.cta')} <ArrowRight size={17} />
                </button>
                <p className={s.trial}>{t('pricing.trialNote')}</p>
              </div>

              {/* Right: everything included */}
              <div className={s.right}>
                <div className={s.featuresLabel}>{t('pricing.everythingIncluded')}</div>
                <div className={s.featGrid}>
                  {FEATURES.map(f => (
                    <div key={f} className={s.feat}>
                      <span className={s.checkWrap}><Check size={13} className={s.check} /></span>
                      {t(`pricing.feat.${f}`)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <p className={s.footnote}>{t('pricing.footnote')}</p>
      </div>
    </section>
  )
}
