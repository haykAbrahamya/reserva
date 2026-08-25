import { useMemo } from 'react'
import { X, GraduationCap, CalendarClock, Users, ArrowRight, Phone, BookOpen } from 'lucide-react'
import { initials } from '@reserva/shared'
import type { PublicPartner, PublicCourse } from '@/mock/partners'
import { partnerBrandVars } from '../../partnerBrand'
import { useAppSelector } from '@/store/hooks'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { useI18n, useLocalized } from '@/i18n'
import {
  fmtCoursePrice,
  courseSeatsLeft,
  courseDateLabel,
  courseTutor,
  courseDescription,
  courseCta,
} from '../../lib/courseDisplay'
import s from './CourseDetailsModal.module.scss'

interface Props {
  partner: PublicPartner
  course: PublicCourse
  onClose: () => void
  /** Hand off to the registration popup — this one animates itself away first. */
  onRegister: (course: PublicCourse) => void
  /** Open the "which branch to call?" picker (contact-only, multi-branch). */
  onCall: () => void
}

/**
 * Read-only course details popup — the home for the long-form description /
 * curriculum, which is far too big to sit inside the registration form. Cover
 * hero, price + date + seats context, the tutor, the full description, and the
 * SAME call-to-action the card shows (via `courseCta`) so the popup is a step in
 * the funnel rather than a dead end.
 */
export function CourseDetailsModal({ partner, course, onClose, onRegister, onCall }: Props) {
  const [t1, t2] = partner.presentation.heroTints
  const { t, locale } = useI18n()
  const loc = useLocalized()
  const theme = useAppSelector((st) => st.theme.theme)
  const brandVars = useMemo(() => partnerBrandVars(partner, theme === 'dark'), [partner, theme])

  const title = loc(course.title, course.titleI18n)
  const summary = loc(course.summary, course.summaryI18n)
  const description = courseDescription(course, loc)
  const tutor = courseTutor(course, loc)
  const priceLabel = fmtCoursePrice(course, t('courses.free'))
  const dateLabel = courseDateLabel(course, locale)
  const seatsLeft = courseSeatsLeft(course)
  const cta = courseCta(partner, course)
  const titleId = `course-details-${course.id}`

  return (
    <ModalShell open onClose={onClose} closeDuration={280}>
      {({ closing, requestClose }) => {
        // The footer action mirrors the card's, resolved from the shared
        // `courseCta` so the two can never drift apart.
        let action = null
        if (cta.kind === 'register') {
          action = (
            <button className={s.primary} onClick={() => { onRegister(course); requestClose() }}>
              {t('courses.register.cta')} <ArrowRight size={17} />
            </button>
          )
        } else if (cta.kind === 'closed') {
          action = <span className={s.closed}>{t('courses.closed')}</span>
        } else if (cta.pickBranch) {
          action = (
            <button className={s.primary} onClick={() => { onCall(); requestClose() }}>
              <Phone size={17} /> {t('courses.call')}
            </button>
          )
        } else if (cta.telHref) {
          action = (
            <a className={s.primary} href={cta.telHref}>
              <Phone size={17} /> {t('courses.call')}
            </a>
          )
        }

        return (
          <div
            className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')}
            onClick={requestClose}
            style={brandVars}
          >
            <div
              className={[s.modal, closing ? s.closing : ''].filter(Boolean).join(' ')}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <button className={s.closeBtn} onClick={requestClose} aria-label={t('courses.details.close')}>
                <X size={16} />
              </button>

              {/* Header. With a cover photo it's a (height-capped) hero with the
                  title over a scrim; without one there is no photo to show, so
                  we use the compact branded bar instead of reserving an empty
                  16:9 slot — same shape as the registration popup. */}
              {course.coverUrl ? (
                <div className={s.hero} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
                  <img src={course.coverUrl} alt="" className={s.heroImg} />
                  <span className={s.heroScrim} />
                  <div className={s.heroText}>
                    <div className={s.eyebrow}>{t('courses.details.eyebrow')}</div>
                    <h2 className={s.title} id={titleId}>{title}</h2>
                  </div>
                </div>
              ) : (
                <div className={s.header} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
                  <span className={s.headerGrid} />
                  <span className={s.headerIcon}><GraduationCap size={22} /></span>
                  <div className={s.headerText}>
                    <div className={s.eyebrow}>{t('courses.details.eyebrow')}</div>
                    <h2 className={s.title} id={titleId}>{title}</h2>
                  </div>
                </div>
              )}

              <div className={s.body}>
                {/* Context chips: price, dates, seats */}
                <div className={s.meta}>
                  {priceLabel && <span className={s.price}>{priceLabel}</span>}
                  {course.level && (
                    <span className={s.levelChip}>{t(`courses.level.${course.level}`)}</span>
                  )}
                  {dateLabel && (
                    <span className={s.metaChip}><CalendarClock size={14} /> {dateLabel}</span>
                  )}
                  {seatsLeft != null && (
                    seatsLeft === 0
                      ? <span className={s.fullChip}>{t('courses.full')}</span>
                      : <span className={s.metaChip}><Users size={14} /> {t('courses.seatsLeft', { count: seatsLeft })}</span>
                  )}
                </div>

                {summary && <p className={s.summary}>{summary}</p>}

                {tutor.name && (
                  <div className={s.tutorCard}>
                    <span className={s.tutorAvatar} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
                      {tutor.avatarUrl ? <img src={tutor.avatarUrl} alt="" /> : initials(tutor.name)}
                    </span>
                    <span className={s.tutorText}>
                      <span className={s.tutorRole}>{t('courses.details.tutor')}</span>
                      <span className={s.tutorName}>{tutor.name}</span>
                      {tutor.title && <span className={s.tutorTitle}>{tutor.title}</span>}
                    </span>
                  </div>
                )}

                {/* The reason this popup exists. `pre-line` honours the line
                    breaks the salon typed in the backoffice editor. */}
                {description && (
                  <section className={s.about}>
                    <p className={s.sectionLabel}><BookOpen size={14} /> {t('courses.details.about')}</p>
                    <p className={s.description}>{description}</p>
                  </section>
                )}
              </div>

              {action && <div className={s.footer}>{action}</div>}
            </div>
          </div>
        )
      }}
    </ModalShell>
  )
}
