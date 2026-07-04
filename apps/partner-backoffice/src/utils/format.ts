// Formatters live in @reserva/shared. Re-exported here so existing
// `@/utils/format` imports keep working unchanged.
export * from '@reserva/shared'

import { fmtAMD } from '@reserva/shared'

/**
 * Display a service's price: a single AMD amount for fixed pricing, or an
 * en-dashed "from – to" range when the service uses range pricing and has an
 * upper bound set. Falls back to the fixed amount otherwise.
 */
export function fmtServicePrice(svc: {
  price: number
  priceType?: 'fixed' | 'range'
  priceMax?: number | null
}): string {
  if (svc.priceType === 'range' && svc.priceMax != null) {
    return `${fmtAMD(svc.price)} – ${fmtAMD(svc.priceMax)}`
  }
  return fmtAMD(svc.price)
}
