import { useEffect, useRef, useState, useCallback } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Users, ShieldCheck, LogOut, Menu, X, KeyRound, Inbox, BarChart3, UserPlus, LifeBuoy, Tags,
} from 'lucide-react'
import { Avatar } from '@/components/ui'
import { ReservaMark } from '@/components/ReservaMark'
import { useAuthStore, useIsOwner } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import { ChangePasswordModal } from '@/components/account/ChangePasswordModal'
import { supportService } from '@/services/support.service'
import { onSupportMessage, onSupportBadge, closeSupportSocket } from '@/services/supportSocket'
import s from './AppLayout.module.scss'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  ownerOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/partners', label: 'Partners', icon: Building2 },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/pending-registrations', label: 'Pending Registrations', icon: UserPlus },
  { to: '/demo-requests', label: 'Demo Requests', icon: Inbox },
  { to: '/visits', label: 'Visits', icon: BarChart3 },
  // Platform-owned vocabulary shared by every product, so it belongs to the
  // console rather than to any one partner.
  { to: '/specialties', label: 'Specialties', icon: Tags },
  { to: '/staff', label: 'Staff', icon: Users, ownerOnly: true },
]

export function AppLayout() {
  const contentRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((st) => st.user)
  const logout = useAuthStore((st) => st.logout)
  const isOwner = useIsOwner()

  const [navOpen, setNavOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [supportUnread, setSupportUnread] = useState(0)

  // Reset scroll + close the mobile nav on every route change.
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 })
    setNavOpen(false)
  }, [pathname])

  // Support unread badge: seed from REST, keep fresh via WS. Refreshed on any
  // new message / badge hint. Cleared here when viewing the Support page (the
  // page itself marks threads read). Socket torn down on unmount/logout.
  const refreshUnread = useCallback(() => {
    supportService.unread().then((r) => setSupportUnread(r.count)).catch(() => undefined)
  }, [])
  useEffect(() => {
    if (!user) { closeSupportSocket(); setSupportUnread(0); return }
    refreshUnread()
    const off1 = onSupportMessage(() => refreshUnread())
    const off2 = onSupportBadge(() => refreshUnread())
    return () => { off1(); off2() }
  }, [user, refreshUnread])
  // Re-check when leaving the Support page (it may have marked things read).
  useEffect(() => { if (pathname !== '/support') refreshUnread() }, [pathname, refreshUnread])

  const items = NAV.filter((n) => !n.ownerOnly || isOwner)

  const handleLogout = async () => {
    await authService.logout()
    logout()
    navigate('/login', { replace: true })
  }

  const sidebar = (
    <>
      <div className={s.brand}>
        <span className={s.logo}><ReservaMark size={22} /></span>
        <div>
          <div className={s.brandName}>Reserva</div>
          <div className={s.brandSub}>Internal</div>
        </div>
      </div>

      <nav className={s.nav}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => [s.navItem, isActive ? s.active : ''].filter(Boolean).join(' ')}
          >
            <item.icon size={18} className={s.navIcon} />
            <span>{item.label}</span>
            {item.to === '/support' && supportUnread > 0 && (
              <span className={s.navBadge}>{supportUnread}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {user && (
        <div className={s.account}>
          <Avatar name={user.name} size="md" style={{ background: 'var(--accent)', color: 'white', border: 'none' }} />
          <div className={s.accountInfo}>
            <div className={s.accountName}>{user.name}</div>
            <div className={s.accountRole}>{user.role}</div>
          </div>
          <div className={s.accountActions}>
            <button className={s.iconBtn} title="Change password" onClick={() => setPwOpen(true)}>
              <KeyRound size={16} />
            </button>
            <button className={s.iconBtn} title="Sign out" onClick={handleLogout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )

  return (
    <div className={s.root}>
      {/* Desktop sidebar */}
      <aside className={s.sidebar}>{sidebar}</aside>

      {/* Mobile slide-in drawer */}
      {navOpen && <div className={s.scrim} onClick={() => setNavOpen(false)} />}
      <aside className={[s.drawer, navOpen ? s.open : ''].filter(Boolean).join(' ')}>{sidebar}</aside>

      <div className={s.main}>
        <header className={s.topbar}>
          <button className={s.menuBtn} onClick={() => setNavOpen((v) => !v)} aria-label="Menu">
            {navOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className={s.topbarTitle}>
            <ShieldCheck size={16} /> Reserva Internal
          </span>
        </header>

        <main className={s.content} ref={contentRef}>
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  )
}
