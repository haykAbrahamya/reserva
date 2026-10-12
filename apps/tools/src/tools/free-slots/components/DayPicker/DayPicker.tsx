import { useState } from 'react'
import { DatePicker, SegmentedFilter } from '@reserva/ui'
import { useT } from '@/i18n'
import { addDays, datePickerLabels, formatLongDay, today, useCalendarWords } from '@/lib/dates'
import s from './DayPicker.module.scss'

type Mode = 'today' | 'tomorrow' | 'other'

interface Props {
  value: string
  onChange: (day: string) => void
}

/**
 * Which day the slots are on. Today and tomorrow are one tap — they are the
 * stories people actually post — and any later day is behind "Other date".
 * The chosen day is spelled out underneath, so there is no doubt which one
 * the story will name.
 */
export function DayPicker({ value, onChange }: Props) {
  const t = useT()
  const words = useCalendarWords()
  const day0 = today()
  const day1 = addDays(day0, 1)
  const [other, setOther] = useState(value !== day0 && value !== day1)

  const mode: Mode = other ? 'other' : value === day1 ? 'tomorrow' : 'today'

  const pick = (next: Mode) => {
    setOther(next === 'other')
    if (next === 'today') onChange(day0)
    if (next === 'tomorrow') onChange(day1)
  }

  return (
    <div className={s.day}>
      <SegmentedFilter<Mode>
        value={mode}
        onChange={pick}
        ariaLabel={t('freeSlots.sections.day')}
        options={[
          { value: 'today', label: t('freeSlots.day.today') },
          { value: 'tomorrow', label: t('freeSlots.day.tomorrow') },
          { value: 'other', label: t('freeSlots.day.other') },
        ]}
      />

      {other ? (
        <DatePicker
          value={value}
          min={day0}
          clearable={false}
          onChange={(day) => day && onChange(day)}
          ariaLabel={t('freeSlots.day.pick')}
          placeholder={t('freeSlots.day.pick')}
          labels={datePickerLabels(words, { today: t('freeSlots.day.today') })}
        />
      ) : (
        <p className={s.chosen}>{formatLongDay(value, words)}</p>
      )}
    </div>
  )
}
