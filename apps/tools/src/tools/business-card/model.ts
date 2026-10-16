import { parseInstagram } from '@/lib/instagram'
import type { IconName } from '@/lib/canvas/icons'
import { initialsOf } from '@/lib/canvas/monogram'
import { asRecord, readText } from '@/lib/storage'
import { DEFAULT_THEME_ID, isStoryThemeId, type StoryThemeId } from '@/lib/story/themes'

/** The looks a card comes in: the same name and contacts, composed four ways. */
export const CARD_LAYOUTS = ['classic', 'split', 'arch', 'minimal'] as const
export type CardLayout = (typeof CARD_LAYOUTS)[number]

/** The messengers a phone number can be on, shown by name under it. */
export const MESSENGERS = ['whatsapp', 'viber', 'telegram'] as const
export type Messenger = (typeof MESSENGERS)[number]

/** Where the QR code leads. */
export const QR_TARGETS = ['instagram', 'whatsapp', 'website', 'none'] as const
export type QrTarget = (typeof QR_TARGETS)[number]

export interface CardDraft {
  layout: CardLayout
  themeId: StoryThemeId
  /** A person's or a salon's name: "Anna Petrosyan". */
  name: string
  /** What they do: "Nail artist". */
  role: string
  /** As typed: "@anna.nails", a profile link, or a bare username. */
  instagram: string
  phone: string
  messengers: Messenger[]
  address: string
  /** A website or any link: "reserva.am/anna". */
  website: string
  qr: QrTarget
}

export const LIMITS = {
  name: 40,
  role: 48,
  instagram: 60,
  phone: 24,
  address: 80,
  website: 60,
} as const

/**
 * The card: 90 × 50 mm, the size print shops in Armenia and Russia cut (the
 * European one is 85 × 55), drawn at 20 px per mm — about 500 dpi.
 */
export const CARD = { width: 1800, height: 1000, widthMm: 90, heightMm: 50 } as const

/**
 * A print page: the card with 2 mm of bleed on every side, 94 × 54 mm. The
 * background runs into the bleed, so a cut a hair off true leaves no white
 * edge; nothing that must survive the cut goes near it.
 */
export const PRINT = { bleed: 40, width: 1880, height: 1080, widthMm: 94, heightMm: 54 } as const

/** The picture to send or post: both sides of the card on one 4:5 image. */
export const SHEET = { width: 1080, height: 1350 } as const

/** The card's own words, in the visitor's language. */
export interface CardLabels {
  phone: string
  address: string
  website: string
}

/** One line of contacts on the card's back. */
export interface Contact {
  icon: IconName
  /** What it is, for the layouts that label their lines: "Phone". */
  label: string
  text: string
  /** A quieter second line: the messengers a phone is on. */
  sub?: string
}

export { initialsOf }

/** "@anna.nails" from whatever was typed; the text itself when it holds no username. */
export function instagramLine(text: string): string {
  const handle = parseInstagram(text)
  return handle ? `@${handle}` : text.trim()
}

/** A link without its scheme and "www.", as it reads on a card: "reserva.am/anna". */
export function websiteLine(text: string): string {
  return text
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
}

/** A typed website as a link a phone can open. */
function websiteUrl(text: string): string {
  const value = text.trim()
  if (!value || /\s/.test(value) || !value.includes('.')) return ''
  return /^[a-z]+:\/\//i.test(value) ? value : `https://${value}`
}

/**
 * A phone number as WhatsApp links want it: digits with the country code.
 * An Armenian number written locally ("091 123456", or the bare eight
 * digits) gains its 374; one written with + or 00 already has a code.
 */
function whatsappDigits(phone: string): string {
  const value = phone.trim()
  const digits = value.replace(/\D/g, '')
  if (value.startsWith('+')) return digits
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.length === 9 && digits.startsWith('0')) return `374${digits.slice(1)}`
  if (digits.length === 8) return `374${digits}`
  return digits
}

/** What the QR code opens, or '' when its field is empty (or it is switched off). */
export function qrUrl(draft: CardDraft): string {
  switch (draft.qr) {
    case 'instagram': {
      const handle = parseInstagram(draft.instagram)
      return handle ? `https://instagram.com/${handle}` : ''
    }
    case 'whatsapp': {
      const digits = whatsappDigits(draft.phone)
      return digits.length >= 8 ? `https://wa.me/${digits}` : ''
    }
    case 'website':
      return websiteUrl(draft.website)
    default:
      return ''
  }
}

/** The word under the QR code: whose code it is. */
export function qrCaption(draft: CardDraft): string {
  if (draft.qr === 'instagram') return 'Instagram'
  if (draft.qr === 'whatsapp') return 'WhatsApp'
  return websiteLine(draft.website)
}

const MESSENGER_NAMES: Record<Messenger, string> = { whatsapp: 'WhatsApp', viber: 'Viber', telegram: 'Telegram' }

/** The back's contact lines, in reading order; empty fields are left out. */
export function contactsOf(draft: CardDraft, labels: CardLabels): Contact[] {
  const contacts: Contact[] = []
  if (draft.instagram.trim()) {
    contacts.push({ icon: 'instagram', label: 'Instagram', text: instagramLine(draft.instagram) })
  }
  if (draft.phone.trim()) {
    const on = MESSENGERS.filter((m) => draft.messengers.includes(m)).map((m) => MESSENGER_NAMES[m])
    contacts.push({ icon: 'phone', label: labels.phone, text: draft.phone.trim(), sub: on.join(' · ') || undefined })
  }
  if (draft.address.trim()) contacts.push({ icon: 'mapPin', label: labels.address, text: draft.address.trim() })
  if (draft.website.trim()) contacts.push({ icon: 'globe', label: labels.website, text: websiteLine(draft.website) })
  return contacts
}

/** Every character the card may draw, for the font loader. */
export function draftText(draft: CardDraft, labels: CardLabels): string {
  return [
    draft.name,
    initialsOf(draft.name),
    draft.role.toUpperCase(),
    instagramLine(draft.instagram),
    draft.phone,
    draft.address,
    websiteLine(draft.website),
    labels.phone.toUpperCase(),
    labels.address.toUpperCase(),
    labels.website.toUpperCase(),
    'INSTAGRAM WHATSAPP Instagram WhatsApp Viber Telegram · reserva.am',
  ].join(' ')
}

const isLayout = (value: unknown): value is CardLayout => CARD_LAYOUTS.includes(value as CardLayout)
const isQrTarget = (value: unknown): value is QrTarget => QR_TARGETS.includes(value as QrTarget)

/** A stored draft, checked field by field. Anything malformed is dropped, not trusted. */
export function parseDraft(value: unknown): CardDraft | null {
  const stored = asRecord(value)
  if (!stored || typeof stored.name !== 'string') return null
  const messengers = Array.isArray(stored.messengers) ? stored.messengers : []

  return {
    layout: isLayout(stored.layout) ? stored.layout : CARD_LAYOUTS[0],
    themeId: isStoryThemeId(stored.themeId) ? stored.themeId : DEFAULT_THEME_ID,
    name: readText(stored.name, LIMITS.name),
    role: readText(stored.role, LIMITS.role),
    instagram: readText(stored.instagram, LIMITS.instagram),
    phone: readText(stored.phone, LIMITS.phone),
    messengers: MESSENGERS.filter((m) => messengers.includes(m)),
    address: readText(stored.address, LIMITS.address),
    website: readText(stored.website, LIMITS.website),
    qr: isQrTarget(stored.qr) ? stored.qr : 'instagram',
  }
}
