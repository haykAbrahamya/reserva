import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout/AppLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { Login } from '@/pages/Login/Login'
import { Dashboard } from '@/pages/Dashboard/Dashboard'
import { Bookings } from '@/pages/Bookings/Bookings'
import { Services } from '@/pages/Services/Services'
import { Specialists } from '@/pages/Specialists/Specialists'
import { Hours } from '@/pages/Hours/Hours'
import { Locations } from '@/pages/Locations/Locations'
import { Users } from '@/pages/Users/Users'
import { CalendarPage } from '@/pages/Calendar/CalendarPage'
import { Clients } from '@/pages/Clients/Clients'
import { Placeholder } from '@/pages/Placeholder'
import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { ToastProvider } from '@/components/ui'
import { NewBookingModal } from '@/components/bookings/NewBookingModal/NewBookingModal'
import { useAppStore, usePartner } from '@/store/app.store'
import { useAuthStore } from '@/store/auth.store'
import { partnersService } from '@/services/partners.service'
import { Settings } from 'lucide-react'

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

  useEffect(() => {
    const fn = () => setOpen(true)
    window.addEventListener('open-new-booking', fn)
    return () => window.removeEventListener('open-new-booking', fn)
  }, [])

  return (
    <NewBookingModal
      open={open}
      onClose={() => setOpen(false)}
      onCreated={() => window.dispatchEvent(new CustomEvent('booking-created'))}
    />
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

          {/* Protected */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index           element={<Dashboard />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="clients"  element={<Clients />} />
            <Route path="services"    element={<Services />} />
            <Route path="specialists" element={<Specialists />} />
            <Route path="hours"       element={<Hours />} />
            {/* Admin-only: branches + team management */}
            <Route path="locations"   element={<RequireAdmin><Locations /></RequireAdmin>} />
            <Route path="users"       element={<RequireAdmin><Users /></RequireAdmin>} />
            <Route path="settings"    element={<Placeholder icon={Settings} titleKey="nav.settings" />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
