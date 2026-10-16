import { isDay } from '@/lib/dates'
import { asRecord, readText } from '@/lib/storage'
import { DEFAULT_THEME_ID, isStoryThemeId, type StoryThemeId } from '@/lib/story/themes'

/**
 * The looks a certificate comes in. The first four are the timeless ones —
 * on white paper, with a colour band, in full colour — and the last two the
 * modern ones: soft gradient clouds, and a medal.
 */
export const CERT_LAYOUTS = ['classic', 'minimal', 'band', 'luxe', 'aura', 'medallion'] as const
export type CertLayout = (typeof CERT_LAYOUTS)[number]

/** The paper it prints on, landscape: A4 for a full course, A5 for a workshop. */
export const PAPER_SIZES = ['a4', 'a5'] as const
export type PaperSize = (typeof PAPER_SIZES)[number]

export const PAPER: Record<PaperSize, { widthMm: number; heightMm: number }> = {
  a4: { widthMm: 297, heightMm: 210 },
  a5: { widthMm: 210, heightMm: 148 },
}

/**
 * Every certificate is drawn 2000 units wide, its height following the paper
 * (A sizes are all but the same shape), and printed by scaling that drawing
 * to 300 dpi — so the A4 and the A5 are the same design, as sharp at both.
 */
export const DESIGN_WIDTH = 2000

export function designSize(size: PaperSize) {
  const { widthMm, heightMm } = PAPER[size]
  return { width: DESIGN_WIDTH, height: Math.round((DESIGN_WIDTH * heightMm) / widthMm) }
}

export function printSize(size: PaperSize) {
  const { widthMm, heightMm } = PAPER[size]
  return { width: Math.round((widthMm / 25.4) * 300), height: Math.round((heightMm / 25.4) * 300), widthMm, heightMm }
}

export interface Signer {
  name: string
  /** "Instructor", "Director". */
  title: string
}

export interface CertificateDraft {
  layout: CertLayout
  themeId: StoryThemeId
  size: PaperSize
  /** Who issues it: "Anna Beauty Academy". */
  school: string
  /** The school's Instagram or website, small at the foot. */
  link: string
  /** The big word: "Certificate". */
  heading: string
  recipient: string
  /** The line that says what it is for: "for successfully completing the course". */
  wording: string
  course: string
  /** Hours or dates: "24 academic hours". */
  details: string
  city: string
  /** Date of issue, 'YYYY-MM-DD'; '' leaves it off. */
  date: string
  number: string
  /** One or two people sign; a signer with neither name nor title is left off. */
  signers: [Signer, Signer]
  /** A dashed circle where the school's stamp goes. */
  seal: boolean
}

export const LIMITS = {
  school: 60,
  link: 60,
  heading: 32,
  recipient: 48,
  wording: 80,
  course: 80,
  details: 60,
  city: 30,
  number: 12,
  signerName: 40,
  signerTitle: 40,
} as const

/** The certificate's own words, in the visitor's language. */
export interface CertLabels {
  /** "Yerevan, 16 October 2026": the place and date of issue. */
  issued: string
  /** Marks the stamp's place: "L.S.", "Կ.Տ.", "М.П.". */
  seal: string
}

/** A fresh four-digit number. */
export const newNumber = (): string => String(Math.floor(1000 + Math.random() * 9000))

/**
 * The next number after this one, for the next student: its last run of
 * digits plus one, zero-padded as it was ("0024" → "0025", "A-99" → "A-100").
 */
export function nextNumber(number: string): string {
  const match = /(\d+)(?!.*\d)/.exec(number)
  if (!match) return `${number.trim()}${number.trim() ? '-' : ''}1`
  const next = String(Number(match[1]) + 1).padStart(match[1].length, '0')
  return number.slice(0, match.index) + next + number.slice(match.index + match[1].length)
}

export const hasSigner = (signer: Signer) => Boolean(signer.name.trim() || signer.title.trim())

/** Every character the certificate may draw, for the font loader. */
export function draftText(draft: CertificateDraft, labels: CertLabels): string {
  return [
    draft.school,
    draft.school.toUpperCase(),
    draft.link,
    draft.heading,
    draft.heading.toUpperCase(),
    draft.recipient,
    draft.wording,
    draft.course,
    draft.details,
    labels.issued,
    labels.seal,
    draft.number,
    ...draft.signers.flatMap((s) => [s.name, s.title, s.title.toUpperCase()]),
    '№ 0123456789 «» “” · –',
  ].join(' ')
}

const readSigner = (value: unknown): Signer => {
  const stored = asRecord(value)
  return { name: readText(stored?.name, LIMITS.signerName), title: readText(stored?.title, LIMITS.signerTitle) }
}

const isLayout = (value: unknown): value is CertLayout => CERT_LAYOUTS.includes(value as CertLayout)
const isSize = (value: unknown): value is PaperSize => PAPER_SIZES.includes(value as PaperSize)

/** A stored draft, checked field by field. Anything malformed is dropped, not trusted. */
export function parseDraft(value: unknown): CertificateDraft | null {
  const stored = asRecord(value)
  if (!stored || typeof stored.recipient !== 'string') return null
  const signers = Array.isArray(stored.signers) ? stored.signers : []

  return {
    layout: isLayout(stored.layout) ? stored.layout : CERT_LAYOUTS[0],
    themeId: isStoryThemeId(stored.themeId) ? stored.themeId : DEFAULT_THEME_ID,
    size: isSize(stored.size) ? stored.size : 'a4',
    school: readText(stored.school, LIMITS.school),
    link: readText(stored.link, LIMITS.link),
    heading: readText(stored.heading, LIMITS.heading),
    recipient: readText(stored.recipient, LIMITS.recipient),
    wording: readText(stored.wording, LIMITS.wording),
    course: readText(stored.course, LIMITS.course),
    details: readText(stored.details, LIMITS.details),
    city: readText(stored.city, LIMITS.city),
    date: isDay(stored.date) ? stored.date : '',
    number: readText(stored.number, LIMITS.number),
    signers: [readSigner(signers[0]), readSigner(signers[1])],
    seal: stored.seal !== false,
  }
}
