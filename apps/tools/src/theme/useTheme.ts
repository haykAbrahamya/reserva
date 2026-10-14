import { useCallback, useEffect, useRef, useState } from 'react'

export type Theme = 'light' | 'dark'

/** A theme the visitor picked with the toggle — nothing is stored until they do. */
const STORAGE_KEY = 'reserva-tools-theme-choice'
/**
 * The old key held whatever theme a visit ended on, chosen or not, so a
 * "light" in it says nothing about a choice. Dropped on sight.
 */
const LEGACY_KEY = 'reserva-tools-theme'

/**
 * Dark unless the visitor has picked light: the tools' look, and the first
 * thing someone arriving from a reel sees. index.html paints dark before any
 * script runs; this keeps a light choice from earlier visits.
 *
 * Read synchronously by main.tsx before React mounts, so the page never paints
 * one theme and then flips to the other.
 */
export function initialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    window.localStorage.removeItem(LEGACY_KEY)
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Blocked storage — dark is still the right answer.
  }
  return 'dark'
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
  /** Set by the toggle: only a choice is remembered, never the default. */
  const chosen = useRef(false)

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

    if (!chosen.current) return
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const toggle = useCallback(() => {
    chosen.current = true
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle, isDark: theme === 'dark' }
}
