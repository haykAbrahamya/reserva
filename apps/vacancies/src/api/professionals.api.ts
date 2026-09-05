import { ApiError, apiRequest } from './client'

// ─────────────────────────────────────────────────────────────
// Professional accounts — the job-seeking side of the board.
//
// A separate realm from the salon side, all the way down: its own table, its
// own tokens (typed `professional-access`, so one can never authenticate a
// partner route), and its own endpoints under /professionals. Nothing here can
// reach a salon's data, by construction rather than by check.
// ─────────────────────────────────────────────────────────────

export interface Professional {
  id: string
  name: string
  phone: string
  /** Empty when they registered with a phone only, which many do. */
  email: string
  specialtyKeys: string[]
  areaKeys: string[]
  experienceYears: number | null
  about: string
  cvUrl: string
  locale: string
}

export interface Session {
  accessToken: string
  refreshToken: string
  professional: Professional
}

export interface RegisterInput {
  name: string
  phone: string
  email?: string
  password: string
  specialtyKeys?: string[]
  areaKeys?: string[]
  experienceYears?: number | null
  about?: string
  locale?: string
}

export interface ProfileInput {
  name?: string
  phone?: string
  email?: string
  specialtyKeys?: string[]
  areaKeys?: string[]
  experienceYears?: number | null
  about?: string
  locale?: string
}

/** One application this account has made, as the account sees it. */
export interface MyApplication {
  id: string
  status: 'new' | 'contacted' | 'shortlisted' | 'rejected'
  createdAt: string
  note: string
  vacancy: {
    id: string
    title: string
    titleI18n: Record<string, string> | null
    specialty: { roleName: string; roleNameI18n: Record<string, string> | null }
    partner: { name: string; nameI18n: Record<string, string> | null }
  }
}

export function registerProfessional(input: RegisterInput): Promise<Session> {
  return apiRequest<Session>('/professionals/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/** `identifier` is an email OR a phone number — the server decides which. */
export function loginProfessional(identifier: string, password: string): Promise<Session> {
  return apiRequest<Session>('/professionals/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  })
}

export function refreshSession(refreshToken: string): Promise<Session> {
  return apiRequest<Session>('/professionals/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

export function revokeSession(refreshToken: string): Promise<void> {
  return apiRequest<void>('/professionals/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

/** Authenticated calls. `authed` is injected so this file stays free of storage. */
export function fetchMe(authed: Authed): Promise<Professional> {
  return authed<Professional>('/professionals/me')
}

export function updateMe(authed: Authed, input: ProfileInput): Promise<Professional> {
  return authed<Professional>('/professionals/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function fetchMyApplications(authed: Authed): Promise<MyApplication[]> {
  return authed<MyApplication[]>('/professionals/me/applications')
}

export type Authed = <T>(path: string, init?: RequestInit) => Promise<T>

/** True for the two failures that mean "this session is over". */
export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.code === 'TOKEN_INVALID')
}
