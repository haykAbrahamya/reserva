import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider } from '@reserva/ui'

// Order matters. The design system's tokens come first, then this app's theme
// overrides the accent, then the app's own base styles. Reversing any two would
// let a token win over the override meant to replace it.
import '@reserva/ui/styles'
import '@/styles/theme.css'
import '@/styles/global.scss'

import App from './App'
import { I18nProvider } from '@/i18n'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { initialTheme } from '@/theme/useTheme'

/**
 * Paint the theme BEFORE React mounts.
 *
 * Without this the document renders with the default light tokens and then
 * flips once the effect runs — a white flash on every load for every dark-mode
 * visitor, which is the most visible bug a theme can have. Reading
 * localStorage synchronously here costs nothing and removes it entirely.
 */
document.documentElement.setAttribute('data-theme', initialTheme())

/**
 * Drop the pre-JS SEO block once React is about to take over.
 *
 * scripts/prerender.mjs bakes a hidden copy of the page's text and links into
 * every static page, so a crawler that does not run JavaScript still reads the
 * heading, the copy and the way into the other pages. The moment this app
 * mounts, that block is a SECOND, stale copy of a page React is now rendering
 * properly — it survives client-side navigation, so after one click it
 * describes a page the visitor has already left, and it leaves the document
 * with two <h1> elements.
 *
 * Removing it costs nothing: a renderer that executes this line is a renderer
 * that will read the real DOM instead.
 */
document.getElementById('seo-content')?.remove()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
)
