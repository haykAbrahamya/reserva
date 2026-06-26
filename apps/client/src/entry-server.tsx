import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { I18nProvider } from '@/i18n'
import { AppRoutes } from './App'

/**
 * Server render used only at build time by scripts/prerender.mjs to generate
 * static HTML for the public marketing routes. No browser APIs run here (effects
 * don't fire during renderToString), so the prerender script injects the
 * per-route <head> itself. Pure Node — no headless browser needed in CI.
 */
export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <I18nProvider>
        <AppRoutes />
      </I18nProvider>
    </StaticRouter>,
  )
}
