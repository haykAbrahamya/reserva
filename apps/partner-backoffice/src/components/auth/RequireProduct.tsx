import { Navigate } from 'react-router-dom'
import { usePartner } from '@/store/app.store'
import { useGrantedProducts, useHasProduct } from '@/products/useProducts'
import type { ProductKey } from '@/products/products.config'

/**
 * Gates a route on the organization holding the product.
 *
 * The nav already hides what a partner cannot use; this stops direct-URL access
 * and stale bookmarks after a product is withdrawn. It is a courtesy redirect,
 * not the security boundary — that is `@RequiresProduct` on the API, which
 * refuses the data regardless of what the browser does.
 *
 * Waits for the profile to load before deciding, so nobody is bounced during
 * the initial fetch.
 */
export function RequireProduct({
  product,
  children,
}: {
  product: ProductKey
  children: React.ReactNode
}) {
  const partner = usePartner()
  const hasProduct = useHasProduct()
  const granted = useGrantedProducts()

  if (!partner) return null // still loading — don't redirect yet
  if (hasProduct(product)) return <>{children}</>

  // Land on a product they DO have. Redirecting to '/' would be wrong for a
  // partner without bookings — '/' is the booking dashboard, so they would
  // bounce straight back here. Settings is the last resort: organization-level,
  // so it exists for a partner holding no products at all.
  return <Navigate to={granted[0]?.home ?? '/settings'} replace />
}
