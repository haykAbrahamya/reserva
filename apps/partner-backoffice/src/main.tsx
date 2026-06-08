import { createRoot } from 'react-dom/client'
import '@reserva/ui/styles'
import { I18nProvider } from '@/i18n'
import App from './App'

createRoot(document.getElementById('root')!).render(
    <I18nProvider>
      <App />
    </I18nProvider>
)
