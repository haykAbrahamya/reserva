import { useLocation } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui'
import { UserMenu } from '../UserMenu/UserMenu'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { usePartner } from '@/store/app.store'
import { initials } from '@/components/ui'
import s from './Topbar.module.scss'

const TITLES: Record<string, string> = {
  '/': 'Dashboard', '/calendar': 'Calendar', '/bookings': 'Bookings',
  '/clients': 'Clients', '/services': 'Services', '/specialists': 'Specialists',
  '/hours': 'Working hours', '/locations': 'Locations', '/settings': 'Settings',
}

export function Topbar() {
  const { pathname } = useLocation()
  const partner = usePartner()

  return (
    <header className={s.topbar}>
      {/* Mobile: partner logo + name */}
      <div className={s.mobileLogo}>
        <div
          className={s.mobileLogoIcon}
          style={{ background: partner?.accent ?? 'var(--accent)' }}
        >
          {partner ? initials(partner.name) : 'R'}
        </div>
        <span className={s.mobileTitle}>{partner?.name ?? 'Backoffice'}</span>
      </div>

      {/* Desktop: page breadcrumb */}
      <span className={s.breadcrumb}>{TITLES[pathname] ?? ''}</span>

      <div className={s.spacer} />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Bell notification */}
      <Button variant="default" size="sm" icon style={{ position: 'relative', flexShrink: 0 }}>
        <Bell size={14} />
        <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent)', border: '1.5px solid var(--bg-0)',
        }} />
      </Button>

      <div className={s.divider} />

      {/* User menu */}
      <UserMenu />
    </header>
  )
}
