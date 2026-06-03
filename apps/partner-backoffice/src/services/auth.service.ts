import type { AuthUser } from '@/store/auth.store'
import { usersService } from './users.service'

const delay = (ms = 800) => new Promise(r => setTimeout(r, ms))

export interface LoginResult {
  token: string
  user: AuthUser
}

export const authService = {
  /**
   * Log in with an email OR phone number plus password. Managers created by
   * an admin use their one-time password here. Reads from the shared mock
   * user registry (users.service) so newly created managers can sign in.
   */
  async login(login: string, password: string): Promise<LoginResult> {
    await delay()

    const found = usersService._findByLogin(login, password)
    if (!found) {
      throw new Error('Invalid credentials. Check the email/phone and password.')
    }

    const token = `mock-token-${found.id}-` + Math.random().toString(36).slice(2)
    // Strip the password out of the returned user object.
    const { password: _pw, otpChannel: _c, createdAtISO: _d, ...user } = found
    return { token, user }
  },

  async logout(): Promise<void> {
    await delay(300)
  },
}
