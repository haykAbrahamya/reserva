import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { useAppSelector } from '@/store/hooks'
import { Home } from '@/pages/Home/Home'
import { PartnerPage } from '@/pages/Partner/PartnerPage'
import { SignUp } from '@/pages/SignUp/SignUp'
import { NotFound } from '@/pages/NotFound/NotFound'
import { slugFromHost } from '@/hooks/useTenantSlug'

/** Reflects the persisted theme onto <html data-theme="…">. */
function ThemeApplier() {
  const theme = useAppSelector(s => s.theme.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return null
}

/** TEMP: ?sentrytest=1 throws a real render error to verify Sentry capture. */
function SentryTest(): never {
  throw new Error('Sentry manual test — render crash')
}

export default function App() {
  // On a tenant subdomain (e.g. antheris.reserva.am) the root path is that
  // partner's booking page — same view as reserva.am/p/antheris. On the apex
  // (reserva.am) the root is the marketing home. PartnerPage reads the slug
  // from the host, and shows the same 404 (PartnerNotFound) for unknown slugs.
  const isTenant = slugFromHost() !== null

  // TEMP test hook — remove after verifying Sentry.
  if (new URLSearchParams(window.location.search).has('sentrytest')) {
    return <SentryTest />
  }

  return (
    <Provider store={store}>
      <BrowserRouter>
        <ThemeApplier />
        <Routes>
          <Route path="/" element={isTenant ? <PartnerPage /> : <Home />} />
          {/* Sign up / start free trial */}
          <Route path="/signup" element={<SignUp />} />
          {/* Partner booking page — reserva.am/p/:slug (kept for dev + direct links) */}
          <Route path="/p/:slug" element={<PartnerPage />} />
          {/* Creative 404 for any unknown route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}
