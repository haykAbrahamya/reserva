import { Play, Flag, Archive, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { useI18n } from '@/i18n'
import type { CohortStatus } from '@/types'
import type { CohortAction } from '@/services/courses.service'

interface Props {
  status: CohortStatus
  busy: boolean
  onAction: (action: CohortAction) => void
  onStartNewRun: () => void
}

/**
 * Lifecycle buttons for the current run, shown per status:
 *   open      → Start, Finish
 *   running   → Finish
 *   completed → Start new run (the "run it again from zero" flow)
 *   archived  → Start new run
 * "Start new run" is always available as the way to begin a fresh group.
 */
export function RunLifecycle({ status, busy, onAction, onStartNewRun }: Props) {
  const { t } = useI18n()

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {status === 'open' && (
        <Button variant="accent" size="sm" disabled={busy} onClick={() => onAction('start')}>
          <Play size={14} /> {t('courses.run.start')}
        </Button>
      )}
      {(status === 'open' || status === 'running') && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => onAction('finish')}>
          <Flag size={14} /> {t('courses.run.finish')}
        </Button>
      )}
      {(status === 'completed' || status === 'archived') && (
        <Button variant="accent" size="sm" disabled={busy} onClick={onStartNewRun}>
          <RotateCcw size={14} /> {t('courses.run.startNew')}
        </Button>
      )}
      {status !== 'archived' && status !== 'completed' && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => onAction('archive')}>
          <Archive size={14} /> {t('courses.run.archive')}
        </Button>
      )}
    </div>
  )
}
