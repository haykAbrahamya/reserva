import {
  LayoutDashboard, Calendar, List, Users, Sparkles, User,
  Clock, MapPin, Settings, UserCog, Store, MessageSquare, GraduationCap,
} from 'lucide-react'

/**
 * Single source of truth for the partner-backoffice navigation. BOTH the desktop
 * Sidebar and the mobile MobileTabBar derive from this, so they can never drift
 * (this caused Storefront/Locations to go missing on mobile before).
 *
 * - `adminOnly`: hidden for managers (branch-scoped).
 * - `primary`: shown in the mobile bottom tab bar; everything else lives in the
 *   mobile "More" sheet, grouped by `section`.
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
  /** Shown ONLY when the platform has enabled Courses for this partner. */
  requiresCourses?: boolean
}

export interface NavSection {
  section: string
  items: NavItem[]
}

export const NAV: NavSection[] = [
  { section: 'operations', items: [
    { to: '/',            labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true, primary: true },
    { to: '/calendar',    labelKey: 'nav.calendar',  icon: Calendar, primary: true },
    { to: '/bookings',    labelKey: 'nav.bookings',  icon: List, primary: true },
    { to: '/clients',     labelKey: 'nav.clients',   icon: Users },
  ]},
  { section: 'catalog', items: [
    { to: '/services',    labelKey: 'nav.services',    icon: Sparkles, primary: true },
    { to: '/courses',     labelKey: 'nav.courses',     icon: GraduationCap, requiresCourses: true },
    { to: '/specialists', labelKey: 'nav.specialists', icon: User, singleHidden: true },
    { to: '/reviews',     labelKey: 'nav.reviews',     icon: MessageSquare, singleOnly: true },
    { to: '/hours',       labelKey: 'nav.hours',       icon: Clock },
    { to: '/locations',   labelKey: 'nav.locations',   icon: MapPin, adminOnly: true },
  ]},
  { section: 'account', items: [
    { to: '/storefront', labelKey: 'nav.storefront', icon: Store,    adminOnly: true },
    { to: '/users',      labelKey: 'nav.users',      icon: UserCog,  adminOnly: true, singleHidden: true },
    { to: '/settings',   labelKey: 'nav.settings',   icon: Settings },
  ]},
]

/**
 * Single source of truth for nav visibility, shared by the desktop Sidebar and
 * the mobile tab bar so the two can never disagree on what a given
 * role/partner-kind should see.
 */
export function isNavItemVisible(
  item: NavItem,
  ctx: { isAdmin: boolean; isSingle: boolean; coursesEnabled: boolean },
): boolean {
  if (item.adminOnly && !ctx.isAdmin) return false
  if (item.singleHidden && ctx.isSingle) return false
  if (item.singleOnly && !ctx.isSingle) return false
  if (item.requiresCourses && !ctx.coursesEnabled) return false
  return true
}

/** Flat list of the mobile bottom-bar items (in order). */
export const PRIMARY_TABS: NavItem[] = NAV.flatMap(g => g.items).filter(i => i.primary)

/** Sections for the mobile "More" sheet — everything NOT in the bottom bar. */
export const MORE_SECTIONS: NavSection[] = NAV
  .map(g => ({ section: g.section, items: g.items.filter(i => !i.primary) }))
  .filter(g => g.items.length > 0)
