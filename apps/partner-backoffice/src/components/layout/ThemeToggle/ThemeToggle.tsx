import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/store/app.store'
import s from './ThemeToggle.module.scss'

/** Briefly enables global color transitions so the theme cross-fades. */
function animateThemeSwitch() {
  const html = document.documentElement
  html.classList.add('theme-transitioning')
  window.setTimeout(() => html.classList.remove('theme-transitioning'), 480)
}

export function ThemeToggle() {
  const theme    = useAppStore(st => st.theme)
  const setTheme = useAppStore(st => st.setTheme)
  const isDark   = theme === 'dark'

  const toggle = () => {
    animateThemeSwitch()
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      className={[s.toggle, isDark ? s.dark : ''].filter(Boolean).join(' ')}
      onClick={toggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      <span className={s.iconWrap}>
        <span className={[s.icon, s.sun].join(' ')}><Sun size={15} /></span>
        <span className={[s.icon, s.moon].join(' ')}><Moon size={15} /></span>
      </span>
    </button>
  )
}
