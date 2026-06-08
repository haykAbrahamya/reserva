import type { AuthUser, Role } from '@/store/auth.store'
import { apiGet, apiPost, apiPatch, apiDelete } from './http'

// Managed (manager) users as returned by the API.
export interface ManagedUser extends AuthUser {
  active: boolean
  mustChangePassword: boolean
  otpChannel?: 'phone' | 'email' | null
  createdAt: string
}

export interface CreateManagerInput {
  partnerId: string
  name: string
  phone: string
  email: string
  locationId: string
  otpChannel: 'phone' | 'email'
}

export interface CreateManagerResult {
  user: AuthUser
  /** The generated one-time password — shown once so the admin can hand it over. */
  otp: string
}

export const usersService = {
  /** Managers belonging to the current partner (admin Users page). */
  async listManagers(_partnerId: string): Promise<AuthUser[]> {
    return apiGet<AuthUser[]>('/users')
  },

  async createManager(input: CreateManagerInput): Promise<CreateManagerResult> {
    return apiPost<CreateManagerResult>('/users', {
      name: input.name,
      email: input.email,
      phone: input.phone,
      locationId: input.locationId,
      otpChannel: input.otpChannel,
    })
  },

  async updateManager(id: string, patch: Partial<CreateManagerInput> & { active?: boolean }): Promise<void> {
    await apiPatch(`/users/${id}`, patch)
  },

  async removeManager(id: string): Promise<void> {
    await apiDelete(`/users/${id}`)
  },

  /** Change the current user's own password. `userId` is ignored (the API uses
   *  the authenticated user) — kept for call-site compatibility. */
  async changePassword(_userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await apiPost('/auth/change-password', { currentPassword, newPassword })
  },
}

export type { Role }
