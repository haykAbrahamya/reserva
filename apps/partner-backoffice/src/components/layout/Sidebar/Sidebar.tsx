import { NavLink } from 'react-router-dom'
import { MapPin, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react'
import { useAppStore, usePartner } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import { partnersService, galleryImageUrl } from '@/services/partners.service'
import { useIsAdmin, useScopedLocationId } from '@/store/auth.hooks'
import { useI18n } from '@/i18n'
import { NAV } from '../nav.config'
import s from './Sidebar.module.scss'

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

  // Only managers (scoped to a branch) need the branch name → only they fetch
  // locations. Admins read the lightweight locationCount from the partner
  // profile, so the always-mounted sidebar makes no catalog call for them.
  const { data: locations } = useResource(
    () => (scopedLocationId ? partnersService.listLocations() : Promise.resolve([])),
    [scopedLocationId],
    [],
  )
  const branchName = scopedLocationId
    ? locations.find(l => l.id === scopedLocationId)?.name ?? null
    : null

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && <div className={s.overlay} onClick={onMobileClose} />}

      <aside className={[s.sidebar, collapsed ? s.collapsed : '', mobileOpen ? s.mobileOpen : ''].filter(Boolean).join(' ')}>
        {/* Logo — the partner's own initial + name. */}
        <div className={s.logo}>
          <div className={s.logoIcon}>
            {partner?.presentation?.logoUrl
              ? <img src={galleryImageUrl(partner.presentation.logoUrl)} alt="" className={s.logoImg} />
              : (partner?.name?.trim()?.[0] ?? 'R').toUpperCase()}
          </div>
          {!collapsed && (
            <div className={s.logoText}>
              <div className={s.name}>{partner?.name ?? 'Reserva'}</div>
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
              <span className={s.partnerName}>{tp('sidebar.locationCount', partner.locationCount ?? 0, { type: partner.type })}</span>
            </div>
          )
        )}

        {/* Nav */}
        <nav className={s.nav}>
          {NAV.map(group => {
            const items = group.items.filter(item =>
              (isAdmin || !item.adminOnly) && !(partner?.kind === 'single' && item.singleHidden)
            )
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
