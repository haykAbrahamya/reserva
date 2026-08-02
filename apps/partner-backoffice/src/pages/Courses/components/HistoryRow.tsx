import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useI18n, useDateLocale } from '@/i18n'
import type { CohortHistoryEntry } from '@/services/courses.service'
import { StatusPill } from './StatusPill'
import { MembersPanel } from './MembersPanel'
import { fmtDateRange, statusKey, statusTone } from '../lib/courseFormat'
import s from './HistoryRow.module.scss'

interface Props {
  run: CohortHistoryEntry
}

/** One past run in the History tab. Collapsed it shows status + dates + member
 *  count; expanding reveals that run's full member list (read-only) — the data
 *  is preserved when a run is archived, so nothing is lost. */
export function HistoryRow({ run }: Props) {
  const { t } = useI18n()
  const dateLocale = useDateLocale()
  const [open, setOpen] = useState(false)

  return (
    <div className={[s.wrap, open ? s.open : ''].filter(Boolean).join(' ')}>
      <button type="button" className={s.header} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={s.info}>
          <StatusPill label={t(statusKey(run.status))} tone={statusTone(run.status)} />
          <span className={s.dates}>{fmtDateRange(run.startDate, run.endDate, dateLocale, t('common.dash'))}</span>
        </span>
        <span className={s.right}>
          <span className={s.count}>{t('courses.history.members', { count: run._count.enrollments })}</span>
          <ChevronDown size={16} className={s.chevron} />
        </span>
      </button>

      {open && (
        <div className={s.body}>
          {run._count.enrollments === 0 ? (
            <div className={s.noMembers}>{t('courses.history.noMembers')}</div>
          ) : (
            <MembersPanel cohortId={run.id} readOnly />
          )}
        </div>
      )}
    </div>
  )
}
