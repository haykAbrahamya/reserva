import { useEffect, useState } from 'react'
import { SectionHead } from '@/components/SectionHead/SectionHead'
import { useReveal } from '@/hooks/useReveal'
import { useT } from '@/i18n'
import s from './HowItWorks.module.scss'

const STEPS = [
  { n: '1', key: 'setup' },
  { n: '2', key: 'book' },
  { n: '3', key: 'control' },
]

// Timing of the travelling-line journey (looping).
const TRAVEL_MS = 850   // line travels between steps
const HOLD_MS   = 2400  // pause + glow on each step
const RESET_MS  = 800   // pause at the end before restarting

export function HowItWorks() {
  const t = useT()
  const { ref, visible } = useReveal<HTMLDivElement>({ threshold: 0.3, once: false })

  // The step currently lit (-1 = idle). Only ONE step glows at a time.
  const [activeStep, setActiveStep] = useState(-1)
  // Fill 0 → 1 across the whole track.
  const [fill, setFill] = useState(0)
  // Disable the fill transition during the instant reset-to-zero.
  const [instant, setInstant] = useState(false)

  useEffect(() => {
    if (!visible) return

    let cancelled = false
    const timers: number[] = []
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setActiveStep(STEPS.length - 1)
      setFill(1)
      return
    }

    const last = STEPS.length - 1

    const runCycle = () => {
      if (cancelled) return
      let t = 0

      // snap line back to start (no transition)
      setInstant(true)
      setFill(0)
      setActiveStep(-1)
      timers.push(window.setTimeout(() => setInstant(false), 30))

      STEPS.forEach((_, i) => {
        // arrive + light this step (only this one glows)
        timers.push(window.setTimeout(() => {
          if (cancelled) return
          setActiveStep(i)
          setFill(last === 0 ? 1 : i / last)
        }, t))
        t += HOLD_MS

        // travel the line toward the next step
        if (i < last) {
          timers.push(window.setTimeout(() => {
            if (cancelled) return
            setFill((i + 1) / last)
          }, t))
          t += TRAVEL_MS
        }
      })

      // loop again
      timers.push(window.setTimeout(runCycle, t + RESET_MS))
    }

    runCycle()

    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [visible])

  const isCurrent = (i: number) => activeStep === i
  // a step stays "reached" (number filled) once the line has passed it
  const isReached = (i: number) => {
    const last = STEPS.length - 1
    return fill >= (last === 0 ? 1 : i / last) - 0.001 && activeStep >= 0
  }

  return (
    <section className={s.section} id="how">
      <div className={s.grid} />
      <div className={s.inner}>
        <SectionHead
          eyebrow={t('howItWorks.eyebrow')}
          title={<>{t('howItWorks.titlePre')}<em>{t('howItWorks.titleEm')}</em>{t('howItWorks.titlePost')}</>}
          subtitle={t('howItWorks.subtitle')}
        />

        <div className={s.steps} ref={ref}>
          {/* Travelling progress line (desktop) */}
          <div className={s.track}>
            <div
              className={[s.trackFill, instant ? s.instant : ''].filter(Boolean).join(' ')}
              style={{ width: `${fill * 100}%` }}
            >
              <span className={s.comet} />
            </div>
          </div>

          {STEPS.map((step, i) => (
            <div
              key={step.n}
              className={[
                s.step,
                isReached(i) ? s.reached : '',
                isCurrent(i) ? s.current : '',
              ].filter(Boolean).join(' ')}
            >
              <div className={s.num}>
                <span className={s.numInner}>{step.n}</span>
                <span className={s.numRing} />
              </div>
              <h3 className={s.stepTitle}>{t(`howItWorks.steps.${step.key}.title`)}</h3>
              <p className={s.stepText}>{t(`howItWorks.steps.${step.key}.text`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
