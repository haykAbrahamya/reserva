import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'admin' | 'manager'

export interface AuthUser {
  id: string
  name: string
  email: string
  phone: string
  role: Role
  partnerId: string
  /** Managers are scoped to a single branch. Admin = null (all locations). */
  locationId: string | null
  avatar?: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean

  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'reserva-auth',
      partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)
