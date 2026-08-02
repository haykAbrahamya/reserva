import { useMemo, useState } from 'react'
import type { PublicPartner, PublicCourse } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { CourseCard } from '../../../../components/CourseCard/CourseCard'
import { CourseRegisterModal } from '../../../../components/CourseRegisterModal/CourseRegisterModal'
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
              <CourseCard course={course} tints={tints} onRegister={setRegistering} />
            </Reveal>
          ))}
        </div>
      </div>

      {registering && (
        <CourseRegisterModal partner={partner} course={registering} onClose={() => setRegistering(null)} />
      )}
    </section>
  )
}
