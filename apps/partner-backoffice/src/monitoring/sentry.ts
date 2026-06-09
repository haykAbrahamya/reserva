import * as Sentry from '@sentry/react'

/**
 * Initialize Sentry for the partner-backoffice. No-op when VITE_SENTRY_DSN is
 * unset (local dev stays clean). Call once before rendering.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENV || 'production',
    tracesSampleRate: 0,
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
      if (event.request) delete event.request.cookies
      return event
    },
  })
}

export { Sentry }
