import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useTheme, type Theme } from './useTheme'

interface ThemeValue {
  theme: Theme
  isDark: boolean
  toggle: () => void
}

const Ctx = createContext<ThemeValue | null>(null)

/**
 * The app's single theme instance. `useTheme` is called exactly once, here —
 * two callers would be two pieces of state writing the same DOM attribute.
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
