import { createRoot } from 'react-dom/client'
import '@reserva/ui/styles'
import { I18nProvider } from '@/i18n'
import { initSentry, Sentry } from '@/monitoring/sentry'
import { ErrorFallback } from '@/monitoring/ErrorFallback'
import App from './App'

initSentry()

// Register the service worker on load (independently of push setup). A
// registered SW + the web manifest are what make the app installable, so this
// lets the browser fire `beforeinstallprompt` → the "Install app" button in
// Settings. Harmless if push was never enabled.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      /* SW registration is best-effort; the app works fine without it. */
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
    <I18nProvider>
      <App />
    </I18nProvider>
  </Sentry.ErrorBoundary>
)
