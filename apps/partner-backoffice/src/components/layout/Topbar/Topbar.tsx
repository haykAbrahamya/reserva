import { useLocation } from 'react-router-dom'
import { UserMenu } from '../UserMenu/UserMenu'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import { LanguageSwitcher } from '../LanguageSwitcher/LanguageSwitcher'
import { NotificationsBell } from '../NotificationsBell/NotificationsBell'
import { usePartner } from '@/store/app.store'

import { initials } from '@/components/ui'
import { useT } from '@/i18n'
import s from './Topbar.module.scss'
import { uploadUrl } from '@/services/http'

export function Topbar() {
  const { pathname } = useLocation()
  const partner = usePartner()
  const t = useT()
  const title = t(`topbar.titles.${pathname}`)

  return (
    <header className={s.topbar}>
      {/* Mobile: partner logo + name */}
      <div className={s.mobileLogo}>
        <div
          className={s.mobileLogoIcon}
          style={{ background: partner?.presentation?.logoUrl ? 'transparent' : (partner?.accent ?? 'var(--accent)') }}
        >
          {partner?.presentation?.logoUrl
            ? <img src={uploadUrl(partner.presentation.logoUrl)} alt="" className={s.mobileLogoImg} />
            : (partner ? initials(partner.name) : 'R')}
        </div>
        <span className={s.mobileTitle}>{partner?.name ?? t('common.backoffice')}</span>
      </div>

      {/* Desktop: page breadcrumb */}
      <span className={s.breadcrumb}>{title.startsWith('topbar.') ? '' : title}</span>

      <div className={s.spacer} />

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Notifications */}
      <NotificationsBell />

      <div className={s.divider} />

      {/* User menu */}
      <UserMenu />
    </header>
  )
}
