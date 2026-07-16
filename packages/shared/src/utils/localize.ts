// ─────────────────────────────────────────────────────────────
// Tenant-authored content translations. A translatable field stores a base
// string (source of truth for search/sort + the always-present fallback) plus
// an optional per-language override blob. `localize` resolves the value to show
// for a given locale, falling back to the base whenever a locale is missing or
// blank. Single source of truth — used by the client and mirrored on the
// backend (separate repo).
// ─────────────────────────────────────────────────────────────

import type { LocalizedText, ContentLocale } from '../types'

export type { LocalizedText, ContentLocale }

/**
 * Resolve a translatable field for `locale`. Returns the locale's override when
 * it's a non-empty string; otherwise the base value. Defensive against a null /
 * malformed blob (older rows, bad input) — always returns a usable string.
 */
export function localize(
  base: string,
  i18n: LocalizedText | null | undefined,
  locale: ContentLocale | string,
): string {
  if (i18n && typeof i18n === 'object') {
    const v = (i18n as Record<string, unknown>)[locale]
    if (typeof v === 'string' && v.trim()) return v
  }
  return base
}

/** True when the blob has at least one non-empty translation (any locale). */
export function hasTranslations(i18n: LocalizedText | null | undefined): boolean {
  if (!i18n || typeof i18n !== 'object') return false
  return (['hy', 'en', 'ru'] as const).some((l) => {
    const v = i18n[l]
    return typeof v === 'string' && v.trim().length > 0
  })
}

/**
 * Normalize an editor's i18n input for persistence: trim every value, drop empty
 * ones, and return `null` when nothing meaningful remains (so we never store an
 * empty `{}` — a clean "no translations" signal for the DB). Never stores the
 * base locale's value if it merely duplicates the base string is left to the
 * caller; this only prunes blanks.
 */
export function cleanLocalizedInput(
  i18n: LocalizedText | null | undefined,
): LocalizedText | null {
  if (!i18n || typeof i18n !== 'object') return null
  const out: LocalizedText = {}
  let any = false
  for (const l of ['hy', 'en', 'ru'] as const) {
    const v = i18n[l]
    if (typeof v === 'string' && v.trim()) {
      out[l] = v.trim()
      any = true
    }
  }
  return any ? out : null
}
