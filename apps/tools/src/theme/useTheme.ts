import { useCallback, useEffect, useRef, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'reserva-tools-theme'

/**
 * Light unless the visitor has chosen otherwise — the same rule as the other
 * public Reserva sites. Someone arriving from a reel or a search result has no
 * relationship with the page yet, and light is the version designed hardest.
 *
 * Read synchronously by main.tsx before React mounts, so the page never paints
 * one theme and then flips to the other.
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

/** Keep the browser chrome (`theme-color`) in step with the live `--bg-0`. */
function syncBrowserChrome(html: HTMLElement) {
  const meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) return
  const bg = getComputedStyle(html).getPropertyValue('--bg-0').trim()
  if (bg) meta.setAttribute('content', bg)
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  // Skips the first run: main.tsx already stamped the attribute before mount.
  const mounted = useRef(false)

  useEffect(() => {
    const html = document.documentElement

    // Suppress transitions in the SAME commit the tokens change, so the flip is
    // one clean frame instead of a dozen transitions at different speeds.
    if (mounted.current) {
      html.classList.add('theme-switching')
      requestAnimationFrame(() =>
        requestAnimationFrame(() => html.classList.remove('theme-switching')),
      )
    }
    mounted.current = true

    html.setAttribute('data-theme', theme)
    syncBrowserChrome(html)

    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle, isDark: theme === 'dark' }
}
