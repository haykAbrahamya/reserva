import type { AuthUser } from '@/store/auth.store'

// Mock credentials — swap for real API calls later
const MOCK_USERS: Array<{ email: string; password: string; user: AuthUser; token: string }> = [
  {
    email: 'armen@antheris.am',
    password: 'demo1234',
    token: 'mock-token-antheris-owner-' + Math.random().toString(36).slice(2),
    user: {
      id: 'usr-001',
      name: 'Armen Petrosyan',
      email: 'armen@antheris.am',
      role: 'owner',
      partnerId: 'antheris',
    },
  },
  {
    email: 'manager@antheris.am',
    password: 'demo1234',
    token: 'mock-token-antheris-manager-' + Math.random().toString(36).slice(2),
    user: {
      id: 'usr-002',
      name: 'Nare Avetisyan',
      email: 'manager@antheris.am',
      role: 'manager',
      partnerId: 'antheris',
    },
  },
  {
    email: 'admin@barberbro.am',
    password: 'demo1234',
    token: 'mock-token-barberbro-owner-' + Math.random().toString(36).slice(2),
    user: {
      id: 'usr-003',
      name: 'Armen Grigoryan',
      email: 'admin@barberbro.am',
      role: 'owner',
      partnerId: 'barberbro',
    },
  },
]

const delay = (ms = 800) => new Promise(r => setTimeout(r, ms))

export interface LoginResult {
  token: string
  user: AuthUser
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResult> {
    await delay()

    const found = MOCK_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password
    )

    if (!found) {
      throw new Error('Invalid email or password.')
    }

    return { token: found.token, user: found.user }
  },

  async logout(): Promise<void> {
    await delay(300)
  },
}
