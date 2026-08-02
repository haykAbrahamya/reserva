import { GraduationCap, CalendarClock, Users, ArrowRight } from 'lucide-react'
import { initials } from '@reserva/shared'
import type { PublicCourse } from '@/mock/partners'
import { useI18n, useLocalized } from '@/i18n'
import { fmtCoursePrice, courseSeatsLeft, courseIsOpen, courseDateLabel, courseTutorName } from '../../lib/courseDisplay'
import s from './CourseCard.module.scss'

interface Props {
  course: PublicCourse
  /** Brand tints for the placeholder cover + tutor chip. */
  tints: [string, string]
  onRegister: (course: PublicCourse) => void
}

/**
 * A public course card: cover, level badge, title + summary, tutor, dates and a
 * price/seats footer with a Register CTA. Warm and comfortable; the whole card
 * is tappable to register when open.
 */
export function CourseCard({ course, tints, onRegister }: Props) {
  const { t, locale } = useI18n()
  const loc = useLocalized()
  const [t1, t2] = tints

  const title = loc(course.title, course.titleI18n)
  const summary = loc(course.summary, course.summaryI18n)
  const tutor = courseTutorName(course, loc)
  const tutorTitle = course.tutorSpecialist
    ? loc(course.tutorSpecialist.title, course.tutorSpecialist.titleI18n)
    : course.tutorTitle
  const tutorAvatar = course.tutorSpecialist?.avatarUrl
  const dateLabel = courseDateLabel(course, locale)
  const seatsLeft = courseSeatsLeft(course)
  const open = courseIsOpen(course)
  const full = seatsLeft === 0

  return (
    <div className={s.card}>
      <div className={s.cover} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
        {course.coverUrl ? (
          <img src={course.coverUrl} alt="" className={s.coverImg} />
        ) : (
          <span className={s.coverIcon}><GraduationCap size={30} /></span>
        )}
        {course.level && <span className={s.levelBadge}>{t(`courses.level.${course.level}`)}</span>}
      </div>

      <div className={s.body}>
        <h3 className={s.title}>{title}</h3>
        {summary && <p className={s.summary}>{summary}</p>}

        {(tutor || dateLabel) && (
          <div className={s.info}>
            {tutor && (
              <div className={s.tutor}>
                <span className={s.tutorAvatar} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
                  {tutorAvatar ? <img src={tutorAvatar} alt="" /> : initials(tutor)}
                </span>
                <span className={s.tutorText}>
                  <span className={s.tutorName}>{tutor}</span>
                  {tutorTitle && <span className={s.tutorTitle}>{tutorTitle}</span>}
                </span>
              </div>
            )}
            {dateLabel && (
              <span className={s.date}><CalendarClock size={14} /> {dateLabel}</span>
            )}
          </div>
        )}

        <div className={s.footer}>
          <div className={s.footL}>
            <span className={s.price}>{fmtCoursePrice(course.price, t('courses.free'))}</span>
            {seatsLeft != null && (
              full
                ? <span className={s.full}>{t('courses.full')}</span>
                : <span className={s.seats}><Users size={13} /> {t('courses.seatsLeft', { count: seatsLeft })}</span>
            )}
          </div>
          {open ? (
            <button className={s.cta} onClick={() => onRegister(course)}>
              {t('courses.register.cta')} <ArrowRight size={16} />
            </button>
          ) : (
            <span className={s.closed}>{t('courses.closed')}</span>
          )}
        </div>
      </div>
    </div>
  )
}
