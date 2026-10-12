import { fmtServicePrice } from '@reserva/shared'

const AMOUNT = /^\d[\d\s.,]*$/
const RANGE = /^(\d[\d\s.,]*?)\s*[-–—]\s*(\d[\d\s.,]*)$/

const toNumber = (digits: string) => Number(digits.replace(/\D/g, ''))

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
  if (!value) return ''

  const range = RANGE.exec(value)
  if (range) {
    const [low, high] = [toNumber(range[1]), toNumber(range[2])]
    return low < high
      ? fmtServicePrice({ price: low, priceType: 'range', priceMax: high })
      : value
  }

  if (AMOUNT.test(value)) return fmtServicePrice({ price: toNumber(value) })
  return value
}
