import * as Sentry from '@sentry/react'

/**
 * Initialize Sentry for the public client app. No-op when VITE_SENTRY_DSN is
 * unset (local dev stays clean). Call once before rendering.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENV || 'production',
    // We only care about crashes/errors for now — no performance tracing
    // (keeps us well within the free tier).
    tracesSampleRate: 0,
    // Drop common browser-extension / network noise so the quota stays signal.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications.',
      'Non-Error promise rejection captured',
      /Failed to fetch/i,
      /NetworkError/i,
      /Load failed/i,
    ],
    denyUrls: [/extensions\//i, /^chrome-extension:\/\//i, /^moz-extension:\/\//i],
    beforeSend(event) {
      // Never ship cookies (may contain session hints).
      if (event.request) delete event.request.cookies
      return event
    },
  })
}

export { Sentry }
