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
import { CalendarPage } from '@/pages/Calendar/CalendarPage'
import { Clients } from '@/pages/Clients/Clients'
import { Placeholder } from '@/pages/Placeholder'
import { ToastProvider } from '@/components/ui'
import { NewBookingModal } from '@/components/bookings/NewBookingModal/NewBookingModal'
import { useAppStore } from '@/store/app.store'
import { useAuthStore } from '@/store/auth.store'
import { partnersService } from '@/services/partners.service'
import { bookingsService } from '@/services/bookings.service'
import { Settings } from 'lucide-react'

export function useNewBooking() {
  return () => window.dispatchEvent(new CustomEvent('open-new-booking'))
}

function DataLoader() {
  const setPartners  = useAppStore(s => s.setPartners)
  const setBookings  = useAppStore(s => s.setBookings)
  const partnerId    = useAppStore(s => s.partnerId)
  const isAuth       = useAuthStore(s => s.isAuthenticated)

  useEffect(() => {
    if (isAuth) partnersService.list().then(setPartners)
  }, [setPartners, isAuth])

  useEffect(() => {
    if (isAuth) bookingsService.list(partnerId).then(setBookings)
  }, [partnerId, setBookings, isAuth])

  return null
}

function ThemeApplier() {
  const theme     = useAppStore(s => s.theme)
  const density   = useAppStore(s => s.density)
  const partnerId = useAppStore(s => s.partnerId)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.setAttribute('data-density', density)
    document.documentElement.setAttribute('data-brand', partnerId)
  }, [theme, density, partnerId])

  return null
}

function GlobalModals() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setOpen(true)
    window.addEventListener('open-new-booking', fn)
    return () => window.removeEventListener('open-new-booking', fn)
  }, [])

  return <NewBookingModal open={open} onClose={() => setOpen(false)} />
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
            <Route path="locations"   element={<Locations />} />
            <Route path="settings"    element={<Placeholder icon={Settings} title="Settings" />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
