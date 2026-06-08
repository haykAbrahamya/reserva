import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlatformRole = 'owner' | 'operator'

export interface PlatformUser {
  id: string
  name: string
  email: string
  role: PlatformRole
  mustChangePassword: boolean
}

interface AuthState {
  user: PlatformUser | null
  isAuthenticated: boolean
  setUser: (user: PlatformUser | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'reserva-platform-auth',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    },
  ),
)

/** Convenience selector: is the current operator an owner? */
export const useIsOwner = () => useAuthStore((s) => s.user?.role === 'owner')
