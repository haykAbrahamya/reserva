import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastProvider, disableNumberInputStepping } from '@reserva/ui'

// Order matters: the design system's tokens, then this app's tokens, then its
// base styles — reversed, a token would win over the value meant to replace it.
import '@reserva/ui/styles'
import '@/styles/theme.css'
import '@/styles/global.scss'

import App from './App'
import { I18nProvider, forgetUnchosenLocale } from '@/i18n'
import { receiveHandoff } from '@/lib/handoff'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { initialTheme } from '@/theme/useTheme'

// A visit carried over from an app's built-in browser goes back into storage
// before anything reads it: the theme just below, the language, the drafts.
receiveHandoff()
// Armenian first, for everyone who has not picked another language.
forgetUnchosenLocale()

// Paint the theme before React mounts, so a dark-mode visitor never sees a
// white flash on load.
document.documentElement.setAttribute('data-theme', initialTheme())

// Number fields change by typing only — scrolling a form must never change a value.
disableNumberInputStepping()

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
