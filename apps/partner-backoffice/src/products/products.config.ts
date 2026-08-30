import { CalendarDays, GraduationCap, Briefcase, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * The products a partner can hold. Mirrors PRODUCT_KEYS on the backend — a key
 * may exist in the catalog before it appears here (seeded ahead of the UI that
 * implements it), which is the intended order.
 */
export const PRODUCT_KEYS = ['bookings', 'courses', 'vacancies'] as const
export type ProductKey = (typeof PRODUCT_KEYS)[number]

export function isProductKey(value: string): value is ProductKey {
  return (PRODUCT_KEYS as readonly string[]).includes(value)
}

export interface ProductDef {
  key: ProductKey
  /** i18n key for the product's display name. */
  labelKey: string
  icon: LucideIcon
  /** Where switching to this product lands you. */
  home: string
}

/**
 * The registry the whole shell reads: the switcher, the redirect after
 * switching, and the fallback when a partner has no bookings product.
 *
 * Order is the order they appear in the switcher, and matches the catalog's
 * sortOrder so the console and the backoffice agree.
 */
export const PRODUCTS: readonly ProductDef[] = [
  {
    key: 'bookings',
    labelKey: 'products.bookings.name',
    icon: CalendarDays,
    home: '/',
  },
  {
    key: 'courses',
    labelKey: 'products.courses.name',
    icon: GraduationCap,
    home: '/courses',
  },
  {
    key: 'vacancies',
    labelKey: 'products.vacancies.name',
    icon: Briefcase,
    home: '/vacancies',
  },
]

/** A product seeded before its UI exists still renders — with a neutral icon. */
export const FALLBACK_PRODUCT_ICON = Package

export function productDef(key: ProductKey): ProductDef | undefined {
  return PRODUCTS.find((p) => p.key === key)
}
