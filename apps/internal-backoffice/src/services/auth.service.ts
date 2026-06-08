import { apiGet, apiPost, tokenStore } from './http'
import type { PlatformUser } from '@/store/auth.store'

interface AuthResult {
  accessToken: string
  refreshToken: string
  user: PlatformUser
}

export const authService = {
  async login(email: string, password: string): Promise<PlatformUser> {
    const res = await apiPost<AuthResult>('/platform/auth/login', { email, password })
    tokenStore.set(res.accessToken, res.refreshToken)
    return res.user
  },

  async me(): Promise<PlatformUser> {
    return apiGet<PlatformUser>('/platform/auth/me')
  },

  async logout(): Promise<void> {
    const refreshToken = tokenStore.refresh
    if (refreshToken) {
      try {
        await apiPost('/platform/auth/logout', { refreshToken })
      } catch {
        // best-effort; clear locally regardless
      }
    }
    tokenStore.clear()
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiPost('/platform/auth/change-password', { currentPassword, newPassword })
  },
}
