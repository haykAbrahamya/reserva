import { createRoot } from 'react-dom/client'
import '@reserva/ui/styles'
import { I18nProvider } from '@/i18n'
import { initSentry, Sentry } from '@/monitoring/sentry'
import { ErrorFallback } from '@/monitoring/ErrorFallback'
import App from './App'

initSentry()

createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary fallback={({ resetError }) => <ErrorFallback resetError={resetError} />}>
    <I18nProvider>
      <App />
    </I18nProvider>
  </Sentry.ErrorBoundary>
)
