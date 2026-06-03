import { useAuthStore } from './auth.store'

/** The current user's role, or null when logged out. */
export function useRole() {
  return useAuthStore(s => s.user?.role ?? null)
}

export function useIsAdmin() {
  return useAuthStore(s => s.user?.role === 'admin')
}

export function useIsManager() {
  return useAuthStore(s => s.user?.role === 'manager')
}

/**
 * The location the current view is scoped to:
 *  - manager  → their assigned branch id
 *  - admin    → null (sees every location)
 *
 * This is the single source of truth every location-aware feature reads.
 */
export function useScopedLocationId(): string | null {
  return useAuthStore(s => (s.user?.role === 'manager' ? s.user.locationId : null))
}
