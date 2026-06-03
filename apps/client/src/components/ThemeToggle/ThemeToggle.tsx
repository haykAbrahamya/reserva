import { Sun, Moon } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleTheme } from '@/store/themeSlice'
import s from './ThemeToggle.module.scss'

/** Briefly enables global color transitions so the theme cross-fades. */
function animateThemeSwitch() {
  const html = document.documentElement
  html.classList.add('theme-transitioning')
  window.setTimeout(() => html.classList.remove('theme-transitioning'), 480)
}

export function ThemeToggle() {
  const theme    = useAppSelector(st => st.theme.theme)
  const dispatch = useAppDispatch()
  const isDark   = theme === 'dark'

  const onClick = () => {
    animateThemeSwitch()
    dispatch(toggleTheme())
  }

  return (
    <button
      className={[s.toggle, isDark ? s.dark : ''].filter(Boolean).join(' ')}
      onClick={onClick}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      <span className={s.iconWrap}>
        <span className={[s.icon, s.sun].join(' ')}><Sun size={16} /></span>
        <span className={[s.icon, s.moon].join(' ')}><Moon size={16} /></span>
      </span>
    </button>
  )
}
