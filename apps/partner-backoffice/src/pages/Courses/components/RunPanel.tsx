import { useState } from 'react'
import { Calendar, Save } from 'lucide-react'
import { DatePicker, Input, Select, Toggle, Button, useToast } from '@/components/ui'
import { useI18n, useDatePickerLabels } from '@/i18n'
import { errorMessage } from '@/utils/errors'
import { coursesService, type CohortAction, type CohortInput } from '@/services/courses.service'
import type { CourseCohort, Location } from '@/types'
import { StatusPill } from './StatusPill'
import { CapacityMeter } from './CapacityMeter'
import { RunLifecycle } from './RunLifecycle'
import { statusKey, statusTone } from '../lib/courseFormat'
import s from './RunPanel.module.scss'

interface Props {
  cohort: CourseCohort
  /** Confirmed member count for the capacity meter. */
  confirmedCount: number
  locations: Location[]
  onChanged: () => void
  onStartNewRun: () => void
}

/** `YYYY-MM-DD` ⇄ ISO helpers (DatePicker speaks date-only, the API ISO). */
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const toISO = (date: string) => (date ? new Date(`${date}T00:00:00`).toISOString() : null)

/**
 * The current run's header + editable details + lifecycle. Details (dates,
 * capacity, branch, schedule, registration) edit inline and save together; the
 * lifecycle buttons transition the run's status.
 */
export function RunPanel({ cohort, confirmedCount, locations, onChanged, onStartNewRun }: Props) {
  const { t } = useI18n()
  const toast = useToast()
  const dateLabels = useDatePickerLabels()

  const [start, setStart] = useState(toDateInput(cohort.startDate))
  const [end, setEnd] = useState(toDateInput(cohort.endDate))
  const [capacity, setCapacity] = useState(cohort.capacity ? String(cohort.capacity) : '')
  const [schedule, setSchedule] = useState(cohort.scheduleText)
  const [locationId, setLocationId] = useState(cohort.locationId ?? '')
  const [registrationOpen, setRegistrationOpen] = useState(cohort.registrationOpen)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)

  const editable = cohort.status !== 'archived' && cohort.status !== 'completed'

  const dirty =
    start !== toDateInput(cohort.startDate) ||
    end !== toDateInput(cohort.endDate) ||
    capacity !== (cohort.capacity ? String(cohort.capacity) : '') ||
    schedule !== cohort.scheduleText ||
    locationId !== (cohort.locationId ?? '') ||
    registrationOpen !== cohort.registrationOpen

  const capLabel =
    cohort.capacity > 0
      ? `${confirmedCount} / ${cohort.capacity}`
      : `${confirmedCount} · ${t('courses.run.unlimited')}`

  const locationOptions = [
    { value: '', label: t('courses.run.noBranch') },
    ...locations.map((l) => ({ value: l.id, label: l.name, sub: l.address || undefined })),
  ]

  const save = async () => {
    setSaving(true)
    try {
      const patch: CohortInput = {
        startDate: toISO(start),
        endDate: toISO(end),
        capacity: capacity.trim() === '' ? 0 : Math.max(0, Number(capacity) || 0),
        scheduleText: schedule.trim(),
        locationId: locationId || null,
        registrationOpen,
      }
      await coursesService.updateRun(cohort.id, patch)
      await onChanged()
      toast(t('courses.run.savedToast'))
    } catch (err) { toast(errorMessage(err, t)) } finally { setSaving(false) }
  }

  const doAction = async (action: CohortAction) => {
    setBusy(true)
    try {
      await coursesService.transitionRun(cohort.id, action)
      await onChanged()
    } catch (err) { toast(errorMessage(err, t)) } finally { setBusy(false) }
  }

  return (
    <div className={s.panel}>
      {/* Header: status + capacity + lifecycle */}
      <div className={s.header}>
        <div className={s.headLeft}>
          <StatusPill label={t(statusKey(cohort.status))} tone={statusTone(cohort.status)} />
          <CapacityMeter filled={confirmedCount} capacity={cohort.capacity} label={capLabel} />
        </div>
        <RunLifecycle status={cohort.status} busy={busy} onAction={doAction} onStartNewRun={onStartNewRun} />
      </div>

      {/* Editable details */}
      <div className={s.details}>
        <DatePicker
          label={t('courses.run.startDate')}
          value={start}
          onChange={setStart}
          labels={dateLabels}
          placeholder={t('courses.run.datePlaceholder')}
        />
        <DatePicker
          label={t('courses.run.endDate')}
          value={end}
          onChange={setEnd}
          min={start || undefined}
          labels={dateLabels}
          placeholder={t('courses.run.datePlaceholder')}
        />
        <Input
          label={t('courses.run.capacity')}
          type="number"
          min={0}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder={t('courses.run.capacityUnlimited')}
          help={t('courses.run.capacityHelp')}
        />
        <div className={s.field}>
          <label className={s.label}>{t('courses.run.branch')}</label>
          <Select value={locationId} onChange={setLocationId} options={locationOptions} placeholder={t('courses.run.noBranch')} />
        </div>
        <div className={s.full}>
          <Input
            label={t('courses.run.schedule')}
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder={t('courses.run.schedulePlaceholder')}
          />
        </div>
        <div className={[s.full, s.regRow].join(' ')}>
          <div className={s.regText}>
            <Calendar size={15} />
            <div>
              <div className={s.regLabel}>{t('courses.run.registrationLabel')}</div>
              <div className={s.regHint}>{t('courses.run.registrationHint')}</div>
            </div>
          </div>
          <Toggle checked={registrationOpen} onChange={setRegistrationOpen} />
        </div>
      </div>

      {editable && dirty && (
        <div className={s.saveBar}>
          <Button variant="accent" size="sm" disabled={saving} onClick={save}>
            <Save size={14} /> {saving ? t('common.saving') : t('courses.run.saveDetails')}
          </Button>
        </div>
      )}
    </div>
  )
}
