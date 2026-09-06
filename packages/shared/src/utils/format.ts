// ─────────────────────────────────────────────────────────────
// Shared formatters — currency, dates, durations, initials.
// Used across all Reserva apps and by @reserva/ui components.
// ─────────────────────────────────────────────────────────────

/** Armenian dram sign (U+058F). NOT the tögrög sign ₮ (U+20AE) — some ICU builds
 *  wrongly render ₮ for `currency: 'AMD'`, so we append this literal ourselves. */
export const AMD_SIGN = '֏'

export function fmtAMD(amount: number): string {
  // Format the number only (grouping, no fraction) and append ֏ ourselves, so
  // the symbol is deterministic across runtimes/ICU versions.
  const n = new Intl.NumberFormat('hy-AM', { maximumFractionDigits: 0 }).format(amount)
  return `${n} ${AMD_SIGN}`
}

/**
 * Format a service's price for display: a single amount for fixed pricing, or a
 * "min – max" range (en-dash) when the service is range-priced. Shared by the
 * client page, booking flow and backoffice so pricing reads identically.
 */
export function fmtServicePrice(
  svc: {
    price: number | null
    priceType?: 'fixed' | 'range'
    priceMax?: number | null
    hidePrice?: boolean
  },
  /**
   * What to show when the salon has withheld the price — "Price on request",
   * translated by the caller.
   *
   * A label rather than a hardcoded string, because this package has no i18n
   * and inventing one here would put English on an Armenian page. The same
   * arrangement as `fmtCoursePrice`, which already takes its "free" label.
   */
  hiddenLabel = '',
): string {
  /*
   * Two ways to arrive here without a number, and both mean the same thing to a
   * reader. `hidePrice` is the salon's choice; a null `price` is the server
   * having acted on it. Checking both means a payload that carries one without
   * the other still cannot print a figure — or, worse, "NaN ֏".
   */
  if (svc.hidePrice || svc.price == null) return hiddenLabel

  if (svc.priceType === 'range' && svc.priceMax != null) {
    // Currency once, at the end: "1,000 – 6,000 ֏". Compact and unambiguous —
    // avoids the awkward "AMD 1,000 – AMD 6,000" that overflowed tight cards.
    const nf = new Intl.NumberFormat('hy-AM', { maximumFractionDigits: 0 })
    return `${nf.format(svc.price)} – ${nf.format(svc.priceMax)} ${AMD_SIGN}`
  }
  return fmtAMD(svc.price)
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Format a Date as a LOCAL 'YYYY-MM-DD' (the calendar day the user sees).
 *
 * NOTE: must use local parts, NOT toISOString() — toISOString converts to UTC,
 * which in east-of-UTC timezones (e.g. Armenia, UTC+4) rolls a local-midnight
 * date back to the previous day, producing an off-by-one in date pickers.
 */
export function fmtDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Unit labels for {@link fmtDuration}. Defaults to English so non-localized
 * callers (e.g. backoffice) keep their current output; the client app passes
 * translated labels from its i18n bundle.
 */
export interface DurationLabels {
  /** Minutes unit, e.g. "min" / "րոպե" / "мин". */
  min: string
  /** Hours unit, e.g. "h" / "ժ" / "ч". */
  h: string
}

export function fmtDuration(minutes: number, labels: DurationLabels = { min: 'min', h: 'h' }): string {
  if (minutes < 60) return `${minutes} ${labels.min}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}${labels.h} ${m}${labels.min}` : `${h}${labels.h}`
}

export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}
