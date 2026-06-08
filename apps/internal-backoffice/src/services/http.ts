import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

// ─────────────────────────────────────────────────────────────
// API client for the Reserva platform (internal-backoffice) endpoints.
// - Base URL from VITE_API_URL (defaults to the local API under /api/v1).
// - Attaches the platform access token; refreshes on 401 and retries once.
// - Unwraps the standard `{ data }` envelope so callers get the payload.
// ─────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

const ACCESS_KEY = 'reserva-platform-access'
const REFRESH_KEY = 'reserva-platform-refresh'

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/** A typed error surfaced from the API's `{ error: { code, message } }`. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
  }
}

const http = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Transparent refresh on 401 ──
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh
  if (!refresh) return null
  try {
    const res = await axios.post(`${API_URL}/platform/auth/refresh`, { refreshToken: refresh })
    const { accessToken, refreshToken } = res.data.data
    tokenStore.set(accessToken, refreshToken)
    return accessToken
  } catch {
    tokenStore.clear()
    return null
  }
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ error?: { code: string; message: string; details?: unknown } }>) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean }
    const status = error.response?.status ?? 0
    const body = error.response?.data?.error

    const isAuthRoute = original?.url?.includes('/auth/')
    if (status === 401 && !original?._retried && !isAuthRoute) {
      original._retried = true
      refreshing = refreshing ?? refreshAccessToken()
      const newToken = await refreshing
      refreshing = null
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` }
        return http(original)
      }
      tokenStore.clear()
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login'
    }

    throw new ApiError(
      body?.code ?? 'NETWORK',
      body?.message ?? error.message ?? 'Request failed',
      status,
      body?.details,
    )
  },
)

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.get(url, config)
  return unwrap<T>(res.data)
}
export async function apiPost<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await http.post(url, body, config)
  return unwrap<T>(res.data)
}
export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.patch(url, body)
  return unwrap<T>(res.data)
}
export async function apiDelete(url: string): Promise<void> {
  await http.delete(url)
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export default http
