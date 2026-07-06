import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { usePartner } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { partnersService } from '@/services/partners.service'
import type { WeekSchedule } from '@/types'

/**
 * Onboarding "Complete your profile" model.
 *
 * The items mirror the REAL backend gates for being publicly viewable and
 * bookable (see partner readiness analysis):
 *  - Viewable at /p/:slug  → slug set + active.
 *  - Bookable              → + a service, + a specialist linked to that service,
 *                            + the specialist has a location, + a non-empty
 *                            working schedule (specialist schedule OR its
 *                            location hours) so slots are actually produced.
 *
 * Kind/role awareness:
 *  - `single` partners auto-provision a location + specialist (+ default
 *    Mon–Sat schedule) on signup, so we hide the "add branch/specialist" items.
 *    New services are also auto-linked to their sole specialist server-side, so
 *    the "assign a service to a specialist" step is hidden for them too.
 *  - Managers can't reach admin-only sections (Locations), so items are tagged
 *    with the role needed and the card only shows items the user can action.
 */

/**
 * Fire after any mutation that can affect onboarding completion (adding a
 * service/specialist/location, editing the address, setting hours, saving the
 * slug, etc.). Every mounted useProfileCompletion() re-checks — this keeps the
 * always-mounted sidebar nudge live even when the change happens in a modal on
 * the same page (no route change to key off).
 */
export const PROFILE_UPDATED_EVENT = 'profile-updated'
export function notifyProfileUpdated() {
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT))
}

export type ChecklistGroup = 'required' | 'recommended'

export interface ChecklistItem {
  /** Stable id → drives the i18n key `onboarding.items.<id>.{title,hint}`. */
  id: string
  group: ChecklistGroup
  done: boolean
  /** Route to deep-link to for this step. */
  to: string
  /** True when actioning this step needs admin (hidden for managers). */
  adminOnly?: boolean
  /** Shown ONLY for single (solo) partners — e.g. filling their one address. */
  singleOnly?: boolean
}

export interface ProfileCompletion {
  loading: boolean
  items: ChecklistItem[]
  /** Required items only (what the card gates completion on). */
  requiredItems: ChecklistItem[]
  recommendedItems: ChecklistItem[]
  requiredDone: number
  requiredTotal: number
  /** All required items satisfied → the partner is booking-ready. */
  allRequiredDone: boolean
  /** Public page reachable (slug set). Drives the "view your page" CTA. */
  hasSlug: boolean
  slug: string | null
  reload: () => void
}

/** A WeekSchedule counts as "set up" when at least one weekday is enabled. */
function hasEnabledDay(schedule?: WeekSchedule | null): boolean {
  if (!schedule) return false
  return Object.values(schedule).some((d) => d?.enabled)
}

