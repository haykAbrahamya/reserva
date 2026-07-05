import type { TemplateProps } from '../types'
import { PartnerHero } from './sections/PartnerHero/PartnerHero'
import { PartnerAbout } from './sections/PartnerAbout/PartnerAbout'
import { PartnerGallery } from './sections/PartnerGallery/PartnerGallery'
import { PartnerServices } from './sections/PartnerServices/PartnerServices'
import { PartnerLocations } from './sections/PartnerLocations/PartnerLocations'
import { PartnerTeam } from './sections/PartnerTeam/PartnerTeam'
import { PartnerReviews } from './sections/PartnerReviews/PartnerReviews'
import { PartnerFooter } from './sections/PartnerFooter/PartnerFooter'

/**
 * Classic template — the original single-scroll partner page. This is the
 * default layout every partner gets. It is a verbatim extraction of the former
 * PartnerPage `<main>` block: same sections, same alternating-tone logic, same
 * visibility rules — so nothing about the existing page changes. It renders only
 * layout; booking + specialist modals live in the orchestrating PartnerPage.
 */
export function ClassicTemplate({ partner, onBook, onOpenSpecialist }: TemplateProps) {
  return (
    <main>
      {/* Flow: hook → what they came for (services) → trust (about) →
          where + who → vibe (gallery) → final CTA.
          Backgrounds alternate over the VISIBLE sections (computed below), so a
          hidden section (e.g. no team for a single, empty works) never leaves
          two same-tone bands adjacent. */}
      <PartnerHero partner={partner} onBook={() => onBook()} />
      {(() => {
        const isSingle = partner.kind === 'single'
        const showTeam = !isSingle && partner.specialists.some((sp) => sp.active)
        const showGallery = (partner.presentation.gallery?.length ?? 0) > 0
        const showWorks = (partner.presentation.works?.length ?? 0) > 0
        // Single mode hides the Team grid (and with it the per-specialist review
        // entry point in SpecialistModal), so a solo pro gets a dedicated
        // business-framed Reviews section instead. Salons keep reviews in the modal.
        const showReviews = isSingle && partner.specialists.length > 0
        // Ordered list of visible content sections; assign alternating tones.
        let i = 0
        const tone = () => (i++ % 2 === 0 ? 'cream' : 'plain') as 'cream' | 'plain'
        return (
          <>
            <PartnerServices partner={partner} onBook={onBook} tone={tone()} />
            <PartnerAbout partner={partner} tone={tone()} />
            <PartnerLocations partner={partner} onBook={() => onBook()} tone={tone()} />
            {showTeam && <PartnerTeam partner={partner} onSelect={onOpenSpecialist} tone={tone()} />}
            {showGallery && <PartnerGallery partner={partner} variant="gallery" tone={tone()} />}
            {showWorks && <PartnerGallery partner={partner} variant="works" tone={tone()} />}
            {showReviews && <PartnerReviews partner={partner} tone={tone()} />}
          </>
        )
      })()}
      <PartnerFooter partner={partner} onBook={() => onBook()} />
    </main>
  )
}
