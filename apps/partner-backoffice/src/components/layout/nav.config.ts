import {
  LayoutDashboard, Calendar, List, Users, Sparkles, User,
  Clock, MapPin, Settings, UserCog, Store, MessageSquare, GraduationCap, Briefcase,
} from 'lucide-react'
import type { ProductKey } from '@/products/products.config'

/**
 * Single source of truth for the partner-backoffice navigation. BOTH the desktop
 * Sidebar and the mobile MobileTabBar derive from this, so they can never drift
 * (this caused Storefront/Locations to go missing on mobile before).
 *
 * The shell is PRODUCT-SCOPED: a section either belongs to a product and shows
 * only while that product is active, or it is organization-level and shows
 * always. Switching product therefore swaps the working sections while the
 * things that describe the company — its branches, its people, its public page
 * — stay put.
 *
 * - `adminOnly`: hidden for managers (branch-scoped).
 * - `primary`: preferred for the mobile bottom tab bar; everything else lives in
 *   the mobile "More" sheet, grouped by `section`.
 */
export interface NavItem {
  to: string
  labelKey: string
  icon: typeof LayoutDashboard
  end?: boolean
  adminOnly?: boolean
  primary?: boolean
  /** Hidden for `single` (solo) partners — e.g. the Specialists/team section. */
  singleHidden?: boolean
  /** Shown ONLY for `single` (solo) partners — e.g. the solo Reviews page that
   * replaces the per-specialist reviews living in the Specialists dashboard. */
  singleOnly?: boolean
}

export interface NavSection {
  section: string
  /**
   * The product this section belongs to. Absent = organization-level: shown
   * whichever product is active, because it describes the company rather than
   * one product's work.
   */
  product?: ProductKey
  items: NavItem[]
}

export const NAV: NavSection[] = [
  { section: 'operations', product: 'bookings', items: [
    { to: '/',            labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true, primary: true },
    { to: '/calendar',    labelKey: 'nav.calendar',  icon: Calendar, primary: true },
    { to: '/bookings',    labelKey: 'nav.bookings',  icon: List, primary: true },
    { to: '/clients',     labelKey: 'nav.clients',   icon: Users },
  ]},
  { section: 'catalog', product: 'bookings', items: [
    { to: '/services',    labelKey: 'nav.services',    icon: Sparkles, primary: true },
    { to: '/specialists', labelKey: 'nav.specialists', icon: User, singleHidden: true },
    { to: '/reviews',     labelKey: 'nav.reviews',     icon: MessageSquare, singleOnly: true },
    { to: '/hours',       labelKey: 'nav.hours',       icon: Clock },
  ]},
  { section: 'academy', product: 'courses', items: [
    { to: '/courses',     labelKey: 'nav.courses',     icon: GraduationCap, primary: true },
  ]},
  { section: 'hiring', product: 'vacancies', items: [
    { to: '/vacancies',   labelKey: 'nav.vacancies',   icon: Briefcase, primary: true },
  ]},
  // Organization-level. Locations lives here rather than under the booking
  // catalog because a branch is the company's address — bookings, course runs
  // and vacancies all anchor to it, so no single product may own it.
  { section: 'organization', items: [
    { to: '/locations',  labelKey: 'nav.locations',  icon: MapPin,   adminOnly: true },
    { to: '/storefront', labelKey: 'nav.storefront', icon: Store,    adminOnly: true },
    { to: '/users',      labelKey: 'nav.users',      icon: UserCog,  adminOnly: true, singleHidden: true },
    { to: '/settings',   labelKey: 'nav.settings',   icon: Settings },
  ]},
]

export interface NavContext {
  isAdmin: boolean
  isSingle: boolean
  /** Null while the partner is still loading, or when nothing is granted. */
  activeProduct: ProductKey | null
}

/** Role/kind rules for a single item, independent of which product is active. */
export function isNavItemVisible(item: NavItem, ctx: Pick<NavContext, 'isAdmin' | 'isSingle'>): boolean {
  if (item.adminOnly && !ctx.isAdmin) return false
  if (item.singleHidden && ctx.isSingle) return false
  if (item.singleOnly && !ctx.isSingle) return false
  return true
}

/**
 * The sections to render: the active product's, plus the organization's.
 * Empty sections are dropped so a heading never appears with nothing under it.
 */
export function visibleSections(ctx: NavContext): NavSection[] {
  return NAV
    .filter((g) => !g.product || g.product === ctx.activeProduct)
    .map((g) => ({ ...g, items: g.items.filter((i) => isNavItemVisible(i, ctx)) }))
    .filter((g) => g.items.length > 0)
}

/** Every visible item, flattened in nav order. */
export function visibleItems(ctx: NavContext): NavItem[] {
  return visibleSections(ctx).flatMap((g) => g.items)
}

const MAX_PRIMARY_TABS = 4

/**
 * The mobile bottom bar.
 *
 * Items marked `primary` come first, then the bar is topped up from whatever
 * else is visible. Without the top-up a single-product partner (vacancies has
 * one page) would get a bar holding one tab and a lot of air.
 */
export function primaryTabs(ctx: NavContext): NavItem[] {
  const items = visibleItems(ctx)
  const preferred = items.filter((i) => i.primary)
  const rest = items.filter((i) => !i.primary)
  return [...preferred, ...rest].slice(0, MAX_PRIMARY_TABS)
}

/** Sections for the mobile "More" sheet — everything NOT in the bottom bar. */
export function moreSections(ctx: NavContext): NavSection[] {
  const inBar = new Set(primaryTabs(ctx).map((i) => i.to))
  return visibleSections(ctx)
    .map((g) => ({ ...g, items: g.items.filter((i) => !inBar.has(i.to)) }))
    .filter((g) => g.items.length > 0)
}

/**
 * Which product owns a route, so a deep link (a notification, a bookmark, a
 * link from a colleague) switches context by itself instead of landing in the
 * right page under the wrong shell.
 *
 * Routes are NOT prefixed by product on purpose: every existing bookmark and
 * every link already sent to a partner keeps working exactly as before.
 */
export function productForPath(pathname: string): ProductKey | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  let best: { product: ProductKey; length: number } | null = null

  for (const group of NAV) {
    if (!group.product) continue
    for (const item of group.items) {
      const matches = item.to === '/' ? path === '/' : path === item.to || path.startsWith(`${item.to}/`)
      // Longest match wins, so '/bookings/123' beats a hypothetical '/b'.
      if (matches && (!best || item.to.length > best.length)) {
        best = { product: group.product, length: item.to.length }
      }
    }
  }
  return best?.product ?? null
}