export function useProfileCompletion(): ProfileCompletion {
  const partner = usePartner()
  const isAdmin = useIsAdmin()
  const isSingle = partner?.kind === 'single'
  // Re-fetch on every route change so the always-mounted sidebar nudge (and the
  // dashboard card) reflect steps completed on other pages — completing a step
  // always involves navigating, so this keeps the count live without a shared
  // store or manual invalidation.
  const { pathname } = useLocation()

  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState({
    hasLocation: false,
    hasSpecialist: false,
    hasService: false,
    hasLinkedService: false,
    hasAvailability: false,
    hasAddress: false,
  })
  const [nonce, setNonce] = useState(0)
  const reload = useCallback(() => setNonce((n) => n + 1), [])

  // Re-check when any page signals a profile-affecting mutation (e.g. saving an
  // address in a modal without navigating away).
  useEffect(() => {
    const fn = () => reload()
    window.addEventListener(PROFILE_UPDATED_EVENT, fn)
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, fn)
  }, [reload])

  useEffect(() => {
    if (!partner) return
    let alive = true
    // `loading` starts true and is cleared after the first fetch; we never set
    // it back to true, so route-change refetches update counts in place and the
    // sidebar nudge never flickers.
    Promise.all([
      partnersService.listLocations().catch(() => []),
      partnersService.listSpecialists().catch(() => []),
      partnersService.listServices().catch(() => []),
    ])
      .then(([locations, specialists, services]) => {
        if (!alive) return
        // Location hours by id → lets us treat "specialist follows location
        // hours" as valid availability (the backend intersects the two, and a
        // null personal schedule falls back to location hours).
        const locHours = new Map(locations.map((l) => [l.id, l.hours]))
        const hasLinkedService = specialists.some((sp) => sp.services.length > 0)
        const hasAvailability = specialists.some(
          (sp) => hasEnabledDay(sp.schedule) || hasEnabledDay(locHours.get(sp.locationId)),
        )
        setCounts({
          hasLocation: locations.length > 0,
          hasSpecialist: specialists.length > 0,
          hasService: services.length > 0,
          hasLinkedService,
          hasAvailability,
          // Single partners get an auto-provisioned location with a BLANK address
          // — prompt them to fill it (it's their public "find me here").
          hasAddress: locations.some((l) => l.address?.trim()),
        })
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [partner, nonce, pathname])

  const hasSlug = !!partner?.slug

  // Build the full item set, then filter by kind/role. Order = the natural
  // path a new partner walks: name your page → add the pieces → link → hours.
  // `to` carries a `?highlight=<key>` so the destination page spotlights the
  // exact block to act on (see useSpotlight + data-spotlight attributes).
  const all: ChecklistItem[] = [
    { id: 'slug', group: 'required', done: hasSlug, to: '/settings?highlight=slug' },
    // Salon-only structural items (single auto-provisions these).
    { id: 'location', group: 'required', done: counts.hasLocation, to: '/locations?highlight=addLocation', adminOnly: true },
    { id: 'specialist', group: 'required', done: counts.hasSpecialist, to: '/specialists?highlight=addSpecialist' },
    // Single-only: their auto-provisioned location starts with a blank address.
    { id: 'address', group: 'required', done: counts.hasAddress, to: '/locations?highlight=addLocation', singleOnly: true },
    { id: 'service', group: 'required', done: counts.hasService, to: '/services?highlight=addService' },
    { id: 'linkedService', group: 'required', done: counts.hasLinkedService, to: '/specialists?highlight=addSpecialist' },
    { id: 'availability', group: 'required', done: counts.hasAvailability, to: '/hours?highlight=setHours' },
    // Recommended — polish, never blocks booking. (Logo lives in Settings; the
    // about text in Storefront.)
    { id: 'logo', group: 'recommended', done: !!partner?.presentation?.logoUrl, to: '/settings?highlight=logo', adminOnly: true },
    { id: 'about', group: 'recommended', done: !!partner?.presentation?.about?.trim(), to: '/storefront?highlight=about', adminOnly: true },
  ]

  const items = all.filter((item) => {
    // Single-only items (e.g. "add your address") never show for salons.
    if (item.singleOnly && !isSingle) return false
    // Single partners: hide the auto-provisioned structural items AND the
    // service↔specialist link — a new service is auto-attached to the sole
    // specialist server-side, so that step is always satisfied for them.
    if (isSingle && (item.id === 'location' || item.id === 'specialist' || item.id === 'linkedService')) return false
    // Managers: hide items that require admin (they can't open those sections).
    if (item.adminOnly && !isAdmin) return false
    return true
  })

  const requiredItems = items.filter((i) => i.group === 'required')
  const recommendedItems = items.filter((i) => i.group === 'recommended')
  const requiredDone = requiredItems.filter((i) => i.done).length
  const requiredTotal = requiredItems.length
  const allRequiredDone = requiredTotal > 0 && requiredDone === requiredTotal

  return {
    loading,
    items,
    requiredItems,
    recommendedItems,
    requiredDone,
    requiredTotal,
    allRequiredDone,
    hasSlug,
    slug: partner?.slug ?? null,
    reload,
  }
}
