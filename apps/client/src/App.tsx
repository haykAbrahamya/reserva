import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { useAppSelector } from '@/store/hooks'
import { trackPageView } from '@/services/analytics.service'
import { Home } from '@/pages/Home/Home'
import { PartnerPage } from '@/pages/Partner/PartnerPage'
import { SignUp } from '@/pages/SignUp/SignUp'
import { NotFound } from '@/pages/NotFound/NotFound'
import { Salons } from '@/pages/Salons/Salons'
import { slugFromHost } from '@/hooks/useTenantSlug'

/** Fires a visitor analytics page-view on initial load and every navigation. */
function PageViewTracker() {
  const { pathname } = useLocation()
  useEffect(() => {
    trackPageView()
  }, [pathname])
  return null
}

/** Reflects the persisted theme onto <html data-theme="…">. */
function ThemeApplier() {
  const theme = useAppSelector(s => s.theme.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return null
}

/** The route table + global side-effect components, router-agnostic so it can be
 *  wrapped by BrowserRouter (client) or StaticRouter (prerender). */
export function AppRoutes() {
  // On a tenant subdomain (e.g. antheris.reserva.am) the root path is that
  // partner's booking page — same view as reserva.am/p/antheris. On the apex
  // (reserva.am) the root is the marketing home. PartnerPage reads the slug
  // from the host, and shows the same 404 (PartnerNotFound) for unknown slugs.
  const isTenant = slugFromHost() !== null

  return (
    <Provider store={store}>
      <ThemeApplier />
      <PageViewTracker />
      <Routes>
        <Route path="/" element={isTenant ? <PartnerPage /> : <Home />} />
        {/* Sign up / start free trial */}
        <Route path="/signup" element={<SignUp />} />
        {/* Public salon marketplace directory */}
        <Route path="/salons" element={<Salons />} />
        {/* Keyword/category landing — same directory, pre-filtered by service
            category (prerendered for SEO, e.g. /salons/c/manicure). */}
        <Route path="/salons/c/:category" element={<Salons />} />
        {/* Partner booking page — reserva.am/p/:slug (kept for dev + direct links) */}
        <Route path="/p/:slug" element={<PartnerPage />} />
        {/* Creative 404 for any unknown route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
