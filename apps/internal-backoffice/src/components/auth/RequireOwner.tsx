import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useIsOwner } from '@/store/auth.store'

/** Owner-only routes (platform staff management). Operators are redirected home. */
export function RequireOwner({ children }: { children: ReactNode }) {
  const isOwner = useIsOwner()
  if (!isOwner) return <Navigate to="/" replace />
  return <>{children}</>
}
