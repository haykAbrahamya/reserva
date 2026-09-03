/**
 * "Posted 3 days ago", in the visitor's language.
 *
 * Uses `Intl.RelativeTimeFormat`, which every target browser has, rather than a
 * date library or hand-written plural rules. That matters more than usual here:
 * Armenian and Russian both inflect the noun by count («2 օր առաջ», «5 дней
 * назад»), and Intl already knows those rules. Hand-rolling them is how a board
 * ends up saying "5 день назад".
 */
export function relativeTime(iso: string | null, locale: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const seconds = Math.round((then - Date.now()) / 1000)
  const abs = Math.abs(seconds)

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  // Largest unit that still gives a number a person can hold: "3 weeks"
  // rather than "21 days".
  if (abs < 60) return rtf.format(Math.round(seconds), 'second')
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour')
  if (abs < 604_800) return rtf.format(Math.round(seconds / 86_400), 'day')
  if (abs < 2_592_000) return rtf.format(Math.round(seconds / 604_800), 'week')
  return rtf.format(Math.round(seconds / 2_592_000), 'month')
}

/** Whole days from now until `iso`, negative once it has passed. */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86_400_000)
}
