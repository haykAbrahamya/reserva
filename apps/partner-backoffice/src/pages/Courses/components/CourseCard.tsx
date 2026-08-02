import { Pencil, Trash2, Users, GraduationCap } from 'lucide-react'
import { useI18n, useDateLocale } from '@/i18n'
import { galleryImageUrl } from '@/services/partners.service'
import type { Course } from '@/types'
import { StatusPill } from './StatusPill'
import { coursePriceLabel, fmtDateRange, levelKey, statusKey, statusTone } from '../lib/courseFormat'
import s from './CourseCard.module.scss'

interface Props {
  course: Course
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

/** One course tile: cover, title, price/level, tutor, and its current run's
 *  status + member count. The whole card opens the manage view. */
export function CourseCard({ course, onOpen, onEdit, onDelete }: Props) {
  const { t } = useI18n()
  const dateLocale = useDateLocale()
  const cover = galleryImageUrl(course.coverUrl)
  const run = course.currentCohort
  const tutor = course.tutorSpecialist?.name || course.tutorName
  const lvl = levelKey(course.level)

  const memberLabel =
    run && run.capacity > 0
      ? `${run.confirmedCount} / ${run.capacity}`
      : String(run?.confirmedCount ?? 0)

  return (
    <div className={[s.card, course.active ? '' : s.inactive].filter(Boolean).join(' ')}>
      <button type="button" className={s.coverBtn} onClick={onOpen} aria-label={course.title}>
        {cover ? (
          <img src={cover} alt="" className={s.cover} />
        ) : (
          <span className={s.coverEmpty}><GraduationCap size={28} /></span>
        )}
        {!course.active && <span className={s.draftTag}>{t('courses.card.draft')}</span>}
        {lvl && <span className={s.levelTag}>{t(lvl)}</span>}
      </button>

      <div className={s.body}>
        <div className={s.titleRow}>
          <button type="button" className={s.title} onClick={onOpen}>{course.title}</button>
          <span className={s.price}>{coursePriceLabel(course.price, t('courses.free'))}</span>
        </div>

        {tutor && <div className={s.tutor}>{t('courses.card.by', { name: tutor })}</div>}

        <div className={s.runRow}>
          {run ? (
            <>
              <StatusPill label={t(statusKey(run.status))} tone={statusTone(run.status)} />
              <span className={s.members}><Users size={13} /> {memberLabel}</span>
              {(run.startDate || run.endDate) && (
                <span className={s.dates}>{fmtDateRange(run.startDate, run.endDate, dateLocale, t('common.dash'))}</span>
              )}
            </>
          ) : (
            <span className={s.noRun}>{t('courses.card.noRun')}</span>
          )}
        </div>
      </div>

      <div className={s.actions}>
        <button type="button" className={s.iconBtn} onClick={onEdit} aria-label={t('common.edit')}>
          <Pencil size={14} />
        </button>
        <button type="button" className={[s.iconBtn, s.danger].join(' ')} onClick={onDelete} aria-label={t('common.remove')}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
