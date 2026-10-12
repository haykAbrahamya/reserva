import { AMD_SIGN } from '@reserva/shared'
import { asRecord, readText } from '@/lib/storage'
import { brandText, parseBrand, type StoryBrand } from '@/lib/story/brand'
import { DEFAULT_THEME_ID, isStoryThemeId, type StoryThemeId } from '@/lib/story/themes'

export interface PriceItem {
  id: string
  name: string
  /** As typed: "5000", "5000-8000", or free text like "from 5000". */
  price: string
}

export interface PriceListDraft extends StoryBrand {
  items: PriceItem[]
  themeId: StoryThemeId
}

/**
 * Input limits. `items` is how many services still read comfortably on one
 * story; the renderer shrinks the type to fit, and past this it would be too
 * small to read on a phone.
 */
export const LIMITS = {
  name: 60,
  price: 24,
  items: 14,
} as const

let sequence = 0

/**
 * A new row. The id only has to be unique within one draft, and
 * crypto.randomUUID is missing on plain-http addresses — exactly where a phone
 * on the same Wi-Fi opens a dev server — so a counter does the job.
 */
export function newItem(name = '', price = ''): PriceItem {
  sequence += 1
  return { id: `item-${Date.now().toString(36)}-${sequence.toString(36)}`, name, price }
}

export function isFilled(item: PriceItem): boolean {
  return Boolean(item.name.trim() || item.price.trim())
}

/**
 * Every character the story may draw, for the font loader: the draft's own
 * text plus what formatting adds (digits, the dram sign, the range dash).
 */
export function draftText(draft: PriceListDraft): string {
  const parts = [brandText(draft)]
  for (const item of draft.items) parts.push(item.name, item.price)
  return `${parts.join(' ')} 0123456789 ${AMD_SIGN} – …`
}

/** A stored draft, checked field by field. Anything malformed is dropped, not trusted. */
export function parseDraft(value: unknown): PriceListDraft | null {
  const stored = asRecord(value)
  if (!stored || !Array.isArray(stored.items)) return null

  const items = stored.items
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .slice(0, LIMITS.items)
    .map((item) => newItem(readText(item.name, LIMITS.name), readText(item.price, LIMITS.price)))

  return {
    ...parseBrand(stored),
    items: items.length ? items : [newItem()],
    themeId: isStoryThemeId(stored.themeId) ? stored.themeId : DEFAULT_THEME_ID,
  }
}
