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

/** Apply the platform brand theme once on mount. */
function ThemeApplier() {
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', 'dark')
    root.setAttribute('data-density', 'comfortable')
    // Reserva platform accent (indigo) — distinct from any single tenant brand.
    root.style.setProperty('--accent', '#4f46e5')
    root.style.setProperty('--accent-strong', 'color-mix(in srgb, #4f46e5 78%, #000)')
    root.style.setProperty('--accent-soft', 'color-mix(in srgb, #4f46e5 12%, transparent)')
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
            <Route path="demo-requests" element={<DemoRequests />} />
            <Route path="pending-registrations" element={<PendingRegistrations />} />
            <Route path="visits" element={<Visits />} />
            <Route path="staff" element={<RequireOwner><Staff /></RequireOwner>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
