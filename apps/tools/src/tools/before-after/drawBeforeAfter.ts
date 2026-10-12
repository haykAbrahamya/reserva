import { SANS, font } from '@/lib/canvas/fonts'
import { roundedRect } from '@/lib/canvas/shapes'
import { ellipsize, withLetterSpacing } from '@/lib/canvas/text'
import { BRAND_MARK } from '@/lib/story/draw'
import { STORY } from '@/lib/story/size'
import type { BeforeAfterDraft, Box, Side, Size } from './model'
import { drawPhoto, type Photo } from './photos'

// ─────────────────────────────────────────────────────────────
// The before/after image: two photos with a white line between them, a label
// on each, and the handle with the reserva.am mark over a soft shade at the
// foot. The photos are the content, so nothing else competes with them —
// no background, no frame, no ornament.
// ─────────────────────────────────────────────────────────────

const labelFont = font(600, 30, SANS)
const handleFont = font(600, 40, SANS)
const brandFont = font(500, 24, SANS)
const placeholderFont = font(500, 32, SANS)

/** Every face drawBeforeAfter uses — what must be loaded before drawing. */
export const BEFORE_AFTER_FONTS = [labelFont, handleFont, placeholderFont] as const

export interface BeforeAfterLabels {
  before: string
  after: string
  /** Drawn in an empty slot until its photo is added — never in an export. */
  addPhoto: string
}

/** Everything one drawing needs; the geometry is decided once, by the page. */
export interface BeforeAfterScene {
  draft: BeforeAfterDraft
  photos: Record<Side, Photo | null>
  labels: BeforeAfterLabels
  size: Size
  boxes: Record<Side, Box>
}

export function drawBeforeAfter(ctx: CanvasRenderingContext2D, { draft, photos, labels, size, boxes }: BeforeAfterScene) {
  const { width: W, height: H } = size

  ctx.save()
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, W, H)

  for (const side of ['before', 'after'] as const) {
    const photo = photos[side]
    if (photo) drawPhoto(ctx, photo, boxes[side])
    else drawPlaceholder(ctx, boxes[side], labels.addPhoto)
  }

  // A story's top 250px sit under Instagram's own bar, so a label there would
  // be hidden; a post has no such bar.
  const safeTop = draft.format === 'story' ? STORY.safeTop : 0
  drawLabel(ctx, boxes.before, draft.beforeLabel.trim() || labels.before, safeTop)
  drawLabel(ctx, boxes.after, draft.afterLabel.trim() || labels.after, safeTop)

  drawFoot(ctx, draft, W, H)
  ctx.restore()
}

/** An empty slot: a soft ground with a plus and "Add photo". */
function drawPlaceholder(ctx: CanvasRenderingContext2D, box: Box, text: string) {
  ctx.fillStyle = '#ECE6DC'
  ctx.fillRect(box.x, box.y, box.width, box.height)

  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  ctx.strokeStyle = '#A99F90'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - 28, cy - 30)
  ctx.lineTo(cx + 28, cy - 30)
  ctx.moveTo(cx, cy - 58)
  ctx.lineTo(cx, cy - 2)
  ctx.stroke()

  ctx.font = placeholderFont
  ctx.textAlign = 'center'
  ctx.fillStyle = '#8C8273'
  ctx.fillText(ellipsize(ctx, text, box.width - 48), cx, cy + 56)
}

/** "BEFORE" in a dark translucent pill at the top-left of its photo — legible on any photo. */
function drawLabel(ctx: CanvasRenderingContext2D, box: Box, text: string, safeTop: number) {
  const label = text.toUpperCase()
  ctx.font = labelFont
  const padX = 24
  const height = 58

  withLetterSpacing(ctx, '3px', () => {
    const textWidth = Math.min(ctx.measureText(label).width, box.width - 96)
    const x = box.x + 28
    const y = Math.max(box.y + 28, safeTop + 12)

    roundedRect(ctx, x, y, textWidth + padX * 2, height, height / 2)
    ctx.fillStyle = 'rgba(20, 17, 14, 0.55)'
    ctx.fill()

    ctx.textAlign = 'left'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(ellipsize(ctx, label, textWidth), x + padX, y + height / 2 + 11)
  })
}

/** The handle and brand mark, over a shade that keeps them readable on a bright photo. */
function drawFoot(ctx: CanvasRenderingContext2D, draft: BeforeAfterDraft, W: number, H: number) {
  const story = draft.format === 'story'
  // On a story the reply bar covers the bottom 250px — the foot sits above it.
  const base = story ? H - STORY.safeBottom : H - 56
  const shadeHeight = story ? 560 : 300

  const shade = ctx.createLinearGradient(0, H - shadeHeight, 0, H)
  shade.addColorStop(0, 'rgba(20, 17, 14, 0)')
  shade.addColorStop(1, 'rgba(20, 17, 14, 0.6)')
  ctx.fillStyle = shade
  ctx.fillRect(0, H - shadeHeight, W, shadeHeight)

  ctx.textAlign = 'center'
  ctx.font = brandFont
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
  withLetterSpacing(ctx, '4px', () => ctx.fillText(BRAND_MARK, W / 2, base))

  const handle = draft.handle.trim()
  if (handle) {
    ctx.font = handleFont
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(ellipsize(ctx, handle, W - 160), W / 2, base - 50)
  }
}
