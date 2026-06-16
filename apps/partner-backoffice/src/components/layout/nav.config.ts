import {
  LayoutDashboard, Calendar, List, Users, Sparkles, User,
  Clock, MapPin, Settings, UserCog, Store,
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
    { to: '/specialists', labelKey: 'nav.specialists', icon: User },
    { to: '/hours',       labelKey: 'nav.hours',       icon: Clock },
    { to: '/locations',   labelKey: 'nav.locations',   icon: MapPin, adminOnly: true },
  ]},
  { section: 'account', items: [
    { to: '/storefront', labelKey: 'nav.storefront', icon: Store,    adminOnly: true },
    { to: '/users',      labelKey: 'nav.users',      icon: UserCog,  adminOnly: true },
    { to: '/settings',   labelKey: 'nav.settings',   icon: Settings },
  ]},
]

/** Flat list of the mobile bottom-bar items (in order). */
export const PRIMARY_TABS: NavItem[] = NAV.flatMap(g => g.items).filter(i => i.primary)

/** Sections for the mobile "More" sheet — everything NOT in the bottom bar. */
export const MORE_SECTIONS: NavSection[] = NAV
  .map(g => ({ section: g.section, items: g.items.filter(i => !i.primary) }))
  .filter(g => g.items.length > 0)
