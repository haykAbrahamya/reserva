import { AMD_SIGN } from '@reserva/shared'
import { isDay } from '@/lib/dates'
import { asRecord, readText } from '@/lib/storage'
import { brandText, parseBrand, type StoryBrand } from '@/lib/story/brand'
import { DEFAULT_THEME_ID, isStoryThemeId, type StoryThemeId } from '@/lib/story/themes'

export interface GiftDraft extends StoryBrand {
  /** "20000" (shown as an amount) or a service, "Manicure + pedicure". */
  value: string
  recipient: string
  sender: string
  message: string
  /** 'YYYY-MM-DD', or '' for no expiry line. */
  validUntil: string
  /** The certificate's number, so the salon can tell which one is being redeemed. */
  code: string
  themeId: StoryThemeId
}

export const LIMITS = {
  value: 40,
  recipient: 40,
  sender: 40,
  message: 120,
  code: 12,
} as const

/** The card in pixels, and the size it prints at: 160 × 100 mm, ~250 dpi. */
export const GIFT_CARD = { width: 1600, height: 1000, widthMm: 160, heightMm: 100 } as const

/** A fresh four-digit certificate number. */
export const newCode = (): string => String(Math.floor(1000 + Math.random() * 9000))

/** The card's own words, in the visitor's language. */
export interface GiftLabels {
  for: string
  from: string
  /** "Valid until 31 December 2026", or '' when there is no date. */
  validity: string
}

/** Every character the card may draw, for the font loader. */
export function draftText(draft: GiftDraft, labels: GiftLabels): string {
  return [
    brandText(draft),
    draft.value,
    draft.recipient,
    draft.sender,
    draft.message,
    draft.code,
    labels.for,
    labels.from,
    labels.validity,
    `0123456789 № ${AMD_SIGN} – …`,
  ].join(' ')
}

/** A stored draft, checked field by field. Anything malformed is dropped, not trusted. */
export function parseDraft(value: unknown): GiftDraft | null {
  const stored = asRecord(value)
  if (!stored || typeof stored.value !== 'string') return null

  return {
    ...parseBrand(stored),
    value: readText(stored.value, LIMITS.value),
    recipient: readText(stored.recipient, LIMITS.recipient),
    sender: readText(stored.sender, LIMITS.sender),
    message: readText(stored.message, LIMITS.message),
    validUntil: isDay(stored.validUntil) ? stored.validUntil : '',
    code: readText(stored.code, LIMITS.code) || newCode(),
    themeId: isStoryThemeId(stored.themeId) ? stored.themeId : DEFAULT_THEME_ID,
  }
}
