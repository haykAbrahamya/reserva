import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useProfileCompletion } from './useProfileCompletion'
import s from './SidebarSetupNudge.module.scss'

/**
 * Compact "setup progress" nudge for the sidebar. Persistent but quiet: a small
 * progress ring + "N/M · Complete setup" that navigates to the Dashboard (where
 * the full checklist lives). Auto-hides once all required items are done, so it
 * never lingers for established partners.
 *
 * `collapsed` renders just the ring (icon-rail width) with a tooltip.
 */
export function SidebarSetupNudge({ collapsed }: { collapsed?: boolean }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { loading, requiredDone, requiredTotal, allRequiredDone } = useProfileCompletion()

  if (loading || requiredTotal === 0 || allRequiredDone) return null

  const pct = Math.round((requiredDone / requiredTotal) * 100)
  const label = t('onboarding.nudge.label')
  const count = t('onboarding.progress', { done: requiredDone, total: requiredTotal })

  // SVG ring geometry.
  const R = 9
  const C = 2 * Math.PI * R
  const dash = (pct / 100) * C

  const ring = (
    <span className={s.ring} aria-hidden>
      <svg viewBox="0 0 24 24" width="24" height="24">
        <circle className={s.ringTrack} cx="12" cy="12" r={R} />
        <circle
          className={s.ringFill}
          cx="12"
          cy="12"
          r={R}
          strokeDasharray={`${dash} ${C}`}
          transform="rotate(-90 12 12)"
        />
      </svg>
      <Sparkles size={10} className={s.ringIcon} />
    </span>
  )

  if (collapsed) {
    return (
      <button
        className={[s.nudge, s.collapsed].join(' ')}
        onClick={() => navigate('/')}
        title={`${label} · ${count}`}
        aria-label={`${label} · ${count}`}
      >
        {ring}
      </button>
    )
  }

  return (
    <button className={s.nudge} onClick={() => navigate('/')}>
      {ring}
      <span className={s.text}>
        <span className={s.label}>{label}</span>
        <span className={s.count}>{count}</span>
      </span>
    </button>
  )
}
