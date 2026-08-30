import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ToastProvider } from '@/components/ui'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import { tokenStore } from '@/services/http'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { RequireOwner } from '@/components/auth/RequireOwner'
import { Login } from '@/pages/Login/Login'
import { Dashboard } from '@/pages/Dashboard/Dashboard'
import { Partners } from '@/pages/Partners/Partners'
import { PartnerDetailPage } from '@/pages/Partners/PartnerDetail'
import { Staff } from '@/pages/Staff/Staff'
import { DemoRequests } from '@/pages/DemoRequests/DemoRequests'
import { PendingRegistrations } from '@/pages/PendingRegistrations/PendingRegistrations'
import { Visits } from '@/pages/Visits/Visits'
import { Specialties } from '@/pages/Specialties/Specialties'
import { Support } from '@/pages/Support/Support'

/** Apply the platform theme once on mount. The accent is intentionally NOT
 *  overridden here: the console inherits Reserva's shared brand accent (the warm
 *  bronze in @reserva/ui tokens), so all chrome matches the client + partner
 *  apps instead of a one-off indigo. */
function ThemeApplier() {
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', 'dark')
    root.setAttribute('data-density', 'comfortable')
  }, [])
  return null
}

/** Re-validate the persisted session against the API on load. */
function SessionBootstrap() {
  const setUser = useAuthStore((s) => s.setUser)
  useEffect(() => {
    if (!tokenStore.access) return
    authService.me().then(setUser).catch(() => setUser(null))
  }, [setUser])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ThemeApplier />
        <SessionBootstrap />
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="partners" element={<Partners />} />
            <Route path="partners/:id" element={<PartnerDetailPage />} />
            <Route path="support" element={<Support />} />
            <Route path="demo-requests" element={<DemoRequests />} />
            <Route path="pending-registrations" element={<PendingRegistrations />} />
            <Route path="visits" element={<Visits />} />
            <Route path="specialties" element={<Specialties />} />
            <Route path="staff" element={<RequireOwner><Staff /></RequireOwner>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
