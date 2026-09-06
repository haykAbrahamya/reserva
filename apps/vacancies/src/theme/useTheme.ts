import { useCallback, useEffect, useRef, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'reserva-vacancies-theme'

/**
 * Light unless the visitor has said otherwise.
 *
 * NOT the operating system's preference, which is what this used to read. A
 * job board is a daytime, public, mostly-first-visit page: someone arriving
 * from a search result has no relationship with it yet, and the version of it
 * that has been designed, photographed and checked hardest is the light one.
 * Dark stays one tap away and is remembered from then on.
 *
 * Read synchronously at module scope by the caller before first paint, so the
 * page never renders one theme and then flips — that flash is the most visible
 * bug a theme toggle can have.
 */
export function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Blocked storage — light is still the right answer.
  }
  return 'light'
}

/**
 * Keep the browser's own chrome in step with the page.
 *
 * `theme-color` used to be two `prefers-color-scheme` metas in index.html,
 * which was correct only while the app followed the OS. It no longer does, so a
 * dark-OS visitor would get a light page under a near-black address bar.
 *
 * The value is read back off `--bg-0` rather than hardcoded here, so it cannot
 * drift from the token that actually paints the page.
 */
function syncBrowserChrome(html: HTMLElement) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const bg = getComputedStyle(html).getPropertyValue('--bg-0').trim()
  if (bg) meta.setAttribute('content', bg)
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
    // After the attribute, so the computed --bg-0 is the new theme's.
    syncBrowserChrome(html)

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  /*
   * No OS listener.
   *
   * There was one, to follow the system while the visitor had not chosen. It
   * contradicts a light default — an OS switch at sunset would have moved
   * someone who never asked for dark — and it had in any case stopped working:
   * the effect above persists the theme on mount, so by the time the listener
   * read storage there was always a value there and it returned immediately.
   */

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle, isDark: theme === 'dark' }
}
