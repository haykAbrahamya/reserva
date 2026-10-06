import { usePartner } from '@/store/app.store'

/**
 * Whether this partner can use branch & specialist pricing: one specialist at
 * several branches, and prices/durations per branch and per specialist.
 *
 * Switched on per partner by Reserva staff (internal console → Booking →
 * "Branch & specialist pricing"). Never for solo partners: they have one branch
 * and one specialist, so there is nothing to vary — their backoffice stays
 * exactly as it was.
 *
 * This only decides what the backoffice SHOWS. Prices already set keep
 * applying either way; the server is what enforces who may change them.
 */
export function useBranchPricing(): boolean {
  const partner = usePartner()
  if (!partner || partner.kind === 'single') return false
  const bookings = partner.products?.find((p) => p.key === 'bookings')
  return bookings?.settings?.branchPricing === true
}
