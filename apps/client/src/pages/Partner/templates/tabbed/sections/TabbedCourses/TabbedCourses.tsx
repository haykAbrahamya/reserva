import { useState } from 'react'
import type { PublicPartner, PublicCourse } from '@/mock/partners'
import { CourseCard } from '../../../../components/CourseCard/CourseCard'
import { CourseRegisterModal } from '../../../../components/CourseRegisterModal/CourseRegisterModal'
import s from './TabbedCourses.module.scss'

interface Props {
  partner: PublicPartner
}

/** Courses tab (tabbed template): the same course cards + registration modal as
 *  the classic section, laid out for the tab panel. */
export function TabbedCourses({ partner }: Props) {
  const [registering, setRegistering] = useState<PublicCourse | null>(null)
  const courses = partner.courses ?? []
  const tints = partner.presentation.heroTints

  return (
    <section className={s.section}>
      <div className={s.grid}>
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} tints={tints} onRegister={setRegistering} />
        ))}
      </div>

      {registering && (
        <CourseRegisterModal partner={partner} course={registering} onClose={() => setRegistering(null)} />
      )}
    </section>
  )
}
