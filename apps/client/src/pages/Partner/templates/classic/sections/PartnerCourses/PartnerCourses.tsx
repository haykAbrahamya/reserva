import { useMemo, useState } from 'react'
import type { PublicPartner, PublicCourse } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { bookableLocations } from '@/services/booking.service'
import { CourseCard } from '../../../../components/CourseCard/CourseCard'
import { CourseRegisterModal } from '../../../../components/CourseRegisterModal/CourseRegisterModal'
import { CallLocationModal } from '../../../../components/CallLocationModal/CallLocationModal'
import { useI18n } from '@/i18n'
import s from './PartnerCourses.module.scss'

interface Props {
  partner: PublicPartner
  tone?: 'cream' | 'plain'
}

/** Public "Courses" section — the salon's academy. Renders published courses as
 *  cards and owns the registration modal. Hidden when there are no courses. */
export function PartnerCourses({ partner, tone = 'cream' }: Props) {
  const { t } = useI18n()
  const [registering, setRegistering] = useState<PublicCourse | null>(null)
  const [callOpen, setCallOpen] = useState(false)

  const courses = useMemo(() => partner.courses ?? [], [partner.courses])
  const tints = partner.presentation.heroTints
  // Branch picker for the call action. Prefer bookable branches; fall back to
  // all locations (a contact-only partner may have no active specialists).
  const callLocations = bookableLocations(partner).length > 0
    ? bookableLocations(partner)
    : partner.locations

  if (courses.length === 0) return null

  return (
    <section className={[s.section, tone === 'plain' ? s.plain : ''].filter(Boolean).join(' ')} id="courses">
      <div className={s.inner}>
        <div className={s.head}>
          <div className={s.eyebrow}>{t('courses.eyebrow')}</div>
          <h2 className={s.title}>{t('courses.title')}</h2>
        </div>

        <div className={s.grid}>
          {courses.map((course, i) => (
            <Reveal key={course.id} delay={(i % 3) * 60} className={s.cell}>
              <CourseCard
                partner={partner}
                course={course}
                tints={tints}
                onRegister={setRegistering}
                onCall={() => setCallOpen(true)}
              />
            </Reveal>
          ))}
        </div>
      </div>

      {registering && (
        <CourseRegisterModal partner={partner} course={registering} onClose={() => setRegistering(null)} />
      )}
      {callOpen && (
        <CallLocationModal partner={partner} locations={callLocations} onClose={() => setCallOpen(false)} />
      )}
    </section>
  )
}
