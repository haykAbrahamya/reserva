import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { MoreHorizontal, HelpCircle, Plus, LogOut, KeyRound, LifeBuoy } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { usePartner } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { authService } from '@/services/auth.service'
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal/ChangePasswordModal'
import { useSupport } from '@/components/support/SupportProvider'
import { Avatar } from '@/components/ui'
import { useNewBooking } from '@/App'
import { useT } from '@/i18n'
import { PRIMARY_TABS, MORE_SECTIONS, isNavItemVisible } from '../nav.config'
import s from './MobileTabBar.module.scss'

// Bottom bar = the shared "primary" nav items. The dashboard tab shows the
// shorter "Home" label on mobile.
const TABS = PRIMARY_TABS.map(t => ({ ...t, labelKey: t.to === '/' ? 'nav.home' : t.labelKey }))

export function MobileTabBar() {
  const [moreOpen, setMoreOpen] = useState(false)
  const [closing,  setClosing]  = useState(false)
  const [pwOpen,   setPwOpen]   = useState(false)
  const user   = useAuthStore(st => st.user)
  const logout = useAuthStore(st => st.logout)
  const isAdmin = useIsAdmin()
  const partner = usePartner()
  const navigate = useNavigate()
  const { unread, openChat } = useSupport()
  const openNewBooking = useNewBooking()
  const fabMode = partner?.supportWidget ?? 'support'
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
      {/* FAB — follows the partner's preference: support chat / new booking /
          hidden. Booking always remains reachable from the Bookings page. */}
      {fabMode === 'support' && (
        <button className={s.fab} onClick={openChat} aria-label={t('support.open')}>
          <HelpCircle size={24} />
          {unread > 0 && <span className={s.fabDot} />}
        </button>
      )}
      {fabMode === 'book' && (
        <button className={s.fab} onClick={openNewBooking} aria-label={t('dashboard.newBooking')}>
          <Plus size={22} />
        </button>
      )}

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

        {/* More tab — opens profile + logout sheet. Shows a dot when support has
            unread replies, so the entry point is discoverable from the bar. */}
        <button className={s.tab} onClick={() => setMoreOpen(true)}>
          <span className={s.tabIconWrap}>
            <MoreHorizontal size={20} className={s.icon} />
            {unread > 0 && <span className={s.tabDot} />}
          </span>
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
              {MORE_SECTIONS.map(group => {
                const items = group.items.filter(item =>
                  isNavItemVisible(item, { isAdmin, isSingle: partner?.kind === 'single', coursesEnabled: !!partner?.coursesEnabled })
                )
                if (items.length === 0) return null
                return (
                  <div key={group.section} className={s.sheetGroup}>
                    <div className={s.sheetGroupLabel}>{t(`nav.sections.${group.section}`)}</div>
                    {items.map(item => (
                      <button
                        key={item.to}
                        className={s.sheetItem}
                        onClick={() => closeMore(() => navigate(item.to))}
                      >
                        <span className={s.sheetItemIcon}><item.icon size={18} /></span>
                        {t(item.labelKey)}
                      </button>
                    ))}
                  </div>
                )
              })}

              <div className={s.sheetDivider} />

              <button
                className={s.sheetItem}
                onClick={() => closeMore(() => openChat())}
              >
                <span className={s.sheetItemIcon}><LifeBuoy size={18} /></span>
                {t('support.title')}
                {unread > 0 && <span className={s.sheetDot} />}
              </button>

              <button
                className={s.sheetItem}
                onClick={() => closeMore(() => setPwOpen(true))}
              >
                <span className={s.sheetItemIcon}><KeyRound size={18} /></span>
                {t('changePassword.title')}
              </button>

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
