import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore, usePartner } from '@/store/app.store'
import { productForPath } from '@/components/layout/nav.config'
import { PRODUCTS, isProductKey, productDef, type ProductDef, type ProductKey } from './products.config'

/**
 * The products this organization holds, as definitions, in registry order.
 *
 * A granted key the UI does not know about yet (seeded ahead of its screens) is
 * dropped rather than rendered as a broken entry — the catalog is allowed to run
 * ahead of the frontend.
 */
export function useGrantedProducts(): ProductDef[] {
  const partner = usePartner()
  return useMemo(() => {
    const granted = new Set((partner?.products ?? []).map((p) => p.key))
    return PRODUCTS.filter((p) => granted.has(p.key))
  }, [partner])
}

/** Does the partner hold this product? The nav's cosmetic check; the API guard
 *  is the real boundary. */
export function useHasProduct(): (key: ProductKey) => boolean {
  const granted = useGrantedProducts()
  return useCallback((key: ProductKey) => granted.some((p) => p.key === key), [granted])
}

/**
 * Which product the shell is currently in.
 *
 * Resolution order, and the reason for it:
 *  1. The route — a deep link must bring its own context, so opening /courses
 *     from an email shows the academy shell even if the last visit was bookings.
 *  2. The persisted choice — only if still granted, so a revoked product cannot
 *     strand someone in sections they can no longer use.
 *  3. The first granted product — a sane landing for a first-ever login.
 *
 * Null only while the profile is still loading, or if nothing is granted at all.
 */
export function useActiveProduct(): ProductKey | null {
  const { pathname } = useLocation()
  const stored = useAppStore((s) => s.activeProduct)
  const granted = useGrantedProducts()

  return useMemo(() => {
    if (granted.length === 0) return null
    const has = (k: ProductKey | null) => !!k && granted.some((p) => p.key === k)

    const fromRoute = productForPath(pathname)
    if (has(fromRoute)) return fromRoute
    if (stored && isProductKey(stored) && has(stored)) return stored
    return granted[0].key
  }, [pathname, stored, granted])
}

/** Switch products: remember the choice and land on that product's home. */
export function useSwitchProduct(): (key: ProductKey) => void {
  const setActiveProduct = useAppStore((s) => s.setActiveProduct)
  const navigate = useNavigate()

  return useCallback(
    (key: ProductKey) => {
      setActiveProduct(key)
      const home = productDef(key)?.home
      if (home) navigate(home)
    },
    [setActiveProduct, navigate],
  )
}
