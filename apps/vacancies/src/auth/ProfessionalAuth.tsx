import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { apiRequest } from '@/api/client'
import {
  fetchMe,
  isAuthError,
  loginProfessional,
  refreshSession,
  registerProfessional,
  revokeSession,
  updateMe,
  type Authed,
  type Professional,
  type ProfileInput,
  type RegisterInput,
  type Session,
} from '@/api/professionals.api'

const STORAGE_KEY = 'reserva-vacancies-session'

interface StoredSession {
  accessToken: string
  refreshToken: string
}

function read(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    return parsed?.accessToken && parsed?.refreshToken ? parsed : null
  } catch {
    // Blocked storage or a corrupted value: treat it as signed out rather than
    // throwing on the first render of a public page.
    return null
  }
}

function write(session: StoredSession | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore — a session that cannot be persisted still works for this tab */
  }
}

interface AuthValue {
  professional: Professional | null
  /** True until the stored session has been checked. */
  loading: boolean
  signedIn: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  updateProfile: (input: ProfileInput) => Promise<void>
  logout: () => void
  /** Authenticated request helper, with one transparent refresh on a 401. */
  authed: Authed
}

const Ctx = createContext<AuthValue | null>(null)

/**
 * The signed-in professional, for the whole app.
 *
 * Deliberately small: tokens in localStorage, the profile in memory, and one
 * refresh attempt on a 401. There is no store library here and this does not
 * justify introducing one — the board itself is entirely unauthenticated, and
 * this state belongs to a handful of routes at its edge.
 *
 * Note what is NOT here: nothing about salons. A professional session cannot
 * reach a partner route even if it tried — the token is typed
 * `professional-access` and the tenant guard refuses it — so this provider has
 * no notion of the other side of the market at all.
 */
export function ProfessionalAuthProvider({ children }: { children: ReactNode }) {
  const [professional, setProfessional] = useState<Professional | null>(null)
  const [loading, setLoading] = useState(true)

  // Held in a ref as well as storage so `authed` can read the current token
  // without being rebuilt (and re-running every effect that depends on it)
  // each time a refresh rotates the pair.
  const tokens = useRef<StoredSession | null>(read())

  const setSession = useCallback((session: Session | null) => {
    if (session) {
      tokens.current = {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      }
      write(tokens.current)
      setProfessional(session.professional)
    } else {
      tokens.current = null
      write(null)
      setProfessional(null)
    }
  }, [])

  /*
   * One authenticated request, with a single refresh retry.
   *
   * A single retry, not a loop: if the refreshed token is also rejected, the
   * session is genuinely over and retrying again would spin. Concurrent 401s
   * are not collapsed — this app makes at most one authenticated call at a
   * time, and the machinery for that belongs in the backoffice client where it
   * earns its weight.
   */
  const authed = useCallback<Authed>(async <T,>(path: string, init?: RequestInit) => {
    const current = tokens.current
    if (!current) throw new Error('Not signed in')

    const withAuth = (token: string): RequestInit => ({
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}` },
    })

    try {
      return await apiRequest<T>(path, withAuth(current.accessToken))
    } catch (err) {
      if (!isAuthError(err)) throw err

      let refreshed: Session
      try {
        refreshed = await refreshSession(current.refreshToken)
      } catch {
        // The refresh token is spent or revoked: sign out rather than leave a
        // half-dead session that fails every call from here on.
        tokens.current = null
        write(null)
        setProfessional(null)
        throw err
      }

      tokens.current = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      }
      write(tokens.current)
      setProfessional(refreshed.professional)
      return await apiRequest<T>(path, withAuth(refreshed.accessToken))
    }
  }, [])

  // Resolve the stored session once, on mount.
  useEffect(() => {
    let cancelled = false
    if (!tokens.current) {
      setLoading(false)
      return
    }
    fetchMe(authed)
      .then((me) => {
        if (!cancelled) setProfessional(me)
      })
      .catch(() => {
        // `authed` has already cleared a dead session; anything else (an API
        // outage) simply leaves the visitor signed out for now.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authed])

  const login = useCallback(
    async (identifier: string, password: string) => {
      setSession(await loginProfessional(identifier, password))
    },
    [setSession],
  )

  const register = useCallback(
    async (input: RegisterInput) => {
      setSession(await registerProfessional(input))
    },
    [setSession],
  )

  const updateProfile = useCallback(
    async (input: ProfileInput) => {
      setProfessional(await updateMe(authed, input))
    },
    [authed],
  )

  const logout = useCallback(() => {
    const refreshToken = tokens.current?.refreshToken
    setSession(null)
    // Fire and forget: the local session is already gone, and a failed revoke
    // must not keep someone looking signed in on their own screen.
    if (refreshToken) void revokeSession(refreshToken).catch(() => {})
  }, [setSession])

  const value = useMemo(
    () => ({
      professional,
      loading,
      signedIn: professional !== null,
      login,
      register,
      updateProfile,
      logout,
      authed,
    }),
    [professional, loading, login, register, updateProfile, logout, authed],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useProfessionalAuth(): AuthValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useProfessionalAuth must be used within <ProfessionalAuthProvider>')
  return ctx
}
