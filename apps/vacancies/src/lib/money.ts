import { AMD_SIGN, fmtAMD } from '@reserva/shared'

// ─────────────────────────────────────────────────────────────
// Money, as a board has to show it.
//
// `fmtAMD` from @reserva/shared stays the one formatter for a full figure. What
// is added here is the COMPACT form, which only a board needs: a range slider
// and a card badge have room for "250K" and not for "250 000 ֏", and a filter
// whose numbers wrap is a filter nobody uses.
// ─────────────────────────────────────────────────────────────

export { AMD_SIGN, fmtAMD }

/**
 * Short money for tight places: 250000 -> "250K", 1200000 -> "1.2M".
 *
 * Thousands are floored rather than rounded on purpose. A rent shown as "150K"
 * that is really 150,900 is a rounding error; one shown as "150K" that is
 * really 149,500 is a number the visitor will feel misled about when they open
 * the listing. Under 1000 prints in full — there is no shorter honest form.
 */
export function fmtCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000
    // One decimal, but never a bare ".0".
    return `${(Math.floor(m * 10) / 10).toString().replace(/\.0$/, '')}M`
  }
  if (amount >= 1_000) return `${Math.floor(amount / 1_000)}K`
  return String(amount)
}

/** Compact plus the dram sign — for slider ends and chips. */
export function fmtCompactAMD(amount: number): string {
  return `${fmtCompact(amount)} ${AMD_SIGN}`
}

/**
 * Group digits with a NARROW NO-BREAK SPACE rather than a comma.
 *
 * "180 000" is both the Armenian convention and visibly calmer than
 * "180,000" — a comma inside a large figure reads as punctuation and breaks
 * the number into two words. The space is no-break, so a price can never wrap
 * between its thousands.
 *
 * Intl gives a comma for hy-AM, so the separator is substituted afterwards.
 */
const GROUP = ' '

export function fmtGrouped(amount: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
    .format(amount)
    .replace(/,/g, GROUP)
}

/**
 * The DIGITS of a figure or a band, with no currency sign.
 *
 * The sign is returned separately by `paySummary` so it can be set smaller and
 * lighter than the number: at the same size and weight it competes with the
 * figure, which is the one thing on a card that has to be read first.
 */
export function fmtAmountRange(low: number, high?: number | null): string {
  if (high == null || high === low) return fmtGrouped(low)
  return `${fmtGrouped(low)} – ${fmtGrouped(high)}`
}

/** A percentage or a band of them, WITHOUT the sign: "40" or "40–50". */
export function fmtPercentRange(low: number, high?: number | null): string {
  if (high == null || high === low) return String(low)
  return `${low}–${high}`
}

/**
 * Round a bound outwards to a friendly step, so a slider's ends are round
 * numbers instead of whatever the cheapest listing happens to charge.
 *
 * A control running from 47,500 to 312,000 looks like a bug even when it is
 * describing the data perfectly; 40,000 to 320,000 reads as a considered range
 * and still contains every listing.
 */
export function niceBounds(min: number, max: number): [number, number] {
  const span = Math.max(1, max - min)
  const step = span >= 500_000 ? 50_000 : span >= 100_000 ? 10_000 : span >= 10_000 ? 5_000 : 1_000
  return [Math.max(0, Math.floor(min / step) * step), Math.ceil(max / step) * step]
}

/** A sensible drag step for a slider spanning this much. */
export function stepFor(min: number, max: number): number {
  const span = Math.max(1, max - min)
  if (span >= 1_000_000) return 25_000
  if (span >= 200_000) return 10_000
  if (span >= 50_000) return 5_000
  if (span >= 1_000) return 1_000
  return 1
}
