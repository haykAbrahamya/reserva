// ─────────────────────────────────────────────────────────────
// The board's HTTP client.
//
// Plain fetch, no axios. Every call here is an unauthenticated GET (plus one
// POST), so none of the machinery the backoffice client exists for — bearer
// tokens, transparent refresh, collapsing concurrent 401s — has anything to do
// here. Bringing it along would add a dependency to a public page whose
// first-paint weight is the thing that matters most.
// ─────────────────────────────────────────────────────────────

/*
 * Absolute in production, baked at build time from .env.production; RELATIVE in
 * development, where the vite proxy forwards /api to the backend.
 *
 * The relative fallback is for development only. A production build cannot
 * reach it: `requireEnv` in vite.config.ts fails the build when VITE_API_URL is
 * missing or not absolute — because this app is served from a different host
 * than the API, and that host answers 200 for every unknown path.
 */
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

/** Origin of the API, for resolving same-origin `/uploads/..` logo paths. */
const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin
  } catch {
    return ''
  }
})()

/**
 * Logos are stored either as absolute URLs or as `/uploads/..` paths relative
 * to the API ORIGIN — not to this app's origin, which is a different host.
 * Resolving in one place stops half the UI showing a broken image.
 */
export function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

/** A typed failure carrying the backend's stable error code. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string }
}

/**
 * Unwrap the API's `{ data }` envelope.
 *
 * Paginated payloads arrive as `{ data: { items, page, ... } }` and single
 * resources as `{ data: <resource> }`, so one unwrap serves both.
 */
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

/**
 * The one request path.
 *
 * Exported so the professional-session layer can add a bearer token and a
 * refresh retry ON TOP of it rather than beside it — everything below (the
 * envelope unwrap, the abort handling, and especially the NOT_JSON guard that
 * caught the missing VITE_API_URL) has to apply to authenticated calls too, and
 * a second copy of it would drift.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch (err) {
    // An aborted request is a normal part of a filter panel's life (the visitor
    // moved a slider again), so it must stay distinguishable from a real
    // network failure rather than being reported as one.
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError('NETWORK', 'Network request failed', 0)
  }

  if (!res.ok) {
    let code = 'UNKNOWN'
    let message = res.statusText
    try {
      const body = (await res.json()) as ErrorEnvelope
      code = body.error?.code ?? code
      message = body.error?.message ?? message
    } catch {
      // A non-JSON error body (a proxy's 502 page) is still a failure; the
      // status is what matters and we already have it.
    }
    throw new ApiError(code, message, res.status)
  }

  /*
   * A 200 is not proof that the API answered.
   *
   * When this app first went live it had no baked VITE_API_URL, so it asked its
   * OWN origin for /api/v1/board/meta — and nginx's SPA fallback served
   * index.html with HTTP 200. Devtools showed two green requests while the page
   * reported a load failure, and the misleading part was the network panel, not
   * the page: 200 text/html is indistinguishable from a working API until
   * something tries to parse it.
   *
   * So the content type is checked, and the failure names the URL that was
   * actually reached. Whoever sees this next gets the answer instead of a
   * SyntaxError about an unexpected '<'.
   */
  const contentType = res.headers.get('content-type') ?? ''
  if (!/\bapplication\/json\b/i.test(contentType)) {
    throw new ApiError(
      'NOT_JSON',
      `Expected JSON from ${url} but the server sent "${contentType || 'no content-type'}". ` +
        `This usually means the request never reached the API — check that ` +
        `VITE_API_URL was baked into this build.`,
      res.status,
    )
  }

  return unwrap<T>(await res.json())
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { signal })
}

export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body), signal })
}

/** True for the abort every in-flight-request cleanup produces. */
export function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}
