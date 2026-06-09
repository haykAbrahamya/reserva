import type { AuthUser } from '@/store/auth.store'
import { apiPost, apiGet, tokenStore } from './http'
import { disablePush } from './push.service'

// ── API response shapes ──
interface ApiUser {
  id: string
  name: string
  email: string
  phone: string
  role: 'admin' | 'manager'
  partnerId: string
  locationId: string | null
  mustChangePassword: boolean
}
interface AuthResult {
  accessToken: string
  refreshToken: string
  user: ApiUser
}

export interface LoginResult {
  token: string
  user: AuthUser
}

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    partnerId: u.partnerId,
    locationId: u.locationId,
  }
}

export const authService = {
  /** Log in with email OR phone + password. Persists both tokens. */
  async login(login: string, password: string): Promise<LoginResult> {
    const res = await apiPost<AuthResult>('/auth/login', { login, password })
    tokenStore.set(res.accessToken, res.refreshToken)
    return { token: res.accessToken, user: toAuthUser(res.user) }
  },

  async logout(): Promise<void> {
    // Remove this device's push subscription BEFORE clearing tokens — the
    // unsubscribe endpoint is authenticated, and we don't want booking
    // notifications to keep arriving on a logged-out phone.
    try {
      await disablePush()
    } catch {
      /* best-effort */
    }

    const refreshToken = tokenStore.refresh
    if (refreshToken) {
      try {
        await apiPost('/auth/logout', { refreshToken })
      } catch {
        /* ignore — clear locally regardless */
      }
    }
    tokenStore.clear()
  },

  /** Re-fetch the current user (e.g. on app load with a stored token). */
  async me(): Promise<AuthUser> {
    const u = await apiGet<ApiUser>('/auth/me')
    return toAuthUser(u)
  },
}
