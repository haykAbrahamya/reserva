import { useCallback, useEffect, useRef, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'reserva-vacancies-theme'

function systemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * The initial theme: a saved choice, otherwise the operating system's.
 *
 * Read synchronously at module scope by the caller before first paint, so the
 * page never renders light and then flips — that flash is the most visible bug
 * a theme toggle can have.
 */
export function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Blocked storage — the system preference is still a good answer.
  }
  return systemTheme()
}

/**
 * Dark/light for the board.
 *
 * Fixed palette, unlike the client app: there is no per-tenant accent here
 * because a board shows many salons at once (see styles/theme.css). All this
 * owns is which of the two token sets is active.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  // Skips the first run: on mount there is no previous theme to transition
  // from, and main.tsx has already stamped the attribute before React mounted.
  const mounted = useRef(false)

  useEffect(() => {
    const html = document.documentElement

    /*
     * Suppress transitions and change the tokens in the SAME commit.
     *
     * Doing this in the click handler instead was a race: the handler's
     * requestAnimationFrame callbacks could fire before this effect ran (a
     * `useEffect` runs after paint), so the class was already gone by the time
     * the tokens actually changed — and everything faded again. Applying both
     * here means the browser paints exactly once, with the new values and with
     * every transition switched off.
     */
    if (mounted.current) {
      html.classList.add('theme-switching')
      requestAnimationFrame(() =>
        requestAnimationFrame(() => html.classList.remove('theme-switching')),
      )
    }
    mounted.current = true

    html.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  // Follow the OS while the visitor has not chosen for themselves. Someone who
  // set their system to dark at sunset expects this page to come with it.
  useEffect(() => {
    let hasChoice = false
    try {
      hasChoice = window.localStorage.getItem(STORAGE_KEY) !== null
    } catch {
      /* ignore */
    }
    if (hasChoice) return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle, isDark: theme === 'dark' }
}
