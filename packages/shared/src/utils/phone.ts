// ─────────────────────────────────────────────────────────────
// Phone format used across Reserva: E.164-style — a leading "+" followed by
// 7–15 digits, NO spaces, dashes, or parentheses. e.g. +37493813296
// ─────────────────────────────────────────────────────────────

export const PHONE_REGEX = /^\+[1-9]\d{6,14}$/

/** True if the value is a valid Reserva phone ("+" + 7–15 digits, no symbols). */
export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value.trim())
}

/**
 * Strip everything except digits and a single leading "+". Useful to clean
 * pasted input ("+374 93 813-296" → "+37493813296") before validating/saving.
 */
export function normalizePhoneInput(value: string): string {
  const trimmed = value.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return (hasPlus ? '+' : '') + digits
}
