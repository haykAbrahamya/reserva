import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, Chip, TimePicker } from '@reserva/ui'
import { useT } from '@/i18n'
import { ToolSection } from '@/components/tools/ToolSection/ToolSection'
import { LIMITS } from '../../model'
import { DAY_TIMES, sortTimes } from '../../time'
import s from './SlotGrid.module.scss'

interface Props {
  slots: string[]
  onToggle: (time: string) => void
  onClear: () => void
}

/**
 * The free times, picked by tapping. Every half hour of a working day is on
 * the grid; a time off the half hour ("14:15") is added below and then lives
 * on the grid in its place, deselected like any other.
 */
export function SlotGrid({ slots, onToggle, onClear }: Props) {
  const t = useT()
  const [custom, setCustom] = useState('12:15')
  const full = slots.length >= LIMITS.slots
  const times = sortTimes([...DAY_TIMES, ...slots])

  return (
    <ToolSection
      title={t('freeSlots.sections.slots')}
      sub={t('freeSlots.slots.count', { count: slots.length, max: LIMITS.slots })}
      action={
        <Button variant="ghost" size="sm" disabled={!slots.length} onClick={onClear}>
          {t('freeSlots.slots.clear')}
        </Button>
      }
    >
      <div className={s.grid} role="group" aria-label={t('freeSlots.sections.slots')}>
        {times.map((time) => {
          const selected = slots.includes(time)
          return (
            <Chip
              key={time}
              label={time}
              selected={selected}
              showTick={false}
              disabled={full && !selected}
              onClick={() => onToggle(time)}
            />
          )
        })}
      </div>

      <div className={s.custom}>
        <span className={s.customLabel}>{t('freeSlots.slots.custom')}</span>
        <TimePicker
          variant="field"
          className={s.time}
          value={custom}
          onChange={setCustom}
          step={5}
          minHour={6}
          maxHour={23}
        />
        <Button
          className={s.add}
          disabled={full || slots.includes(custom)}
          onClick={() => onToggle(custom)}
        >
          <Plus size={15} />
          {t('freeSlots.slots.add')}
        </Button>
      </div>

      <p className={s.hint}>
        {full ? t('freeSlots.slots.limit', { max: LIMITS.slots }) : t('freeSlots.slots.hint')}
      </p>
    </ToolSection>
  )
}
