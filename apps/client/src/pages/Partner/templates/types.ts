import type { ReactElement } from 'react'
import type { PublicPartner } from '@/mock/partners'
import type { Specialist } from '@reserva/shared'

/**
 * The contract every partner-page template receives. Templates are PURE LAYOUT:
 * they arrange section components and wire the two shared, cross-template
 * interactions (open the booking flow, open a specialist's detail). They never
 * own booking state or render the BookingFlow/SpecialistModal themselves — the
 * orchestrating `PartnerPage` does, so the booking flow is never templatized or
 * duplicated. See PartnerPage.tsx.
 */
export interface TemplateProps {
  partner: PublicPartner
  /** Open the booking flow, optionally seeded with a service. */
  onBook: (serviceId?: string) => void
  /** Open a specialist's detail modal (salons; singles have no team grid). */
  onOpenSpecialist: (specialist: Specialist) => void
}

/** A template is just a component that takes {@link TemplateProps}. */
export type PartnerTemplateComponent = (props: TemplateProps) => ReactElement
