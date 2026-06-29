// ─────────────────────────────────────────────────────────────
// Self-serve signup API (public). Starts a registration → backend emails an
// activation magic link → the link lands on backoffice and auto-logs in.
// ─────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

export class SignupApiError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const err = json?.error
    throw new SignupApiError(err?.code ?? 'NETWORK', err?.message ?? 'Request failed')
  }
  return (json?.data ?? json) as T
}

export interface SignupInput {
  companyName: string
  companyType: string
  /** 'salon' (team) or 'single' (solo professional). */
  kind?: 'salon' | 'single'
  accent: string
  /** Optional public handle; omitted → partner created without one. */
  slug?: string
  adminName: string
  adminEmail: string
  adminPhone: string
  password: string
}

export const signupService = {
  /** Start signup — backend emails an activation link. Returns the email. */
  async start(input: SignupInput): Promise<{ email: string }> {
    return api<{ email: string }>('/public/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
}
