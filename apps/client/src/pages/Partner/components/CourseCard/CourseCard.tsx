import { GraduationCap, CalendarClock, Users, ArrowRight, Phone, Info } from 'lucide-react'
import { initials } from '@reserva/shared'
import type { PublicPartner, PublicCourse } from '@/mock/partners'
import { useI18n, useLocalized } from '@/i18n'
import {
  fmtCoursePrice,
  courseSeatsLeft,
  courseDateLabel,
  courseTutor,
  courseDescription,
  courseCta,
} from '../../lib/courseDisplay'
import s from './CourseCard.module.scss'

interface Props {
  partner: PublicPartner
  course: PublicCourse
  /** Brand tints for the placeholder cover + tutor chip. */
  tints: [string, string]
  onRegister: (course: PublicCourse) => void
  /** Open the read-only details popup (full description). */
  onDetails: (course: PublicCourse) => void
  /** Open the "which branch to call?" picker (used when booking is off and the
   *  partner has more than one branch). */
  onCall: () => void
}

/**
 * A public course card: cover, level badge, title + summary, tutor, dates and a
 * price/seats footer with a Register CTA. Warm and comfortable.
 *
 * The card stays a teaser — the long-form description lives one tap away in the
 * details popup, reached via the "see more info" link under the summary, so the
 * grid never sprawls and the registration form stays short.
 */
export function CourseCard({ partner, course, tints, onRegister, onDetails, onCall }: Props) {
  const { t, locale } = useI18n()
  const loc = useLocalized()
  const [t1, t2] = tints

  const priceLabel = fmtCoursePrice(course, t('courses.free'))
  const title = loc(course.title, course.titleI18n)
  const summary = loc(course.summary, course.summaryI18n)
  const tutor = courseTutor(course, loc)
  const dateLabel = courseDateLabel(course, locale)
  const seatsLeft = courseSeatsLeft(course)
  const full = seatsLeft === 0

  // Only offer "see more info" when the salon actually wrote a description —
  // otherwise the popup would just repeat what the card already shows.
  const hasDetails = courseDescription(course, loc) !== ''

  // Contact-only partners (online booking disabled) take no online sign-ups, so
  // the Register CTA becomes a Call action — mirroring the hero/locations
  // pattern. Resolved once, shared with the details popup.
  const cta = courseCta(partner, course)

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

        {hasDetails && (
          <button type="button" className={s.moreBtn} onClick={() => onDetails(course)}>
            <Info size={14} /> {t('courses.details.cta')}
          </button>
        )}

        {(tutor.name || dateLabel) && (
          <div className={s.info}>
            {tutor.name && (
              <div className={s.tutor}>
                <span className={s.tutorAvatar} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
                  {tutor.avatarUrl ? <img src={tutor.avatarUrl} alt="" /> : initials(tutor.name)}
                </span>
                <span className={s.tutorText}>
                  <span className={s.tutorName}>{tutor.name}</span>
                  {tutor.title && <span className={s.tutorTitle}>{tutor.title}</span>}
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
            {priceLabel && <span className={s.price}>{priceLabel}</span>}
            {seatsLeft != null && (
              full
                ? <span className={s.full}>{t('courses.full')}</span>
                : <span className={s.seats}><Users size={13} /> {t('courses.seatsLeft', { count: seatsLeft })}</span>
            )}
          </div>

          {cta.kind === 'register' ? (
            <button className={s.cta} onClick={() => onRegister(course)}>
              {t('courses.register.cta')} <ArrowRight size={16} />
            </button>
          ) : cta.kind === 'closed' ? (
            <span className={s.closed}>{t('courses.closed')}</span>
          ) : cta.pickBranch ? (
            <button className={s.cta} onClick={onCall}>
              <Phone size={16} /> {t('courses.call')}
            </button>
          ) : cta.telHref ? (
            <a className={s.cta} href={cta.telHref}>
              <Phone size={16} /> {t('courses.call')}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
