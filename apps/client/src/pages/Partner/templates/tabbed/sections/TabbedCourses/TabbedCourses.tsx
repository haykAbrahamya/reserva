import type { PublicPartner } from '@/mock/partners'
import { CourseCard } from '../../../../components/CourseCard/CourseCard'
import { useCourseModals } from '../../../../lib/useCourseModals'
import s from './TabbedCourses.module.scss'

interface Props {
  partner: PublicPartner
}

/** Courses tab (tabbed template): the same course cards + popups as the classic
 *  section, laid out for the tab panel. */
export function TabbedCourses({ partner }: Props) {
  const courseModals = useCourseModals(partner)
  const courses = partner.courses ?? []
  const tints = partner.presentation.heroTints

  return (
    <section className={s.section}>
      <div className={s.grid}>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            partner={partner}
            course={course}
            tints={tints}
            onRegister={courseModals.openRegister}
            onDetails={courseModals.openDetails}
            onCall={courseModals.openCall}
          />
        ))}
      </div>

      {courseModals.modals}
    </section>
  )
}
