import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'
import { superSession } from '@/services/superSession'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const location = useLocation()

  // A super admin who has not chosen a partner yet chooses one first.
  const sup = superSession.get()
  if (sup && !sup.partner) return <Navigate to="/choose-partner" replace />

  if (!isAuthenticated) {
    return <Navigate to={sup ? '/super-admin' : '/login'} state={{ from: location }} replace />
  }

  return <>{children}</>
}
