import type { LocalizedText } from '../types'

/**
 * A specialist name as the salon wants it SHOWN. Salons that type names surname
 * first ("Aghajanyan Mari") turn on `specialistNamesSurnameFirst`, and every
 * name is then shown given-name first ("Mari Aghajanyan"): the first word moves
 * to the end. One-word names are left alone. Display-only — never write the
 * result back (edit forms must keep the name as typed).
 *
 * Mirrors `displayPersonName` in reserva-backend (notifications) — keep in step.
 */
export function displayPersonName(name: string, surnameFirst?: boolean | null): string {
  const trimmed = name.trim()
  if (!surnameFirst) return trimmed
  const parts = trimmed.split(/\s+/)
  return parts.length < 2 ? trimmed : [...parts.slice(1), parts[0]].join(' ')
}

/** A localizer as returned by the apps' `useLocalized()`. */
type Localizer = (base: string, i18n?: LocalizedText | null) => string

/**
 * The one way to show a specialist's name: in the UI language first, then in
 * the salon's name order. Bookings embed only the base `name` (no `nameI18n`) —
 * pass what you have; the order rule still applies.
 */
export function specialistDisplayName(
  sp: { name: string; nameI18n?: LocalizedText | null },
  loc: Localizer,
  surnameFirst?: boolean | null,
): string {
  return displayPersonName(loc(sp.name, sp.nameI18n), surnameFirst)
}
