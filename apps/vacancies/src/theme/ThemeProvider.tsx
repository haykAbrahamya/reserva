import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useTheme, type Theme } from './useTheme'

interface ThemeValue {
  theme: Theme
  isDark: boolean
  toggle: () => void
}

const Ctx = createContext<ThemeValue | null>(null)

/**
 * Holds the app's single theme instance.
 *
 * A context rather than props, because the control that toggles the theme lives
 * in the header, and the header is rendered per ROUTE — the board needs a
 * search field in it and a listing page does not. Threading `isDark` and
 * `onToggle` from the shell, through each page, into the header would make
 * every page carry two props it does not use for anything else.
 *
 * `useTheme` is called exactly once, here. Calling it in two places would give
 * two independent pieces of state writing to the same DOM attribute, and the
 * loser would silently disagree with the page it is painting.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, isDark, toggle } = useTheme()
  const value = useMemo(() => ({ theme, isDark, toggle }), [theme, isDark, toggle])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useThemeContext(): ThemeValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useThemeContext must be used within <ThemeProvider>')
  return ctx
}
