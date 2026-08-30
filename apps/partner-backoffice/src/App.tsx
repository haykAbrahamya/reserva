import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout/AppLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Login } from '@/pages/Login/Login'

// ── Route-level code splitting ────────────────────────────────
// One chunk per page, so the first paint downloads the shell and the landing
// page only. This pays off most for a partner who holds a single product: a
// vacancies-only salon never fetches the calendar, the booking grid or the
// storefront editor at all, and adding a fourth product costs existing
// partners nothing.
const Activate    = lazy(() => import('@/pages/Activate/Activate').then(m => ({ default: m.Activate })))
const Dashboard   = lazy(() => import('@/pages/Dashboard/Dashboard').then(m => ({ default: m.Dashboard })))
const Bookings    = lazy(() => import('@/pages/Bookings/Bookings').then(m => ({ default: m.Bookings })))
const Services    = lazy(() => import('@/pages/Services/Services').then(m => ({ default: m.Services })))
const Courses     = lazy(() => import('@/pages/Courses/Courses').then(m => ({ default: m.Courses })))
const Vacancies   = lazy(() => import('@/pages/Vacancies/Vacancies').then(m => ({ default: m.Vacancies })))
const Specialists = lazy(() => import('@/pages/Specialists/Specialists').then(m => ({ default: m.Specialists })))
const Reviews     = lazy(() => import('@/pages/Reviews/Reviews').then(m => ({ default: m.Reviews })))
const Hours       = lazy(() => import('@/pages/Hours/Hours').then(m => ({ default: m.Hours })))
const Locations   = lazy(() => import('@/pages/Locations/Locations').then(m => ({ default: m.Locations })))
const Users       = lazy(() => import('@/pages/Users/Users').then(m => ({ default: m.Users })))
const CalendarPage = lazy(() => import('@/pages/Calendar/CalendarPage').then(m => ({ default: m.CalendarPage })))
const Clients     = lazy(() => import('@/pages/Clients/Clients').then(m => ({ default: m.Clients })))
const SettingsPage = lazy(() => import('@/pages/Settings/Settings').then(m => ({ default: m.Settings })))
const Storefront  = lazy(() => import('@/pages/Storefront/Storefront').then(m => ({ default: m.Storefront })))

// The new-booking flow is a heavy modal mounted app-wide. Lazy AND gated on the
// booking product below, so a partner without it never downloads the booking
// form, the slot picker or the client search.
const NewBookingModal = lazy(() =>
  import('@/components/bookings/NewBookingModal/NewBookingModal').then(m => ({ default: m.NewBookingModal })),
)
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { RequireProduct } from '@/components/auth/RequireProduct'
import { ToastProvider } from '@/components/ui'
import { useAppStore, usePartner } from '@/store/app.store'
import { useAuthStore } from '@/store/auth.store'
import { partnersService } from '@/services/partners.service'

export function useNewBooking() {
  return () => window.dispatchEvent(new CustomEvent('open-new-booking'))
}

function DataLoader() {
  const setPartner   = useAppStore(s => s.setPartner)
  const setPartnerId = useAppStore(s => s.setPartnerId)
  const isAuth       = useAuthStore(s => s.isAuthenticated)

  // On auth, load ONLY the partner identity + branding. Catalog and bookings are
  // fetched per-page (no global cache) so they're always fresh.
  useEffect(() => {
    if (!isAuth) {
      setPartner(null)
      return
    }
    partnersService.getOwn().then((partner) => {
      setPartner(partner)
      setPartnerId(partner.id)
    })
  }, [isAuth, setPartner, setPartnerId])

  return null
}

function ThemeApplier() {
  const theme   = useAppStore(s => s.theme)
  const density = useAppStore(s => s.density)
  const partner = usePartner()

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-density', density)

    // Drive the accent from the partner's own brand color (set per-tenant by
    // the API) rather than a fixed CSS preset keyed by a known id.
    if (partner?.accent) {
      root.style.setProperty('--accent', partner.accent)
      root.style.setProperty('--accent-strong', `color-mix(in srgb, ${partner.accent} 78%, #000)`)
      root.style.setProperty('--accent-soft', `color-mix(in srgb, ${partner.accent} 12%, transparent)`)
    }
  }, [theme, density, partner])

  return null
}

function GlobalModals() {
  const [open, setOpen] = useState(false)
  const partner = usePartner()
  const hasBookings = (partner?.products ?? []).some(p => p.key === 'bookings')

  useEffect(() => {
    const fn = () => setOpen(true)
    window.addEventListener('open-new-booking', fn)
    return () => window.removeEventListener('open-new-booking', fn)
  }, [])

  // Not merely hidden — never mounted, so the chunk is never requested for a
  // partner who cannot take bookings.
  if (!hasBookings) return null

  return (
    <Suspense fallback={null}>
      <NewBookingModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => window.dispatchEvent(new CustomEvent('booking-created'))}
      />
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <DataLoader />
        <ThemeApplier />
        <GlobalModals />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          {/* Self-serve signup activation (magic link from email) */}
          <Route path="/activate" element={<Suspense fallback={null}><Activate /></Suspense>} />

          {/* Protected */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            {/* Booking product */}
            <Route index           element={<RequireProduct product="bookings"><Dashboard /></RequireProduct>} />
            <Route path="calendar" element={<RequireProduct product="bookings"><CalendarPage /></RequireProduct>} />
            <Route path="bookings" element={<RequireProduct product="bookings"><Bookings /></RequireProduct>} />
            <Route path="clients"  element={<RequireProduct product="bookings"><Clients /></RequireProduct>} />
            <Route path="services"    element={<RequireProduct product="bookings"><Services /></RequireProduct>} />
            <Route path="specialists" element={<RequireProduct product="bookings"><Specialists /></RequireProduct>} />
            <Route path="reviews"     element={<RequireProduct product="bookings"><Reviews /></RequireProduct>} />
            <Route path="hours"       element={<RequireProduct product="bookings"><Hours /></RequireProduct>} />

            {/* Courses product */}
            <Route path="courses"     element={<RequireProduct product="courses"><Courses /></RequireProduct>} />

            {/* Vacancies product */}
            <Route path="vacancies"   element={<RequireProduct product="vacancies"><Vacancies /></RequireProduct>} />
            {/* Admin-only: branches + team management */}
            <Route path="locations"   element={<RequireAdmin><Locations /></RequireAdmin>} />
            <Route path="users"       element={<RequireAdmin><Users /></RequireAdmin>} />
            <Route path="storefront"  element={<RequireAdmin><Storefront /></RequireAdmin>} />
            <Route path="settings"    element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
