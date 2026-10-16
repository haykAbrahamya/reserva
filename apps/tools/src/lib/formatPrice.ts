import { AMD_SIGN, fmtServicePrice } from '@reserva/shared'

const AMOUNT = /^\d[\d\s.,]*$/
const RANGE = /^(\d[\d\s.,]*?)\s*[-–—]\s*(\d[\d\s.,]*)$/

const toNumber = (digits: string) => Number(digits.replace(/\D/g, ''))

/** A typed price as numbers: one amount, or a range from `low` up to `high`. */
export interface PriceAmount {
  low: number
  high?: number
}

/**
 * The numbers in a typed price, or null when it is not one: words ("from
 * 5000"), or a range that does not go up ("8000-5000").
 */
function parsePrice(raw: string): PriceAmount | null {
  const value = raw.trim()
  const range = RANGE.exec(value)
  if (range) {
    const [low, high] = [toNumber(range[1]), toNumber(range[2])]
    return low < high ? { low, high } : null
  }
  return AMOUNT.test(value) ? { low: toNumber(value) } : null
}

/**
 * An amount the way a Reserva booking page shows it: "5 000 ֏", "5 000 – 8 000 ֏".
 * Without the sign, the same digits: a crossed-out old price next to the new
 * one names the currency once.
 */
export function formatAmount(amount: PriceAmount, { sign = true }: { sign?: boolean } = {}): string {
  const text =
    amount.high === undefined
      ? fmtServicePrice({ price: amount.low })
      : fmtServicePrice({ price: amount.low, priceType: 'range', priceMax: amount.high })
  return sign ? text : text.replace(` ${AMD_SIGN}`, '')
}

/**
 * A typed price as it should read on an image, formatted exactly the way a
 * Reserva booking page formats it (the shared formatter does both):
 *
 *   "5000"       → "5 000 ֏"
 *   "5000-8000"  → "5 000 – 8 000 ֏"
 *   "from 5000"  → "from 5000"   (any words: kept exactly as typed)
 */
export function formatPrice(raw: string): string {
  const value = raw.trim()
  const amount = parsePrice(value)
  return amount ? formatAmount(amount) : value
}
