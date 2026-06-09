import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowRight, Users, Minus, Plus } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead/SectionHead'
import { Reveal } from '@/components/Reveal/Reveal'
import { useT } from '@/i18n'
import s from './Pricing.module.scss'

/**
 * Per-specialist, flat-rate volume tiers (AMD / specialist / month). The tier a
 * salon falls into sets ONE rate applied to every specialist:
 *   total = specialistCount × tier.rate
 */
interface Tier {
  id: string
  min: number
  max: number | null // null = unbounded (30+)
  rate: number
  rangeLabel: string
}

const TIERS: Tier[] = [
  { id: 't1', min: 1, max: 5, rate: 2500, rangeLabel: '1–5' },
  { id: 't2', min: 6, max: 15, rate: 2000, rangeLabel: '6–15' },
  { id: 't3', min: 16, max: 30, rate: 1700, rangeLabel: '16–30' },
  { id: 't4', min: 31, max: null, rate: 1500, rangeLabel: '30+' },
]

const FEATURES = [
  'brandedPage',
  'unlimitedServices',
  'multipleLocations',
  'calendarList',
  'hoursPerSpecialist',
  'telegram',
  'insights',
  'roles',
  'prioritySupport',
]

const fmtAmd = (n: number) => n.toLocaleString('en-US') + ' AMD'

function tierFor(count: number): Tier {
  return TIERS.find((t) => count >= t.min && (t.max === null || count <= t.max)) ?? TIERS[0]
}

export function Pricing() {
  const t = useT()
  const navigate = useNavigate()
  const [count, setCount] = useState(8)

  const activeTier = useMemo(() => tierFor(count), [count])
  const total = count * activeTier.rate

  const setSafe = (n: number) => setCount(Math.max(1, Math.min(999, n)))

  return (
    <section className={s.section} id="pricing">
      <div className={s.inner}>
        <SectionHead
          eyebrow={t('pricing.eyebrow')}
          title={<>{t('pricing.titlePre')}<em>{t('pricing.titleEm')}</em>{t('pricing.titlePost')}</>}
          subtitle={t('pricing.subtitle')}
        />

        {/* ── Tier cards ── */}
        <div className={s.tierGrid}>
          {TIERS.map((tier, i) => {
            const isActive = tier.id === activeTier.id
            return (
              <Reveal key={tier.id} delay={i * 60} className={s.tierCell}>
                <div className={[s.tierCard, isActive ? s.tierActive : ''].filter(Boolean).join(' ')}>
                  {isActive && <div className={s.tierBadge}>{t('pricing.yourTier')}</div>}
                  <div className={s.tierRange}>
                    <Users size={14} className={s.tierRangeIcon} />
                    {tier.rangeLabel} {t('pricing.specialistsWord')}
                  </div>
                  <div className={s.tierPrice}>
                    <span className={s.tierAmount}>{fmtAmd(tier.rate)}</span>
                    <span className={s.tierPer}>{t('pricing.perSpecialistMonth')}</span>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        {/* ── Calculator + everything included ── */}
        <Reveal className={s.cell}>
          <div className={s.card}>
            <div className={s.glow} />
            <div className={s.body}>
              {/* Left: the calculator */}
              <div className={s.left}>
                <div className={s.calcLabel}>{t('pricing.calcTitle')}</div>
                <p className={s.calcDesc}>{t('pricing.calcDesc')}</p>

                <div className={s.counter}>
                  <button className={s.counterBtn} onClick={() => setSafe(count - 1)} aria-label="−">
                    <Minus size={18} />
                  </button>
                  <div className={s.counterValue}>
                    <input
                      className={s.counterInput}
                      type="number"
                      min={1}
                      value={count}
                      onChange={(e) => setSafe(Number(e.target.value) || 1)}
                      // Size to the digit count so the number + unit stay centered
                      // as one group regardless of 1, 2 or 3 digits.
                      style={{ width: `${String(count).length}ch` }}
                    />
                    <span className={s.counterUnit}>{t('pricing.specialistsWord')}</span>
                  </div>
                  <button className={s.counterBtn} onClick={() => setSafe(count + 1)} aria-label="+">
                    <Plus size={18} />
                  </button>
                </div>

                <div className={s.totalBlock}>
                  <div className={s.totalRow}>
                    <span className={s.totalValue}>{fmtAmd(total)}</span>
                    <span className={s.totalPeriod}>{t('pricing.perMonth')}</span>
                  </div>
                  <div className={s.totalBreak}>
                    {count} × {fmtAmd(activeTier.rate)} · {activeTier.rangeLabel} {t('pricing.tierWord')}
                  </div>
                </div>

                <button className={s.cta} onClick={() => navigate('/signup')}>
                  {t('pricing.cta')} <ArrowRight size={17} />
                </button>
                <p className={s.trial}>{t('pricing.trialNote')}</p>
              </div>

              {/* Right: everything included */}
              <div className={s.right}>
                <div className={s.featuresLabel}>{t('pricing.everythingIncluded')}</div>
                <div className={s.featGrid}>
                  {FEATURES.map((f) => (
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
