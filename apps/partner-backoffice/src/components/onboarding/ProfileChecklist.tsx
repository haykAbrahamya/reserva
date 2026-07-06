import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, ChevronDown, Sparkles, PartyPopper, ExternalLink, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useProfileCompletion, type ChecklistItem } from './useProfileCompletion'
import s from './ProfileChecklist.module.scss'

/** localStorage key remembering the user dismissed the completed card. */
const DISMISS_KEY = 'reserva-onboarding-dismissed'
/** localStorage key remembering the expanded/collapsed preference. */
const EXPANDED_KEY = 'reserva-onboarding-expanded'

/**
 * "Complete your profile" onboarding card for the Dashboard.
 *
 * Visibility rules (visible but not bothering):
 *  - Hidden entirely once all REQUIRED items are done AND the user dismissed the
 *    celebratory state (so it never nags an established partner).
 *  - While incomplete it can't be dismissed — the whole point is to guide setup.
 *  - When it flips to complete, it shows a one-time "you're live" celebration
 *    with a "view your page" CTA, then a dismiss (X) that hides it for good.
 */
export function ProfileChecklist() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const {
    loading,
    requiredItems,
    recommendedItems,
    requiredDone,
    requiredTotal,
    allRequiredDone,
    hasSlug,
    slug,
  } = useProfileCompletion()

  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  )
  // Collapsed by default (minimal, non-bothering); remembers the preference.
  const [expanded, setExpanded] = useState(
    () => localStorage.getItem(EXPANDED_KEY) === '1',
  )

  // Don't render until we know the state (avoids a flash), and never render once
  // complete-and-dismissed.
  if (loading || requiredTotal === 0) return null
  if (allRequiredDone && dismissed) return null

  const pct = Math.round((requiredDone / requiredTotal) * 100)
  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }
  const toggleExpanded = () => {
    setExpanded((v) => {
      const next = !v
      localStorage.setItem(EXPANDED_KEY, next ? '1' : '0')
      return next
    })
  }

  // ── Completed → celebratory state ──
  if (allRequiredDone) {
    return (
      <div className={[s.card, s.done].join(' ')}>
        <button className={s.close} onClick={dismiss} aria-label={t('onboarding.done.dismiss')}>
          <X size={16} />
        </button>
        <div className={s.doneIcon}><PartyPopper size={22} /></div>
        <div className={s.doneText}>
          <div className={s.doneTitle}>{t('onboarding.done.title')}</div>
          <div className={s.doneSub}>{t('onboarding.done.subtitle')}</div>
        </div>
        {hasSlug && slug && (
          <a
            className={s.doneCta}
            href={`https://${slug}.reserva.am`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={14} /> {t('onboarding.done.viewPage')}
          </a>
        )}
      </div>
    )
  }

  // ── In-progress → checklist ──
  const renderRow = (item: ChecklistItem) => (
    <button
      key={item.id}
      className={[s.row, item.done ? s.rowDone : ''].filter(Boolean).join(' ')}
      onClick={() => !item.done && navigate(item.to)}
      disabled={item.done}
    >
      <span className={[s.check, item.done ? s.checkOn : ''].filter(Boolean).join(' ')}>
        {item.done && <Check size={13} strokeWidth={3} />}
      </span>
      <span className={s.rowText}>
        <span className={s.rowTitle}>{t(`onboarding.items.${item.id}.title`)}</span>
        {!item.done && (
          <span className={s.rowHint}>{t(`onboarding.items.${item.id}.hint`)}</span>
        )}
      </span>
      {!item.done && <ChevronRight size={17} className={s.rowArrow} />}
    </button>
  )

  return (
    <div className={[s.card, expanded ? s.expanded : s.throb].filter(Boolean).join(' ')}>
      {/* Header doubles as the expand/collapse toggle. */}
      <button
        className={s.head}
        onClick={toggleExpanded}
        aria-expanded={expanded}
      >
        <div className={s.headIcon}><Sparkles size={18} /></div>
        <div className={s.headText}>
          <div className={s.title}>{t('onboarding.title')}</div>
          {/* Collapsed keeps it minimal (title + progress chip). Expanded adds
             the descriptive subtitle. On mobile the chip is hidden, so show the
             progress here when collapsed. */}
          <div className={s.subtitle}>
            <span className={s.subtitleFull}>{t('onboarding.subtitle')}</span>
            {!expanded && (
              <span className={s.subtitleProgress}>
                {t('onboarding.progress', { done: requiredDone, total: requiredTotal })}
              </span>
            )}
          </div>
        </div>
        <div className={s.progressWrap}>
          <div className={s.progressCount}>
            {t('onboarding.progress', { done: requiredDone, total: requiredTotal })}
          </div>
        </div>
        <ChevronDown size={18} className={[s.chevron, expanded ? s.chevronUp : ''].filter(Boolean).join(' ')} />
      </button>

      <div className={s.bar}>
        <div className={s.barFill} style={{ width: `${pct}%` }} />
      </div>

      {expanded && (
        <div className={s.body}>
          <div className={s.groupLabel}>{t('onboarding.groups.required')}</div>
          <div className={s.rows}>{requiredItems.map(renderRow)}</div>

          {recommendedItems.length > 0 && (
            <>
              <div className={s.groupLabel}>{t('onboarding.groups.recommended')}</div>
              <div className={s.rows}>{recommendedItems.map(renderRow)}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
