import { ArrowUpRight } from 'lucide-react'
import { useT } from '@/i18n'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher/LanguageSwitcher'
import { ToolsLogo } from '@/components/common/Logo/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle/ThemeToggle'
import { track } from '@/lib/analytics/pulse'
import { useToolAtPath } from '@/lib/analytics/useToolAtPath'
import { platformUrl } from '@/lib/links'
import { useThemeContext } from '@/theme/ThemeProvider'
import s from './Header.module.scss'

/** Fixed site header: brand, preferences, and the quiet way into Reserva. */
export function Header() {
  const { isDark, toggle } = useThemeContext()
  const t = useT()
  const tool = useToolAtPath()

  const toggleTheme = () => {
    track('pref_change', { what: 'theme', v: isDark ? 'light' : 'dark' })
    toggle()
  }

  return (
    <header className={s.header} data-site-header>
      <div className={s.inner}>
        <ToolsLogo />

        <div className={s.actions}>
          <LanguageSwitcher />
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          {/* Wide screens only — on a phone the footer carries the same link,
              and the bar needs its width for the brand and the two controls. */}
          <a
            className={s.cta}
            href={platformUrl('/', 'header')}
            onClick={() => track('cta_click', { from: 'header', tool })}
          >
            {t('nav.cta')}
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </header>
  )
}
