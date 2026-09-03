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
