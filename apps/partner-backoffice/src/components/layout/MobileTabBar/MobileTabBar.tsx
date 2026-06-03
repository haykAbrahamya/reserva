import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, List, Sparkles, MoreHorizontal, Plus, Settings, LogOut, UserCog, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { authService } from '@/services/auth.service'
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal/ChangePasswordModal'
import { Avatar } from '@/components/ui'
import { useNewBooking } from '@/App'
import { useT } from '@/i18n'
import s from './MobileTabBar.module.scss'

const TABS = [
  { to: '/',         labelKey: 'nav.home',     icon: LayoutDashboard, end: true },
  { to: '/calendar', labelKey: 'nav.calendar', icon: Calendar },
  { to: '/bookings', labelKey: 'nav.bookings', icon: List },
  { to: '/services', labelKey: 'nav.services', icon: Sparkles },
]

export function MobileTabBar() {
  const openNewBooking = useNewBooking()
  const [moreOpen, setMoreOpen] = useState(false)
  const [closing,  setClosing]  = useState(false)
  const [pwOpen,   setPwOpen]   = useState(false)
  const user   = useAuthStore(st => st.user)
  const logout = useAuthStore(st => st.logout)
  const isAdmin = useIsAdmin()
  const navigate = useNavigate()
  const t = useT()

  // Animate the sheet out before unmounting
  const closeMore = (after?: () => void) => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      setMoreOpen(false)
      after?.()
    }, 280)
  }

  const handleLogout = async () => {
    await authService.logout()
    logout()
    closeMore(() => navigate('/login', { replace: true }))
  }

  return (
    <>
      {/* FAB */}
      <button className={s.fab} onClick={openNewBooking} aria-label={t('dashboard.newBooking')}>
        <Plus size={22} />
      </button>

      {/* Tab bar */}
      <nav className={s.tabbar}>
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => [s.tab, isActive ? s.active : ''].filter(Boolean).join(' ')}
          >
            <tab.icon size={20} className={s.icon} />
            <span>{t(tab.labelKey)}</span>
          </NavLink>
        ))}

        {/* More tab — opens profile + logout sheet */}
        <button className={s.tab} onClick={() => setMoreOpen(true)}>
          <MoreHorizontal size={20} className={s.icon} />
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      {/* More / profile bottom sheet */}
      {moreOpen && (
        <>
          <div
            className={[s.moreScrim, closing ? s.closing : ''].filter(Boolean).join(' ')}
            onClick={() => closeMore()}
          />
          <div className={[s.moreSheet, closing ? s.closing : ''].filter(Boolean).join(' ')}>
            <div className={s.sheetGrab} />

            {user && (
              <div className={s.sheetUser}>
                <Avatar name={user.name} size="lg" style={{ background: 'var(--accent)', color: 'white', border: 'none' }} />
                <div>
                  <div className={s.sheetUserName}>{user.name}</div>
                  <div className={s.sheetUserEmail}>{user.email}</div>
                  <div className={s.sheetUserRole}>{t(`roles.${user.role}`)}</div>
                </div>
              </div>
            )}

            <div className={s.sheetItems}>
              <button
                className={s.sheetItem}
                onClick={() => closeMore(() => navigate('/clients'))}
              >
                <span className={s.sheetItemIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </span>
                {t('nav.clients')}
              </button>

              <button
                className={s.sheetItem}
                onClick={() => closeMore(() => navigate('/specialists'))}
              >
                <span className={s.sheetItemIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
                  </svg>
                </span>
                {t('nav.specialists')}
              </button>

              <button
                className={s.sheetItem}
                onClick={() => closeMore(() => navigate('/hours'))}
              >
                <span className={s.sheetItemIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </span>
                {t('nav.hours')}
              </button>

              {isAdmin && (
                <button
                  className={s.sheetItem}
                  onClick={() => closeMore(() => navigate('/users'))}
                >
                  <span className={s.sheetItemIcon}><UserCog size={18} /></span>
                  {t('nav.users')}
                </button>
              )}

              <button
                className={s.sheetItem}
                onClick={() => closeMore(() => setPwOpen(true))}
              >
                <span className={s.sheetItemIcon}><KeyRound size={18} /></span>
                {t('changePassword.title')}
              </button>

              <button
                className={s.sheetItem}
                onClick={() => closeMore(() => navigate('/settings'))}
              >
                <span className={s.sheetItemIcon}><Settings size={18} /></span>
                {t('nav.settings')}
              </button>

              <div className={s.sheetDivider} />

              <button className={[s.sheetItem, s.danger].join(' ')} onClick={handleLogout}>
                <span className={s.sheetItemIcon}><LogOut size={18} /></span>
                {t('userMenu.signOut')}
              </button>
            </div>
          </div>
        </>
      )}

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  )
}
