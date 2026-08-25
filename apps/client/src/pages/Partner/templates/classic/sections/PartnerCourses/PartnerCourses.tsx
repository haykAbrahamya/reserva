import { useMemo } from 'react'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { CourseCard } from '../../../../components/CourseCard/CourseCard'
import { useCourseModals } from '../../../../lib/useCourseModals'
import { useI18n } from '@/i18n'
import s from './PartnerCourses.module.scss'

interface Props {
  partner: PublicPartner
  tone?: 'cream' | 'plain'
}

/** Public "Courses" section — the salon's academy. Renders published courses as
 *  cards; the details / registration / call popups come from the shared
 *  `useCourseModals`. Hidden when there are no courses. */
export function PartnerCourses({ partner, tone = 'cream' }: Props) {
  const { t } = useI18n()
  const courseModals = useCourseModals(partner)

  const courses = useMemo(() => partner.courses ?? [], [partner.courses])
  const tints = partner.presentation.heroTints

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
                onRegister={courseModals.openRegister}
                onDetails={courseModals.openDetails}
                onCall={courseModals.openCall}
              />
            </Reveal>
          ))}
        </div>
      </div>

      {courseModals.modals}
    </section>
  )
}
