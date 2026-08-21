import { useState } from 'react'
import type { PublicPartner, PublicCourse } from '@/mock/partners'
import { bookableLocations } from '@/services/booking.service'
import { CourseCard } from '../../../../components/CourseCard/CourseCard'
import { CourseRegisterModal } from '../../../../components/CourseRegisterModal/CourseRegisterModal'
import { CallLocationModal } from '../../../../components/CallLocationModal/CallLocationModal'
import s from './TabbedCourses.module.scss'

interface Props {
  partner: PublicPartner
}

/** Courses tab (tabbed template): the same course cards + registration modal as
 *  the classic section, laid out for the tab panel. */
export function TabbedCourses({ partner }: Props) {
  const [registering, setRegistering] = useState<PublicCourse | null>(null)
  const [callOpen, setCallOpen] = useState(false)
  const courses = partner.courses ?? []
  const tints = partner.presentation.heroTints
  const callLocations = bookableLocations(partner).length > 0
    ? bookableLocations(partner)
    : partner.locations

  return (
    <section className={s.section}>
      <div className={s.grid}>
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            partner={partner}
            course={course}
            tints={tints}
            onRegister={setRegistering}
            onCall={() => setCallOpen(true)}
          />
        ))}
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
