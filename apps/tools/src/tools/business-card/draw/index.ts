import { isDark, mix } from '@/lib/canvas/color'
import { roundedRect } from '@/lib/canvas/shapes'
import { drawRings, glow } from '@/lib/story/draw'
import type { StoryTheme } from '@/lib/story/themes'
import {
  CARD,
  PRINT,
  SHEET,
  contactsOf,
  initialsOf,
  qrCaption,
  qrUrl,
  type CardDraft,
  type CardLabels,
  type CardLayout,
} from '../model'
import { archBack, archFront } from './arch'
import { classicBack, classicFront } from './classic'
import type { CardContent, Face } from './kit'
import { minimalBack, minimalFront } from './minimal'
import { splitBack, splitFront } from './split'

export { CARD_FONTS } from './kit'
export type { CardContent }

// ─────────────────────────────────────────────────────────────
// The business card, three ways out of one set of faces:
//
//   drawSheet      both sides on one 4:5 picture, as cards on a table —
//                  the image to send and post (and the live preview)
//   drawPrintPage  one side at full size with its bleed — a PDF page
//   drawFace       one side alone — the layout thumbnails
// ─────────────────────────────────────────────────────────────

export type CardSide = 'front' | 'back'

const FACES: Record<CardLayout, Record<CardSide, Face>> = {
  classic: { front: classicFront, back: classicBack },
  split: { front: splitFront, back: splitBack },
  arch: { front: archFront, back: archBack },
  minimal: { front: minimalFront, back: minimalBack },
}

/** What the faces draw, worked out from the draft once. */
export function cardContent(draft: CardDraft, labels: CardLabels): CardContent {
  const url = qrUrl(draft)
  return {
    draft,
    labels,
    initials: initialsOf(draft.name),
    contacts: contactsOf(draft, labels),
    qr: url ? { url, caption: qrCaption(draft) } : null,
  }
}

/** One side, in card units from its top-left corner. */
export function drawFace(ctx: CanvasRenderingContext2D, side: CardSide, content: CardContent, theme: StoryTheme) {
  ctx.save()
  ctx.textBaseline = 'alphabetic'
  FACES[content.draft.layout][side](ctx, content, theme)
  ctx.restore()
}

/** One side as a print page: the card, and its ground run out 2 mm past every edge. */
export function drawPrintPage(ctx: CanvasRenderingContext2D, side: CardSide, content: CardContent, theme: StoryTheme) {
  ctx.save()
  ctx.clearRect(0, 0, PRINT.width, PRINT.height)
  ctx.translate(PRINT.bleed, PRINT.bleed)
  drawFace(ctx, side, content, theme)
  ctx.restore()
}

/** The card's width on the sheet, and its corner: 3.5 mm, the round-cornered cut print shops offer. */
const SHEET_CARD = { width: 920, radius: 70 }

/** Front over back, as two cards lying on a softly lit table of the palette's own colour. */
export function drawSheet(ctx: CanvasRenderingContext2D, content: CardContent, theme: StoryTheme) {
  const { width, height } = SHEET
  const scale = SHEET_CARD.width / CARD.width
  const cardHeight = CARD.height * scale
  const gap = 64
  const x = (width - SHEET_CARD.width) / 2
  const top = (height - cardHeight * 2 - gap) / 2

  ctx.save()
  ctx.clearRect(0, 0, width, height)
  drawTable(ctx, theme)
  drawCard(ctx, 'front', content, theme, x, top, scale)
  drawCard(ctx, 'back', content, theme, x, top + cardHeight + gap, scale)
  ctx.restore()
}

function drawTable(ctx: CanvasRenderingContext2D, theme: StoryTheme) {
  const { width, height } = SHEET
  // A step off the card's own ground — darker under a light card, lighter
  // under a dark one — so the card always has an edge against it.
  const table = ctx.createLinearGradient(0, 0, 0, height)
  table.addColorStop(0, mix(theme.bg[0], theme.accent, 0.16))
  table.addColorStop(1, mix(theme.bg[1], theme.accent, 0.1))
  ctx.fillStyle = table
  ctx.fillRect(0, 0, width, height)

  glow(ctx, '#FFFFFF', width / 2, height * 0.3, width * 0.85, isDark(theme.bg[1]) ? 0.05 : 0.28)
  drawRings(ctx, theme.accent, width * 0.97, height * 0.035, { from: 160, step: 76, count: 9, alpha: 0.14 })
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  side: CardSide,
  content: CardContent,
  theme: StoryTheme,
  x: number,
  y: number,
  scale: number,
) {
  const width = CARD.width * scale
  const height = CARD.height * scale
  const radius = SHEET_CARD.radius * scale

  // Two shadows: a wide soft one for the lift, a tight one where it touches.
  ctx.save()
  ctx.fillStyle = theme.bg[1]
  ctx.shadowColor = 'rgba(0, 0, 0, 0.26)'
  ctx.shadowBlur = 56
  ctx.shadowOffsetY = 26
  roundedRect(ctx, x, y, width, height, radius)
  ctx.fill()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.16)'
  ctx.shadowBlur = 8
  ctx.shadowOffsetY = 3
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundedRect(ctx, x, y, width, height, radius)
  ctx.clip()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  drawFace(ctx, side, content, theme)
  ctx.restore()

  // A hairline at the edge, as light catches a real card's.
  roundedRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, radius)
  ctx.strokeStyle = isDark(theme.bg[1]) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)'
  ctx.lineWidth = 1.5
  ctx.stroke()
}
