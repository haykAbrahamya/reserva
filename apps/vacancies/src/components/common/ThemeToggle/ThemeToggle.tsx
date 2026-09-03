import { Moon, Sun } from 'lucide-react'
import { useT } from '@/i18n'
import s from './ThemeToggle.module.scss'

interface Props {
  isDark: boolean
  onToggle: () => void
}

/**
 * Light/dark switch.
 *
 * Both icons are always mounted and cross-faded rather than swapped, so the
 * button never changes size and the row it sits in cannot shift by a pixel when
 * the theme changes.
 */
export function ThemeToggle({ isDark, onToggle }: Props) {
  const t = useT()
  return (
    <button
      type="button"
      className={[s.toggle, isDark ? s.dark : ''].filter(Boolean).join(' ')}
      onClick={onToggle}
      title={t('nav.theme')}
      aria-label={t('nav.theme')}
    >
      <span className={s.icons}>
        <Sun size={15} className={[s.icon, s.sun].join(' ')} />
        <Moon size={15} className={[s.icon, s.moon].join(' ')} />
      </span>
    </button>
  )
}
