import { useRef, useState } from 'react'
import type { PublicPartner, PublicCourse } from '@/mock/partners'
import { bookableLocations } from '@/services/booking.service'
import { CourseDetailsModal } from '../components/CourseDetailsModal/CourseDetailsModal'
import { CourseRegisterModal } from '../components/CourseRegisterModal/CourseRegisterModal'
import { CallLocationModal } from '../components/CallLocationModal/CallLocationModal'

/** What the details popup asked for on its way out (see `handoff` below). */
type Handoff = { kind: 'register'; course: PublicCourse } | { kind: 'call' }

/**
 * Owns the three popups a course grid can open — details, registration and the
 * branch-call picker — plus the handoff between them. Both templates (classic
 * section + tabbed panel) render their own layout but share this, so the course
 * popup behaviour lives in exactly ONE place.
 *
 * Usage:
 *   const courses = useCourseModals(partner)
 *   <CourseCard onDetails={courses.openDetails} onRegister={courses.openRegister} onCall={courses.openCall} />
 *   {courses.modals}
 */
export function useCourseModals(partner: PublicPartner) {
  const [details, setDetails] = useState<PublicCourse | null>(null)
  const [registering, setRegistering] = useState<PublicCourse | null>(null)
  const [callOpen, setCallOpen] = useState(false)

  // Going details → register would briefly stack two modals (and two scrims, so
  // the page visibly darkens). Instead the details popup records where it's
  // headed, and we open the next popup only once it has finished animating out.
  const handoff = useRef<Handoff | null>(null)

  const closeDetails = () => {
    setDetails(null)
    const next = handoff.current
    handoff.current = null
    if (next?.kind === 'register') setRegistering(next.course)
    else if (next?.kind === 'call') setCallOpen(true)
  }

  // Branch picker targets. Prefer bookable branches; fall back to all locations
  // (a contact-only partner may have no active specialists at all).
  const callLocations = bookableLocations(partner).length > 0
    ? bookableLocations(partner)
    : partner.locations

  const modals = (
    <>
      {details && (
        <CourseDetailsModal
          partner={partner}
          course={details}
          onClose={closeDetails}
          onRegister={(course) => { handoff.current = { kind: 'register', course } }}
          onCall={() => { handoff.current = { kind: 'call' } }}
        />
      )}
      {registering && (
        <CourseRegisterModal
          partner={partner}
          course={registering}
          onClose={() => setRegistering(null)}
        />
      )}
      {callOpen && (
        <CallLocationModal
          partner={partner}
          locations={callLocations}
          onClose={() => setCallOpen(false)}
        />
      )}
    </>
  )

  return {
    openDetails: setDetails,
    openRegister: setRegistering,
    openCall: () => setCallOpen(true),
    modals,
  }
}
