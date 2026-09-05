import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LogoMark } from '@reserva/ui'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher/LanguageSwitcher'
import { ThemeToggle } from '@/components/common/ThemeToggle/ThemeToggle'
import { useT } from '@/i18n'
import { useThemeContext } from '@/theme/ThemeProvider'
import s from './AuthLayout.module.scss'

export interface PanelPoint {
  icon: LucideIcon
  title: string
  desc: string
}

interface Props {
  /** The panel's headline. */
  panelTitle: string
  /** Up to three reasons, shown only where there is room for them. */
  points?: PanelPoint[]
  children: ReactNode
}

/**
 * The frame both auth screens sit in: a brand panel and a form column.
 *
 * Extracted the moment there were two of them. Signup and login are the same
 * page with different questions, and letting each own a copy of the panel
 * guarantees they drift — a colour here, a logo size there, and eventually two
 * different answers to "what is this site" a click apart.
 *
 * Rendered OUTSIDE the board's shell, so it carries its own language and theme
 * controls: the board's footer under a full-height auth screen appended a
 * second page's worth of chrome and pointed back at the page you were already
 * on (see App.tsx).
 */
export function AuthLayout({ panelTitle, points, children }: Props) {
  const t = useT()
  const { isDark, toggle } = useThemeContext()

  return (
    <div className={s.page}>
      <aside className={s.panel}>
        <div className={s.panelGrid} aria-hidden="true" />
        <div className={s.panelOrb} aria-hidden="true" />

        <Link to="/" className={s.panelLogo}>
          <span className={s.panelLogoMark}>
            <LogoMark size={34} />
          </span>
          <span>
            <span className={s.panelLogoName}>Reserva</span>
            <span className={s.panelLogoTag}>{t('app.product')}</span>
          </span>
        </Link>

        <div className={s.panelMid}>
          <h2 className={s.panelQuote}>{panelTitle}</h2>
          {points && points.length > 0 && (
            <div className={s.points}>
              {points.map((p) => (
                <div key={p.title} className={s.point}>
                  <span className={s.pointIcon}>
                    <p.icon size={16} />
                  </span>
                  <span>
                    <span className={s.pointTitle}>{p.title}</span>
                    <span className={s.pointDesc}>{p.desc}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className={s.panelBy}>{t('signup.panelBy')}</p>
      </aside>

      <main className={s.main}>
        <div className={s.corner}>
          <LanguageSwitcher />
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </div>

        <Link to="/" className={s.mobileLogo}>
          <LogoMark size={30} />
          <span>Reserva</span>
        </Link>

        {children}
      </main>
    </div>
  )
}
