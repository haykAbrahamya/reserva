import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { I18nProvider } from '@/i18n'
import { ThemeProvider } from '@/theme/ThemeProvider'
import App from './App'

/**
 * The build-time server render, used only by scripts/prerender.mjs.
 *
 * Pure Node — no browser, no headless Chrome in CI. Effects do not fire during
 * renderToString, so what comes out is the page's FIRST frame: the header, the
 * headings, the copy, and a skeleton where the fetched listings will go. That
 * is deliberate rather than a limitation. The listings change hourly and the
 * static file does not, so baking them in would ship a page that disagrees
 * with itself the moment a listing closes.
 *
 * The prerender script therefore owns the <head> and the crawlable text block;
 * this only provides the shell around them.
 *
 * ToastProvider is absent on purpose: nothing renders a toast in a first frame,
 * and it is the one provider that reaches for browser APIs on mount.
 */
export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <I18nProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </I18nProvider>
    </StaticRouter>,
  )
}
