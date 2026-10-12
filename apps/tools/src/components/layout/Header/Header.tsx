import { ArrowUpRight } from 'lucide-react'
import { useT } from '@/i18n'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher/LanguageSwitcher'
import { ToolsLogo } from '@/components/common/Logo/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle/ThemeToggle'
import { platformUrl } from '@/lib/links'
import { useThemeContext } from '@/theme/ThemeProvider'
import s from './Header.module.scss'

/** Fixed site header: brand, preferences, and the quiet way into Reserva. */
export function Header() {
  const { isDark, toggle } = useThemeContext()
  const t = useT()

  return (
    <header className={s.header} data-site-header>
      <div className={s.inner}>
        <ToolsLogo />

        <div className={s.actions}>
          <LanguageSwitcher />
          <ThemeToggle isDark={isDark} onToggle={toggle} />
          {/* Wide screens only — on a phone the footer carries the same link,
              and the bar needs its width for the brand and the two controls. */}
          <a className={s.cta} href={platformUrl('/', 'header')}>
            {t('nav.cta')}
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </header>
  )
}
