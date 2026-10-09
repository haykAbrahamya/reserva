import { createRoot } from 'react-dom/client'
import '@reserva/ui/styles'
import '@/styles/global.css'
import { disableNumberInputStepping } from '@reserva/ui'
import { I18nProvider } from '@/i18n'
import { initSentry, Sentry } from '@/monitoring/sentry'
import { ErrorFallback } from '@/monitoring/ErrorFallback'
import App from './App'

initSentry()
// Number fields change by typing only — scrolling a form must never change a value.
disableNumberInputStepping()

createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
    <I18nProvider>
      <App />
    </I18nProvider>
  </Sentry.ErrorBoundary>
)
