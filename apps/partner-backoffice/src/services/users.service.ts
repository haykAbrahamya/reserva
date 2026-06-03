import type { AuthUser, Role } from '@/store/auth.store'

// ─────────────────────────────────────────────────────────────
// Mock user registry. This is the single source of truth for who
// can log in (auth.service reads from it) AND the data behind the
// admin Users page. Swap for real API calls later.
// ─────────────────────────────────────────────────────────────

export interface ManagedUser extends AuthUser {
  /** The login password. For managers this is the one-time password
   *  generated at creation; for seeded demo accounts it's a fixed demo pw. */
  password: string
  /** Where the OTP was delivered (mock). */
  otpChannel?: 'phone' | 'email'
  createdAtISO: string
}

// Seeded accounts (one admin + one manager per the Antheris demo partner).
const SEED: ManagedUser[] = [
  {
    id: 'usr-admin-ant',
    name: 'Armen Petrosyan',
    email: 'admin@antheris.am',
    phone: '+374 91 10 10 10',
    role: 'admin',
    partnerId: 'antheris',
    locationId: null,
    password: 'demo1234',
    createdAtISO: '2025-01-10T09:00:00.000Z',
  },
  {
    id: 'usr-mgr-ant-arabkir',
    name: 'Nare Avetisyan',
    email: 'manager@antheris.am',
    phone: '+374 91 20 20 20',
    role: 'manager',
    partnerId: 'antheris',
    locationId: 'ant-arabkir',
    password: 'demo1234',
    createdAtISO: '2025-02-01T09:00:00.000Z',
  },
  {
    id: 'usr-admin-bb',
    name: 'Armen Grigoryan',
    email: 'admin@barberbro.am',
    phone: '+374 93 30 30 30',
    role: 'admin',
    partnerId: 'barberbro',
    locationId: null,
    password: 'demo1234',
    createdAtISO: '2025-01-15T09:00:00.000Z',
  },
]

let _users: ManagedUser[] = [...SEED]

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms))

/** Strip the password before exposing a user outside the auth boundary. */
function publicUser(u: ManagedUser): AuthUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = u
  return rest
}

/** Generate a friendly one-time password (no ambiguous chars). */
function generateOtp(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export interface CreateManagerInput {
  partnerId: string
  name: string
  phone: string
  email: string
  locationId: string
  /** Where the OTP should be "sent". */
  otpChannel: 'phone' | 'email'
}

export interface CreateManagerResult {
  user: AuthUser
  /** The generated one-time password (mock surfaces it so it can be tested). */
  otp: string
}

export const usersService = {
  /** Internal: used by auth.service to validate logins. */
  _findByLogin(login: string, password: string): ManagedUser | undefined {
    const id = login.toLowerCase().trim()
    const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
    return _users.find(
      u =>
        (u.email.toLowerCase() === id || norm(u.phone) === norm(login)) &&
        u.password === password
    )
  },

  /** Managers (and admins) belonging to a partner — admin Users page. */
  async listManagers(partnerId: string): Promise<AuthUser[]> {
    await delay()
    return _users
      .filter(u => u.partnerId === partnerId && u.role === 'manager')
      .map(publicUser)
  },

  async createManager(input: CreateManagerInput): Promise<CreateManagerResult> {
    await delay(600)
    const otp = generateOtp()
    const user: ManagedUser = {
      id: `usr-mgr-${Date.now()}`,
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      role: 'manager',
      partnerId: input.partnerId,
      locationId: input.locationId,
      password: otp,
      otpChannel: input.otpChannel,
      createdAtISO: new Date().toISOString(),
    }
    _users = [..._users, user]
    return { user: publicUser(user), otp }
  },

  async removeManager(id: string): Promise<void> {
    await delay()
    _users = _users.filter(u => u.id !== id)
  },

  /** Change a user's own password (any role). Validates the current one. */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await delay(600)
    const u = _users.find(x => x.id === userId)
    if (!u) throw new Error('not-found')
    if (u.password !== currentPassword) throw new Error('wrong-current')
    u.password = newPassword
  },
}

export { generateOtp }
export type { Role }
