import { fmtDuration } from '@reserva/shared'
import { DatePicker, Input, Select, TimePicker } from '@reserva/ui'
import { useT } from '@/i18n'
import { FieldGrid, FieldWide } from '@/components/tools/FieldGrid/FieldGrid'
import { datePickerLabels, today, useCalendarWords } from '@/lib/dates'
import { DURATIONS, LIMITS, type Appointment } from '../../model'
import s from './VisitFields.module.scss'

type VisitField = 'service' | 'date' | 'time' | 'duration'

interface Props {
  draft: Appointment
  onChange: (field: VisitField, value: string | number) => void
}

/** What, when and how long — the part that changes with every client. */
export function VisitFields({ draft, onChange }: Props) {
  const t = useT()
  const words = useCalendarWords()
  const units = { min: t('appointmentCard.units.min'), h: t('appointmentCard.units.hour') }

  return (
    <FieldGrid>
      <FieldWide>
        <Input
          label={t('appointmentCard.fields.service')}
          value={draft.service}
          maxLength={LIMITS.service}
          placeholder={t('appointmentCard.fields.servicePlaceholder')}
          onChange={(e) => onChange('service', e.target.value)}
        />
      </FieldWide>
      <DatePicker
        label={t('appointmentCard.fields.date')}
        value={draft.date}
        min={today()}
        clearable={false}
        onChange={(day) => day && onChange('date', day)}
        labels={datePickerLabels(words, { today: t('appointmentCard.fields.today') })}
      />
      <div className={s.field}>
        <span className={s.label}>{t('appointmentCard.fields.time')}</span>
        <TimePicker
          variant="field"
          value={draft.time}
          onChange={(time) => onChange('time', time)}
          step={5}
          minHour={6}
          maxHour={23}
        />
      </div>
      <div className={s.field}>
        <span className={s.label}>{t('appointmentCard.fields.duration')}</span>
        <Select
          value={String(draft.duration)}
          onChange={(value) => onChange('duration', Number(value))}
          options={DURATIONS.map((minutes) => ({ value: String(minutes), label: fmtDuration(minutes, units) }))}
          searchable={false}
        />
      </div>
    </FieldGrid>
  )
}
