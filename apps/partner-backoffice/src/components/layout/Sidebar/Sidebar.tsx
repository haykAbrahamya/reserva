import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, List, Users, Sparkles, User,
  Clock, MapPin, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import s from './Sidebar.module.scss'

const NAV = [
  { section: 'Operations', items: [
    { to: '/',            label: 'Dashboard',    icon: LayoutDashboard, end: true },
    { to: '/calendar',    label: 'Calendar',     icon: Calendar },
    { to: '/bookings',    label: 'Bookings',     icon: List },
    { to: '/clients',     label: 'Clients',      icon: Users },
  ]},
  { section: 'Catalog', items: [
    { to: '/services',    label: 'Services',      icon: Sparkles },
    { to: '/specialists', label: 'Specialists',   icon: User },
    { to: '/hours',       label: 'Working hours', icon: Clock },
    { to: '/locations',   label: 'Locations',     icon: MapPin },
  ]},
  { section: 'Account', items: [
    { to: '/settings', label: 'Settings', icon: Settings },
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
              <div className={s.tag}>Backoffice</div>
            </div>
          )}
        </div>

        {/* Partner live status strip */}
        {!collapsed && partner && (
          <div className={s.partnerStrip}>
            <span className={s.partnerDot} />
            <span className={s.partnerName}>{partner.type} · {partner.locations.length} location{partner.locations.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Nav */}
        <nav className={s.nav}>
          {NAV.map(group => (
            <div key={group.section}>
              {!collapsed && <div className={s.section}>{group.section}</div>}
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    [s.navItem, isActive ? s.active : ''].filter(Boolean).join(' ')
                  }
                  style={collapsed ? { justifyContent: 'center', width: 40, height: 40, padding: 0, margin: '1px auto' } : undefined}
                >
                  <item.icon size={16} className={s.icon} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse toggle — icon-only button aligned to the right */}
        <div className={s.bottom}>
          <button
            className={s.collapseBtn}
            onClick={() => setSidebarCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>
    </>
  )
}
