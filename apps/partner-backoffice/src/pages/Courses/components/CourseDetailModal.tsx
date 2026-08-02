import { useState } from 'react'
import { Modal, SegmentedFilter, ConfirmDialog, useToast } from '@/components/ui'
import { useResource } from '@/store/useResource'
import { useI18n } from '@/i18n'
import { errorMessage } from '@/utils/errors'
import { coursesService } from '@/services/courses.service'
import type { Course, Location } from '@/types'
import { RunPanel } from './RunPanel'
import { MembersPanel } from './MembersPanel'
import { HistoryRow } from './HistoryRow'
import s from './CourseDetailModal.module.scss'

interface Props {
  course: Course
  locations: Location[]
  onClose: () => void
  /** Refresh the parent course list (counts/current run may have changed). */
  onChanged: () => void
}

type Tab = 'run' | 'members' | 'history'

/**
 * Manage one course's active run: its details + lifecycle (Run tab), its members
 * (Members tab), and its past runs (History tab). The current run is fetched
 * fresh so lifecycle changes reflect immediately.
 */
export function CourseDetailModal({ course, locations, onClose, onChanged }: Props) {
  const { t } = useI18n()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('run')
  const [confirmNewRun, setConfirmNewRun] = useState(false)
  const [startingRun, setStartingRun] = useState(false)

  const { data: cohort, reload: reloadRun } = useResource(
    () => coursesService.currentRun(course.id),
    [course.id],
  )
  const { data: history, reload: reloadHistory } = useResource(
    () => coursesService.runHistory(course.id),
    [course.id],
    [],
  )

  // Confirmed count for the capacity meter comes from the course rollup, kept in
  // sync as members change via onChanged (which the parent refreshes).
  const confirmedCount = course.currentCohort?.confirmedCount ?? 0

  const refreshAll = async () => {
    await Promise.all([reloadRun(), reloadHistory()])
    onChanged()
  }

  const startNewRun = async () => {
    setStartingRun(true)
    try {
      await coursesService.startNewRun(course.id)
      setConfirmNewRun(false)
      setTab('run')
      await refreshAll()
      toast(t('courses.run.newRunToast'))
    } catch (err) { toast(errorMessage(err, t)) } finally { setStartingRun(false) }
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'run', label: t('courses.detail.tabRun') },
    { value: 'members', label: t('courses.detail.tabMembers') },
    { value: 'history', label: t('courses.detail.tabHistory') },
  ]

  return (
    <Modal open onClose={onClose} title={course.title} subtitle={t('courses.detail.subtitle')} size="lg">
      <div className={s.wrap}>
        <div className={s.tabs}>
          <SegmentedFilter<Tab> value={tab} onChange={setTab} options={tabs} size="sm" />
        </div>

        {tab === 'run' && (
          cohort ? (
            <RunPanel
              cohort={cohort}
              confirmedCount={confirmedCount}
              locations={locations}
              onChanged={refreshAll}
              onStartNewRun={() => setConfirmNewRun(true)}
            />
          ) : (
            <div className={s.loading}>{t('common.loading')}</div>
          )
        )}

        {tab === 'members' && (
          cohort ? (
            <MembersPanel
              cohortId={cohort.id}
              readOnly={cohort.status === 'archived'}
              onChanged={onChanged}
            />
          ) : (
            <div className={s.loading}>{t('common.loading')}</div>
          )
        )}

        {tab === 'history' && (
          <div className={s.history}>
            {(history ?? []).length === 0 ? (
              <div className={s.historyEmpty}>{t('courses.history.empty')}</div>
            ) : (
              (history ?? []).map((h) => <HistoryRow key={h.id} run={h} />)
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmNewRun}
        title={t('courses.run.newRunConfirmTitle')}
        message={t('courses.run.newRunConfirmBody')}
        confirmLabel={t('courses.run.startNew')}
        cancelLabel={t('common.cancel')}
        loading={startingRun}
        onConfirm={startNewRun}
        onClose={() => setConfirmNewRun(false)}
      />
    </Modal>
  )
}
