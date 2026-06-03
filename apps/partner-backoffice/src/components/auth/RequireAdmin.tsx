import { Navigate } from 'react-router-dom'
import { useIsAdmin } from '@/store/auth.hooks'

/** Gate admin-only routes. Managers are bounced to the dashboard. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const isAdmin = useIsAdmin()
  if (!isAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}
