import { useMemo, useState } from 'react'
import { X, GraduationCap, CheckCircle2, User, CalendarClock } from 'lucide-react'
import { isValidPhone } from '@reserva/shared'
import type { PublicPartner, PublicCourse } from '@/mock/partners'
import { partnerBrandVars } from '../../partnerBrand'
import { useAppSelector } from '@/store/hooks'
import { ModalShell } from '@/components/ModalShell/ModalShell'
import { PhoneField } from '../../booking/PhoneField/PhoneField'
import { registerForCourse } from '@/services/booking.service'
import { friendlyError } from '@/services/errors'
import { fmtCoursePrice, courseSeatsLeft, courseDateLabel } from '../../lib/courseDisplay'
import { useI18n, useLocalized } from '@/i18n'
import s from './CourseRegisterModal.module.scss'

interface Props {
  partner: PublicPartner
  course: PublicCourse
  onClose: () => void
}

/**
 * Public course registration: a warm, compact flow — name + phone (Armenian
 * +374 default) + optional email → a pending enrollment the salon confirms.
 * Branded header, seats/date context, and a friendly success state. Reuses the
 * shared ModalShell + PhoneField so it matches the booking flow.
 */
export function CourseRegisterModal({ partner, course, onClose }: Props) {
  const [t1, t2] = partner.presentation.heroTints
  const { t, locale } = useI18n()
  const loc = useLocalized()
  const theme = useAppSelector((st) => st.theme.theme)
  const brandVars = useMemo(() => partnerBrandVars(partner, theme === 'dark'), [partner, theme])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+374')
  const [phoneIntl, setPhoneIntl] = useState(false)
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const title = loc(course.title, course.titleI18n)
  const seatsLeft = courseSeatsLeft(course)
  const isFull = seatsLeft === 0

  const nameError = !name.trim()
  const phoneError = !isValidPhone(phone)
  const emailError = email.trim() !== '' && !/^\S+@\S+\.\S+$/.test(email.trim())
  const valid = !nameError && !phoneError && !emailError

  const submit = async (requestClose: () => void) => {
    setTouched(true)
    setError(null)
    if (!valid || submitting) return
    setSubmitting(true)
    try {
      await registerForCourse({
        slug: partner.slug,
        courseId: course.id,
        memberName: name.trim(),
        memberPhone: phone,
        memberEmail: email.trim() || undefined,
        locale: locale as 'en' | 'hy' | 'ru',
      })
      setDone(true)
    } catch (err) {
      setError(friendlyError(err, t))
    } finally {
      setSubmitting(false)
    }
    void requestClose
  }

  return (
    <ModalShell open onClose={onClose} closeDuration={280}>
      {({ closing, requestClose }) => (
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
          >
            <button className={s.closeBtn} onClick={requestClose} aria-label={t('courses.register.close')}>
              <X size={16} />
            </button>

            {/* Branded header */}
            <div className={s.header} style={{ background: `linear-gradient(140deg, ${t1}, ${t2})` }}>
              <div className={s.headerGrid} />
              <span className={s.headerIcon}><GraduationCap size={22} /></span>
              <div className={s.headerText}>
                <div className={s.eyebrow}>{t('courses.register.eyebrow')}</div>
                <div className={s.title}>{title}</div>
              </div>
            </div>

            {done ? (
              <div className={s.success}>
                <span className={s.successIcon}><CheckCircle2 size={44} /></span>
                <h3 className={s.successTitle}>{t('courses.register.successTitle')}</h3>
                <p className={s.successText}>{t('courses.register.successText', { name: name.trim() })}</p>
                <button className={s.primary} onClick={requestClose}>{t('courses.register.done')}</button>
              </div>
            ) : (
              <div className={s.body}>
                {/* Context chips: price, date, seats */}
                <div className={s.meta}>
                  <span className={s.price}>{fmtCoursePrice(course.price, t('courses.free'))}</span>
                  {courseDateLabel(course, locale) && (
                    <span className={s.metaChip}><CalendarClock size={14} /> {courseDateLabel(course, locale)}</span>
                  )}
                  {seatsLeft != null && seatsLeft > 0 && (
                    <span className={s.metaChip}><User size={14} /> {t('courses.seatsLeft', { count: seatsLeft })}</span>
                  )}
                </div>

                {isFull ? (
                  <div className={s.full}>{t('courses.full')}</div>
                ) : (
                  <>
                    <div className={s.field}>
                      <label className={s.label}>{t('courses.register.nameLabel')}</label>
                      <input
                        className={[s.input, touched && nameError ? s.inputError : ''].filter(Boolean).join(' ')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t('courses.register.namePlaceholder')}
                        autoFocus
                      />
                    </div>

                    <div className={s.field}>
                      <label className={s.label}>{t('courses.register.phoneLabel')}</label>
                      <PhoneField
                        value={phone}
                        onChange={setPhone}
                        invalid={touched && phoneError}
                        intl={phoneIntl}
                        onIntlChange={setPhoneIntl}
                      />
                    </div>

                    <div className={s.field}>
                      <label className={s.label}>
                        {t('courses.register.emailLabel')} <span className={s.optional}>· {t('courses.register.optional')}</span>
                      </label>
                      <input
                        className={[s.input, touched && emailError ? s.inputError : ''].filter(Boolean).join(' ')}
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('courses.register.emailPlaceholder')}
                      />
                    </div>

                    {error && <div className={s.error}>{error}</div>}

                    <button
                      className={[s.primary, submitting ? s.loading : ''].filter(Boolean).join(' ')}
                      onClick={() => submit(requestClose)}
                      disabled={submitting}
                    >
                      {submitting ? t('courses.register.submitting') : t('courses.register.submit')}
                    </button>
                    <p className={s.note}>{t('courses.register.note')}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  )
}
