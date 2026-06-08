import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { tokenStore } from '@/services/http'

/** Gate protected routes — requires a token + authenticated session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated || !tokenStore.access) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
