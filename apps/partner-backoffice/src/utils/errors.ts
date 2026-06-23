import { useState, useCallback } from 'react'
import { ApiError } from '@/services/http'

// ─────────────────────────────────────────────────────────────
// Error handling helpers — turn backend error envelopes and local validation
// into friendly, localized messages. The backend returns a canonical
//   { error: { code, message, details? } }
// (see reserva-backend error-codes.ts). We switch on `code`, never show the raw
// English `message`, and map Zod `details.fieldErrors` back onto form fields.
// ─────────────────────────────────────────────────────────────

type TFn = (key: string, vars?: Record<string, string | number>) => string

/** Localized, user-facing message for any thrown error (code-based). */
export function errorMessage(err: unknown, t: TFn): string {
  if (err instanceof ApiError) {
    if (err.code === 'NETWORK' || err.status === 0) return t('errors.network')
    const key = `errors.codes.${err.code}`
    const msg = t(key)
    // If the code isn't in our catalog, t() returns the key unchanged → fall back.
    return msg === key ? t('errors.generic') : msg
  }
  return t('errors.generic')
}

/** Zod field errors from a backend VALIDATION_FAILED response: { field: msg }. */
export function fieldErrorsFrom(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError) || err.code !== 'VALIDATION_FAILED') return {}
  const details = err.details as { fieldErrors?: Record<string, string[]> } | undefined
  const fe = details?.fieldErrors
  if (!fe) return {}
  const out: Record<string, string> = {}
  for (const [field, msgs] of Object.entries(fe)) {
    if (msgs?.length) out[field] = msgs[0]
  }
  return out
}

export type Validators<T> = {
  [K in keyof T]?: (value: T[K], all: T) => string | null
}

/**
 * Form validation + error state for a form whose values are `T`.
 *
 *  - `errors`        current per-field error messages (i18n keys or literals)
 *  - `validate()`    runs local validators; returns true if valid, fills errors
 *  - `setServerErrors(err)` maps a backend VALIDATION_FAILED onto fields
 *  - `clear(field)`  clears one field's error (call on change)
 *  - `register(field)` → props for an input: { error, onClear }
 *
 * Local validators return an i18n KEY (or null). The component translates them,
 * so messages stay localized. Server field messages are already human text.
 */
export function useFormErrors<T extends Record<string, unknown>>(validators: Validators<T> = {}) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})

  const validate = useCallback(
    (values: T): boolean => {
      const next: Partial<Record<keyof T, string>> = {}
      for (const key of Object.keys(validators) as (keyof T)[]) {
        const fn = validators[key]
        if (!fn) continue
        const msg = fn(values[key], values)
        if (msg) next[key] = msg
      }
      setErrors(next)
      return Object.keys(next).length === 0
    },
    [validators],
  )

  /** Apply a backend VALIDATION_FAILED error onto the matching fields. Returns
   *  true if at least one field error was mapped (so callers can skip a toast). */
  const setServerErrors = useCallback((err: unknown): boolean => {
    const mapped = fieldErrorsFrom(err)
    const keys = Object.keys(mapped)
    if (keys.length === 0) return false
    setErrors((prev) => ({ ...prev, ...(mapped as Partial<Record<keyof T, string>>) }))
    return true
  }, [])

  const clear = useCallback((field: keyof T) => {
    setErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const clearAll = useCallback(() => setErrors({}), [])

  const setError = useCallback((field: keyof T, msg: string) => {
    setErrors((prev) => ({ ...prev, [field]: msg }))
  }, [])

  return { errors, validate, setServerErrors, clear, clearAll, setError }
}

// ── Common reusable validators (return an i18n key, or null when valid) ──
export const required = (v: unknown): string | null =>
  v == null || (typeof v === 'string' && v.trim() === '') ? 'errors.required' : null

export const minLen = (n: number) => (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length >= n ? null : 'errors.required'

export const isPhone = (v: unknown): string | null => {
  if (typeof v !== 'string' || v.trim() === '') return 'errors.required'
  return v.replace(/\D/g, '').length >= 6 ? null : 'errors.invalid'
}

export const isEmail = (v: unknown): string | null => {
  if (typeof v !== 'string' || v.trim() === '') return 'errors.required'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'errors.invalid'
}

export const positiveNumber = (v: unknown): string | null => {
  const n = Number(v)
  if (v === '' || v == null || Number.isNaN(n)) return 'errors.required'
  return n > 0 ? null : 'errors.invalid'
}
