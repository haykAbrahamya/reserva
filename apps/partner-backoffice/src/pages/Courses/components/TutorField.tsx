import { useState } from 'react'
import { Select, Input } from '@/components/ui'
import { useI18n } from '@/i18n'
import type { Specialist } from '@/types'
import s from './TutorField.module.scss'

export interface TutorValue {
  /** Linked specialist id, or '' for none/guest. */
  specialistId: string
  /** Free-text guest name (used when no specialist is linked). */
  guestName: string
  guestTitle: string
}

interface Props {
  value: TutorValue
  onChange: (next: TutorValue) => void
  specialists: Specialist[]
}

const GUEST = '__guest__'
const NONE = ''

/**
 * Tutor selector: pick one of the salon's specialists, choose "Guest" to type a
 * free-text name/title, or leave it as "No tutor". Keeps the two sources
 * mutually exclusive so the saved course has a clean tutor shape.
 */
export function TutorField({ value, onChange, specialists }: Props) {
  const { t } = useI18n()

  // Mode is EXPLICIT state (not derived from values) so choosing "Guest" shows
  // the inputs even before anything is typed. Seed from the initial value.
  const [mode, setMode] = useState<string>(
    value.specialistId ? value.specialistId : value.guestName || value.guestTitle ? GUEST : NONE,
  )

  const options = [
    { value: NONE, label: t('courses.tutor.none') },
    { value: GUEST, label: t('courses.tutor.guest') },
    ...specialists.map((sp) => ({ value: sp.id, label: sp.name, sub: sp.title || undefined })),
  ]

  const onModeChange = (v: string) => {
    setMode(v)
    if (v === NONE) onChange({ specialistId: '', guestName: '', guestTitle: '' })
    else if (v === GUEST) onChange({ specialistId: '', guestName: value.guestName, guestTitle: value.guestTitle })
    else onChange({ specialistId: v, guestName: '', guestTitle: '' })
  }

  return (
    <div className={s.wrap}>
      <label className={s.label}>{t('courses.tutor.label')}</label>
      <Select value={mode} onChange={onModeChange} options={options} placeholder={t('courses.tutor.none')} />
      {mode === GUEST && (
        <div className={s.guestRow}>
          <Input
            placeholder={t('courses.tutor.guestNamePlaceholder')}
            value={value.guestName}
            onChange={(e) => onChange({ ...value, specialistId: '', guestName: e.target.value })}
          />
          <Input
            placeholder={t('courses.tutor.guestTitlePlaceholder')}
            value={value.guestTitle}
            onChange={(e) => onChange({ ...value, specialistId: '', guestTitle: e.target.value })}
          />
        </div>
      )}
    </div>
  )
}
