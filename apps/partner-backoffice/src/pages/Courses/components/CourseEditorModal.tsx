import { useState } from 'react'
import { Modal, Button, Input, Select, Toggle } from '@/components/ui'
import { I18nField } from '@/components/i18n/I18nField/I18nField'
import { useI18n } from '@/i18n'
import { galleryImageUrl } from '@/services/partners.service'
import type { Course, CourseLevel, LocalizedText, Specialist } from '@/types'
import type { CourseInput } from '@/services/courses.service'
import { CoverPicker } from './CoverPicker'
import { TutorField, type TutorValue } from './TutorField'
import s from './CourseEditorModal.module.scss'

interface Props {
  /** Course being edited, or null for a new one. */
  course: Course | null
  specialists: Specialist[]
  saving: boolean
  onClose: () => void
  /** Persist the course fields + staged cover intent. Parent handles the API. */
  onSubmit: (data: CourseInput, cover: { file: File | null; cleared: boolean }) => void
}

interface FormState {
  title: string
  titleI18n: LocalizedText | null
  summary: string
  summaryI18n: LocalizedText | null
  description: string
  descriptionI18n: LocalizedText | null
  price: string
  level: '' | CourseLevel
  active: boolean
  tutor: TutorValue
}

function fromCourse(course: Course | null): FormState {
  return {
    title: course?.title ?? '',
    titleI18n: course?.titleI18n ?? null,
    summary: course?.summary ?? '',
    summaryI18n: course?.summaryI18n ?? null,
    description: course?.description ?? '',
    descriptionI18n: course?.descriptionI18n ?? null,
    price: course && course.price > 0 ? String(course.price) : '',
    level: course?.level ?? '',
    active: course?.active ?? true,
    tutor: {
      specialistId: course?.tutorSpecialistId ?? '',
      guestName: course?.tutorSpecialistId ? '' : (course?.tutorName ?? ''),
      guestTitle: course?.tutorSpecialistId ? '' : (course?.tutorTitle ?? ''),
    },
  }
}

const LEVELS: CourseLevel[] = ['beginner', 'intermediate', 'advanced']

/** Create/edit a course's template fields. Cover is staged and committed by the
 *  parent after the course id exists. Kept presentational — no API calls here. */
export function CourseEditorModal({ course, specialists, saving, onClose, onSubmit }: Props) {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(() => fromCourse(course))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errs[k as string]) setErrs((e) => { const n = { ...e }; delete n[k as string]; return n })
  }

  // Cover is staged locally; committed URL comes from the loaded course.
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverCleared, setCoverCleared] = useState(false)
  const committedCover = coverCleared ? '' : galleryImageUrl(course?.coverUrl)

  const levelOptions = [
    { value: '', label: t('courses.level.none') },
    ...LEVELS.map((l) => ({ value: l, label: t(`courses.level.${l}`) })),
  ]

  const submit = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = t('errors.required')
    const priceNum = form.price.trim() === '' ? 0 : Number(form.price)
    if (form.price.trim() !== '' && (!Number.isFinite(priceNum) || priceNum < 0)) e.price = t('errors.invalid')
    setErrs(e)
    if (Object.keys(e).length) return

    const data: CourseInput = {
      title: form.title.trim(),
      titleI18n: form.titleI18n,
      summary: form.summary.trim(),
      summaryI18n: form.summaryI18n,
      description: form.description.trim(),
      descriptionI18n: form.descriptionI18n,
      price: priceNum,
      level: form.level || null,
      active: form.active,
      tutorSpecialistId: form.tutor.specialistId || null,
      tutorName: form.tutor.specialistId ? '' : form.tutor.guestName.trim(),
      tutorTitle: form.tutor.specialistId ? '' : form.tutor.guestTitle.trim(),
    }
    onSubmit(data, { file: coverFile, cleared: coverCleared })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={course ? t('courses.editor.editTitle') : t('courses.editor.newTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="accent" disabled={saving} onClick={submit}>
            {saving ? t('common.saving') : course ? t('common.saveChanges') : t('courses.editor.create')}
          </Button>
        </>
      }
    >
      <div className={s.grid}>
        <div className={s.full}>
          <label className={s.fieldLabel}>{t('courses.editor.coverLabel')}</label>
          <CoverPicker
            currentUrl={committedCover}
            onPick={(file) => { setCoverFile(file); setCoverCleared(false) }}
            onClear={() => { setCoverFile(null); setCoverCleared(true) }}
          />
        </div>

        <div className={s.full}>
          <I18nField
            label={t('courses.editor.titleLabel')}
            value={form.title}
            onChange={(v) => set('title', v)}
            i18n={form.titleI18n}
            onI18nChange={(next) => set('titleI18n', next)}
            placeholder={t('courses.editor.titlePlaceholder')}
            error={errs.title}
          />
        </div>

        <div className={s.full}>
          <I18nField
            label={t('courses.editor.summaryLabel')}
            value={form.summary}
            onChange={(v) => set('summary', v)}
            i18n={form.summaryI18n}
            onI18nChange={(next) => set('summaryI18n', next)}
            placeholder={t('courses.editor.summaryPlaceholder')}
          />
        </div>

        <div className={s.full}>
          <I18nField
            label={t('courses.editor.descriptionLabel')}
            value={form.description}
            onChange={(v) => set('description', v)}
            i18n={form.descriptionI18n}
            onI18nChange={(next) => set('descriptionI18n', next)}
            placeholder={t('courses.editor.descriptionPlaceholder')}
            multiline
            rows={5}
          />
        </div>

        <Input
          label={t('courses.editor.priceLabel')}
          type="number"
          min={0}
          value={form.price}
          onChange={(e) => set('price', e.target.value)}
          placeholder={t('courses.editor.priceFree')}
          help={t('courses.editor.priceHelp')}
          error={errs.price}
        />

        <div>
          <label className={s.fieldLabel}>{t('courses.editor.levelLabel')}</label>
          <Select
            value={form.level}
            onChange={(v) => set('level', v as '' | CourseLevel)}
            options={levelOptions}
            placeholder={t('courses.level.none')}
          />
        </div>

        <div className={s.full}>
          <TutorField value={form.tutor} onChange={(v) => set('tutor', v)} specialists={specialists} />
        </div>

        <div className={[s.full, s.activeRow].join(' ')}>
          <div>
            <div className={s.activeLabel}>{t('courses.editor.activeLabel')}</div>
            <div className={s.activeHint}>{t('courses.editor.activeHint')}</div>
          </div>
          <Toggle checked={form.active} onChange={(v) => set('active', v)} />
        </div>
      </div>
    </Modal>
  )
}
