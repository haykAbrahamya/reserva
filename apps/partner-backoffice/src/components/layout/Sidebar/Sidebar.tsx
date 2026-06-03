import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, List, Users, Sparkles, User,
  Clock, MapPin, Settings, ChevronLeft, ChevronRight, ShieldCheck, UserCog,
} from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { useIsAdmin, useScopedLocationId } from '@/store/auth.hooks'
import { useI18n } from '@/i18n'
import s from './Sidebar.module.scss'

interface NavItem {
  to: string
  labelKey: string
  icon: typeof LayoutDashboard
  end?: boolean
  /** Only visible to admins (managers are scoped to a single branch). */
  adminOnly?: boolean
}

const NAV: { section: string; items: NavItem[] }[] = [
  { section: 'operations', items: [
    { to: '/',            labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
    { to: '/calendar',    labelKey: 'nav.calendar',  icon: Calendar },
    { to: '/bookings',    labelKey: 'nav.bookings',  icon: List },
    { to: '/clients',     labelKey: 'nav.clients',   icon: Users },
  ]},
  { section: 'catalog', items: [
    { to: '/services',    labelKey: 'nav.services',    icon: Sparkles },
    { to: '/specialists', labelKey: 'nav.specialists', icon: User },
    { to: '/hours',       labelKey: 'nav.hours',       icon: Clock },
    { to: '/locations',   labelKey: 'nav.locations',   icon: MapPin, adminOnly: true },
  ]},
  { section: 'account', items: [
    { to: '/users',    labelKey: 'nav.users',    icon: UserCog,  adminOnly: true },
    { to: '/settings', labelKey: 'nav.settings', icon: Settings },
  ]},
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const collapsed = useAppStore(st => st.sidebarCollapsed)
  const setSidebarCollapsed = useAppStore(st => st.setSidebarCollapsed)
  const partner = usePartner()
  const isAdmin = useIsAdmin()
  const scopedLocationId = useScopedLocationId()
  const { t, tp } = useI18n()

  const branchName = scopedLocationId
    ? partner?.locations.find(l => l.id === scopedLocationId)?.name ?? null
    : null

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && <div className={s.overlay} onClick={onMobileClose} />}

      <aside className={[s.sidebar, collapsed ? s.collapsed : '', mobileOpen ? s.mobileOpen : ''].filter(Boolean).join(' ')}>
        {/* Logo — Antheris branded */}
        <div className={s.logo}>
          <div className={s.logoIcon}>A</div>
          {!collapsed && (
            <div className={s.logoText}>
              <div className={s.name}>{partner?.name ?? 'Antheris'}</div>
              <div className={s.tag}>{t('common.backoffice')}</div>
            </div>
          )}
        </div>

        {/* Status strip — manager: locked branch chip · admin: location count */}
        {!collapsed && partner && (
          branchName ? (
            <div className={[s.partnerStrip, s.branchStrip].join(' ')} title={branchName}>
              <span className={s.branchIcon}><MapPin size={13} /></span>
              <span className={s.branchMeta}>
                <span className={s.branchName}>{branchName}</span>
                <span className={s.branchRole}><ShieldCheck size={10} /> {t('roles.manager')}</span>
              </span>
            </div>
          ) : (
            <div className={s.partnerStrip}>
              <span className={s.partnerDot} />
              <span className={s.partnerName}>{tp('sidebar.locationCount', partner.locations.length, { type: partner.type })}</span>
            </div>
          )
        )}

        {/* Nav */}
        <nav className={s.nav}>
          {NAV.map(group => {
            const items = group.items.filter(item => isAdmin || !item.adminOnly)
            if (items.length === 0) return null
            return (
            <div key={group.section}>
              {!collapsed && <div className={s.section}>{t(`nav.sections.${group.section}`)}</div>}
              {items.map(item => {
                const label = t(item.labelKey)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? label : undefined}
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                      [s.navItem, isActive ? s.active : ''].filter(Boolean).join(' ')
                    }
                    style={collapsed ? { justifyContent: 'center', width: 40, height: 40, padding: 0, margin: '1px auto' } : undefined}
                  >
                    <item.icon size={16} className={s.icon} />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                )
              })}
            </div>
            )
          })}
        </nav>

        {/* Collapse toggle — icon-only button aligned to the right */}
        <div className={s.bottom}>
          <button
            className={s.collapseBtn}
            onClick={() => setSidebarCollapsed(!collapsed)}
            title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>
    </>
  )
}
