import { AMD_SIGN } from '@reserva/shared'
import { isDay } from '@/lib/dates'
import { formatAmount } from '@/lib/formatPrice'
import { asRecord, readText } from '@/lib/storage'
import { brandText, parseBrand, type StoryBrand } from '@/lib/story/brand'
import { DEFAULT_THEME_ID, isStoryThemeId, type StoryThemeId } from '@/lib/story/themes'

/** The looks a promo comes in: the same content, composed four ways. */
export const PROMO_LAYOUTS = ['classic', 'sticker', 'coupon', 'poster'] as const
export type PromoLayout = (typeof PROMO_LAYOUTS)[number]

export const isPromoLayout = (value: unknown): value is PromoLayout =>
  PROMO_LAYOUTS.includes(value as PromoLayout)

export interface PromoItem {
  id: string
  name: string
  /** The usual price in drams, as digits ("8000"); '' for none. */
  price: string
  /**
   * The price on offer when the salon typed its own ("5900"); '' follows the
   * discount. Kept when the discount changes: it is the salon's figure, not ours.
   */
  sale: string
}

export interface PromoDraft extends StoryBrand {
  layout: PromoLayout
  themeId: StoryThemeId
  /** Percent off. */
  discount: number
  /** What the discount is on, under the number: "On manicure & pedicure". */
  offer: string
  /** Services on offer, each shown at its usual price crossed out and its new one. */
  items: PromoItem[]
  /** The offer's last day, 'YYYY-MM-DD', or '' for no end date. */
  until: string
  /** How to take it up, above the contact: "DM to book". */
  note: string
}

/**
 * Input limits. `items` is how many services a promo shows before it turns
 * into a price list: past five, the number stops being the story's headline.
 * `price` is in digits — up to 9 999 999 ֏.
 */
export const LIMITS = {
  offer: 70,
  name: 48,
  price: 7,
  items: 5,
  note: 48,
} as const

/** The discount control: whole percents in steps of five, from a token 5% to 90%. */
export const DISCOUNT = { min: 5, max: 90, step: 5, sample: 20 } as const

/** The story's own words, in the visitor's language. */
export interface PromoLabels {
  /** "Until 31 October", or '' with no end date. */
  until: string
  /** The word under the number on a sticker: "off", "զեղչ". */
  off: string
}

/**
 * The first amount in what was typed or pasted, as bare digits: "8 000 ֏" →
 * "8000", and "5000-8000" → "5000" rather than the two run together. No
 * leading zeros, within the limit.
 */
export const digitsOf = (text: string): string =>
  (/\d[\d\s.,]*/.exec(text)?.[0] ?? '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, LIMITS.price)

let sequence = 0

/** A new row. A counter, not crypto.randomUUID — see the price list's newItem. */
export function newItem(name = '', price = '', sale = ''): PromoItem {
  sequence += 1
  return { id: `promo-${Date.now().toString(36)}-${sequence.toString(36)}`, name, price, sale }
}

export function isFilled(item: PromoItem): boolean {
  return Boolean(item.name.trim() || item.price || item.sale)
}

/**
 * A price less `percent`, rounded DOWN to a round figure — 100 ֏, or 10 ֏
 * under 1 000. Down, so the client never pays a dram more than the story
 * promised: 15% off 7 500 is 6 375, shown as 6 300.
 */
export function discounted(amount: number, percent: number): number {
  const step = amount >= 1000 ? 100 : 10
  return Math.floor((amount * (100 - percent)) / (100 * step) + 1e-9) * step
}

/** The usual price less the discount, as digits; '' without a usual price. */
export function autoSale(item: PromoItem, percent: number): string {
  return item.price ? String(discounted(Number(item.price), percent)) : ''
}

/** A service's price on the story. */
export interface PromoPrice {
  /** The usual price, digits only ("8 000"), crossed out; '' when there is nothing to cross out. */
  was: string
  /** The price on offer: "6 400 ֏". */
  now: string
}

/**
 * What a row's prices become on the story: the salon's own figure, or the
 * usual price less the discount — 8000 at 20% off is 8 000 crossed out and
 * 6 400 ֏. Only a real reduction is crossed out; a figure at or above the
 * usual price shows on its own.
 */
export function promoPrice(item: PromoItem, percent: number): PromoPrice | null {
  const now = item.sale || autoSale(item, percent)
  if (!now) return null
  const usual = item.price ? Number(item.price) : null
  return {
    was: usual !== null && Number(now) < usual ? formatAmount({ low: usual }, { sign: false }) : '',
    now: formatAmount({ low: Number(now) }),
  }
}

/** Every character the story may draw, for the font loader. */
export function draftText(draft: PromoDraft, labels: PromoLabels): string {
  const parts = [brandText(draft), draft.offer, draft.note, labels.until, labels.off.toUpperCase()]
  for (const item of draft.items) parts.push(item.name)
  return `${parts.join(' ')} 0123456789 , % ${AMD_SIGN} – …`
}

const readDiscount = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value)
    ? Math.min(DISCOUNT.max, Math.max(DISCOUNT.min, value))
    : DISCOUNT.sample

const readDigits = (value: unknown): string => digitsOf(readText(value, 32))

/** A stored draft, checked field by field. Anything malformed is dropped, not trusted. */
export function parseDraft(value: unknown): PromoDraft | null {
  const stored = asRecord(value)
  if (!stored || !Array.isArray(stored.items)) return null

  const items = stored.items
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .slice(0, LIMITS.items)
    .map((item) => newItem(readText(item.name, LIMITS.name), readDigits(item.price), readDigits(item.sale)))

  return {
    ...parseBrand(stored),
    layout: isPromoLayout(stored.layout) ? stored.layout : PROMO_LAYOUTS[0],
    themeId: isStoryThemeId(stored.themeId) ? stored.themeId : DEFAULT_THEME_ID,
    discount: readDiscount(stored.discount),
    offer: readText(stored.offer, LIMITS.offer),
    items: items.length ? items : [newItem()],
    until: isDay(stored.until) ? stored.until : '',
    note: readText(stored.note, LIMITS.note),
  }
}
