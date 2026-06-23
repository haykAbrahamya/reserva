import { ApiError } from './http'

// ─────────────────────────────────────────────────────────────
// Friendly, English error messages for the internal console (single-language).
// Switches on the backend's stable `code`, never the raw dev `message`.
// ─────────────────────────────────────────────────────────────

const MESSAGES: Record<string, string> = {
  VALIDATION_FAILED: 'Please check the form and try again.',
  NOT_FOUND: 'That item could no longer be found.',
  INTERNAL: 'Something went wrong on our side. Please try again.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  UPLOAD_FAILED: 'The file couldn’t be uploaded. Please try again.',
  UNAUTHENTICATED: 'Your session expired. Please sign in again.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  TOKEN_EXPIRED: 'Your session expired. Please sign in again.',
  TOKEN_INVALID: 'Your session is invalid. Please sign in again.',
  FORBIDDEN: 'You don’t have permission to do that.',
  WRONG_CURRENT_PASSWORD: 'The current password is incorrect.',
  SLUG_TAKEN: 'That slug is already taken.',
  EMAIL_TAKEN: 'That email is already in use.',
  PHONE_TAKEN: 'That phone number is already in use.',
  LOCATION_HAS_SPECIALISTS: 'Move or remove this branch’s specialists first.',
  NETWORK: 'Can’t reach the server. Check your connection and try again.',
}

/** Friendly message for any thrown error (code-based, with safe fallback). */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'NETWORK' || err.status === 0) return MESSAGES.NETWORK
    return MESSAGES[err.code] ?? 'Something went wrong. Please try again.'
  }
  return 'Something went wrong. Please try again.'
}

/** Zod field errors from a VALIDATION_FAILED response: { field: message }. */
export function fieldErrorsFrom(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || err.code !== 'VALIDATION_FAILED') return {}
  const fe = (err.details as { fieldErrors?: Record<string, string[]> } | undefined)?.fieldErrors
  if (!fe) return {}
  const out: Record<string, string> = {}
  for (const [k, msgs] of Object.entries(fe)) if (msgs?.length) out[k] = msgs[0]
  return out
}
