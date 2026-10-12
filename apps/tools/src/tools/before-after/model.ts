import { asRecord, readText } from '@/lib/storage'
import { STORY } from '@/lib/story/size'

export type Format = 'post' | 'story'
export type Arrangement = 'side' | 'stacked'
export type Side = 'before' | 'after'

/**
 * The remembered part of a before/after: the choices and the words. The
 * photos themselves are never stored — they stay in memory for the visit and
 * never leave the device.
 */
export interface BeforeAfterDraft {
  format: Format
  arrangement: Arrangement
  beforeLabel: string
  afterLabel: string
  /** "@anna.nails" across the bottom of the image. */
  handle: string
}

export const LIMITS = { label: 16, handle: 40 } as const

export interface Size {
  width: number
  height: number
}

export interface Box extends Size {
  x: number
  y: number
}

/** The white line between the two photos. */
export const DIVIDER = 8

/** A portrait phone photo — the shape assumed until real photos arrive. */
const DEFAULT_PHOTO_ASPECT = 4 / 5

/** The photos' shape, width ÷ height, averaged when the two differ. */
export function photoAspect(photos: Array<Size | null>): number {
  const shapes = photos.filter((p): p is Size => p !== null).map((p) => p.width / p.height)
  const aspect = shapes.length ? shapes.reduce((a, b) => a + b, 0) / shapes.length : DEFAULT_PHOTO_ASPECT
  return Math.min(2, Math.max(0.5, aspect))
}

/** What Instagram accepts for a feed post: 1.91:1 landscape to 4:5 portrait. */
const POST = { width: 1080, minHeight: 566, maxHeight: 1350 }

/**
 * The canvas, shaped around the photos.
 *
 * A story is always 1080×1920. A post's height follows the photos, so each
 * keeps close to its own proportions instead of being sliced into a strip: two
 * portrait photos side by side make a landscape post, two landscape ones
 * stacked a tall one — within the shapes Instagram accepts. A fixed 4:5 frame
 * gave each portrait a slot 0.4 times as wide as tall, and cut faces in half.
 */
export function canvasSize(format: Format, arrangement: Arrangement, aspect: number): Size {
  if (format === 'story') return { width: STORY.width, height: STORY.height }
  const slotWidth = arrangement === 'side' ? (POST.width - DIVIDER) / 2 : POST.width
  const natural = arrangement === 'side' ? slotWidth / aspect : (2 * slotWidth) / aspect + DIVIDER
  return {
    width: POST.width,
    height: Math.round(Math.min(POST.maxHeight, Math.max(POST.minHeight, natural))),
  }
}

/** Where each photo sits on a canvas of `size`. */
export function photoBoxes(size: Size, arrangement: Arrangement): Record<Side, Box> {
  const { width: W, height: H } = size
  if (arrangement === 'side') {
    const width = (W - DIVIDER) / 2
    return {
      before: { x: 0, y: 0, width, height: H },
      after: { x: width + DIVIDER, y: 0, width, height: H },
    }
  }
  const height = (H - DIVIDER) / 2
  return {
    before: { x: 0, y: 0, width: W, height },
    after: { x: 0, y: height + DIVIDER, width: W, height },
  }
}

const FORMAT_VALUES: Format[] = ['post', 'story']
const ARRANGEMENTS: Arrangement[] = ['side', 'stacked']

/** A stored draft, checked field by field. Anything malformed is dropped, not trusted. */
export function parseDraft(value: unknown): BeforeAfterDraft | null {
  const stored = asRecord(value)
  if (!stored) return null
  return {
    format: FORMAT_VALUES.includes(stored.format as Format) ? (stored.format as Format) : 'post',
    arrangement: ARRANGEMENTS.includes(stored.arrangement as Arrangement) ? (stored.arrangement as Arrangement) : 'side',
    beforeLabel: readText(stored.beforeLabel, LIMITS.label),
    afterLabel: readText(stored.afterLabel, LIMITS.label),
    handle: readText(stored.handle, LIMITS.handle),
  }
}
