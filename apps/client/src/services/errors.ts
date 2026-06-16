// ─────────────────────────────────────────────────────────────
// Maps backend error codes → friendly, localized message keys.
//
// The backend returns stable { error: { code, message } } envelopes (see
// reserva-backend error-codes.ts). The raw `message` is developer-oriented and
// English-only, so we NEVER show it directly — we translate the `code` to a
// customer-facing string. Unknown codes fall back to a generic message.
// ─────────────────────────────────────────────────────────────

/** Error codes the public client can meaningfully surface to a customer. */
const KNOWN_CODES = new Set([
  'BOOKING_OVERLAP',
  'SPECIALIST_TIME_OFF',
  'OUTSIDE_WORKING_HOURS',
  'SERVICE_NOT_OFFERED',
  'INVALID_TIME_RANGE',
  'PAST_DATE',
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'RATE_LIMITED',
  'EMAIL_TAKEN',
  'PHONE_TAKEN',
  'SLUG_TAKEN',
])

/** The i18n key for a given backend error code (or the generic fallback). */
export function errorKeyForCode(code?: string): string {
  if (code === 'NETWORK') return 'errors.network'
  if (code && KNOWN_CODES.has(code)) return `errors.codes.${code}`
  return 'errors.generic'
}

/** Translate any thrown error into a friendly, localized message.
 *  `t` is the i18n translate fn from useT(). */
export function friendlyError(err: unknown, t: (k: string) => string): string {
  const code = (err as { code?: string } | null)?.code
  return t(errorKeyForCode(code))
}
