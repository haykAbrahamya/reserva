import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

// ─────────────────────────────────────────────────────────────
// Shared API client for the Reserva backend.
// - Base URL from VITE_API_URL (defaults to the local API under /api/v1).
// - Attaches the access token; transparently refreshes on 401 and retries.
// - Unwraps the standard `{ data }` envelope so callers get the payload.
// ─────────────────────────────────────────────────────────────

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

/** Origin of the API (API_URL without the /api/v1 suffix) — used by the
 *  WebSocket client, which connects to the server root + a namespace. */
export const API_ORIGIN = API_URL.replace(/\/api\/v\d+\/?$/, '')

const ACCESS_KEY = 'reserva-access'
const REFRESH_KEY = 'reserva-refresh'

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
    const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken: refresh })
    const { accessToken, refreshToken } = res.data.data
    tokenStore.set(accessToken, refreshToken)
    return accessToken
  } catch {
    tokenStore.clear()
    return null
  }
}

/**
 * Collapse concurrent 401s onto ONE refresh call.
 *
 * This matters more than it looks: the server rotates refresh tokens and revokes
 * the one it was given (revoke-on-rotation). Two refreshes that both read the
 * stored token before either writes therefore send the SAME token — the first
 * rotates it, the second presents an already-revoked token, gets 401, and the
 * `catch` above wipes the whole session. On a page that fires many requests at
 * once (the backoffice fires a dozen on load) that is exactly the intermittent
 * "logged in but no data" failure.
 *
 * The flag is cleared in `finally`, tied to the lifetime of the promise itself,
 * so a late 401 can never start a second rotation while the first is in flight.
 */
function refreshOnce(): Promise<string | null> {
  refreshing ??= refreshAccessToken().finally(() => {
    refreshing = null
  })
  return refreshing
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ error?: { code: string; message: string; details?: unknown } }>) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean }
    const status = error.response?.status ?? 0
    const body = error.response?.data?.error

    // Try one transparent refresh+retry on an expired/invalid access token.
    const isAuthRoute = original?.url?.includes('/auth/')
    if (status === 401 && !original?._retried && !isAuthRoute) {
      original._retried = true

      // This request may have been sent with a token that another request has
      // already refreshed away. Retrying with the current one costs nothing and
      // avoids a pointless extra rotation.
      const current = tokenStore.access
      const sentWith = (original.headers?.Authorization as string | undefined) ?? ''
      if (current && sentWith !== `Bearer ${current}`) {
        original.headers = { ...original.headers, Authorization: `Bearer ${current}` }
        return http(original)
      }

      const newToken = await refreshOnce()
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` }
        return http(original)
      }
      // Refresh failed → bounce to login.
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

/** GET → unwrapped payload. */
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

/** Lists return the raw paginated shape; single resources are under `data`. */
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export default http
