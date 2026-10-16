import { withAlpha } from '@/lib/canvas/color'
import { drawRimText } from '@/lib/canvas/rim'
import { roundedRect, scallopPath } from '@/lib/canvas/shapes'
import { withLetterSpacing } from '@/lib/canvas/text'
import { STORY_BOX, STORY_CONTENT_W, drawStoryFooter } from '@/lib/story/draw'
import type { StoryTheme } from '@/lib/story/themes'
import {
  CENTER,
  type Block,
  type PromoContent,
  capsFont,
  drawNameHeader,
  drawSparkle,
  drawStack,
  fitBlocks,
  measureNumeral,
  present,
  rowsBlock,
  serifFont,
  stackHeight,
  textBlock,
  untilBlock,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Sticker: the figure on a scalloped seal, stamped at an angle onto a card —
// the heading runs round its rim like a rubber stamp's, sparkles fly off it.
// The card under it holds the offer, the services and the date.
//
//             Anna Beauty
//        ✦     ╭~~~~~~~~╮
//             ( −20%     )
//   ┌─────────(   OFF    )──────────┐
//   │          ╰~~~~~~~~╯   ✦       │
//   │     On manicure & pedicure    │
//   │ Gel polish ...  8 000  6 400 ֏│
//   │       ( ◷ Until 31 October )  │
//   └───────────────────────────────┘
// ─────────────────────────────────────────────────────────────

const TILT = (-8 * Math.PI) / 180

export function drawSticker(ctx: CanvasRenderingContext2D, c: PromoContent, theme: StoryTheme) {
  // The heading is on the seal's rim, so the header is the name alone.
  const top = drawNameHeader(ctx, c.draft.title, theme.text) + 28
  const bottom = drawStoryFooter(ctx, theme, { contact: c.draft.contact, note: c.draft.note })

  const blocks = fitBlocks((k, last) => {
    const padding = Math.round(48 * k)
    const inner = STORY_CONTENT_W - padding * 2
    let services: Block | null = null
    if (c.rows.length) {
      services = rowsBlock(ctx, c.rows, theme, {
        size: Math.round(42 * k),
        left: STORY_BOX.left + padding,
        width: inner,
        space: Math.round(44 * k),
        last,
      })
      if (!services) return null
    }
    const card = present([
      textBlock(ctx, c.draft.offer, { font: serifFont, size: Math.round(58 * k), width: inner, color: theme.text, space: 0 }),
      services,
      untilBlock(ctx, c.labels.until, theme, { size: Math.round(34 * k), space: Math.round(48 * k) }),
    ])
    return [stickerOnCard(ctx, c, theme, k, card, padding)]
  }, bottom - top)

  drawStack(blocks, top, bottom)
}

/** The seal, and the card it is stuck on — the card's top runs behind the seal's lower half. */
function stickerOnCard(
  ctx: CanvasRenderingContext2D,
  c: PromoContent,
  theme: StoryTheme,
  k: number,
  card: Block[],
  padding: number,
): Block {
  const radius = Math.round(290 * k)
  const content = stackHeight(card)
  const gap = Math.round(40 * k)
  const height = radius * 2 + (card.length ? gap + content + padding : 0)

  return {
    height,
    space: 0,
    draw(top) {
      const cy = top + radius
      if (card.length) {
        const cardTop = cy + radius * 0.3
        roundedRect(ctx, STORY_BOX.left, cardTop, STORY_CONTENT_W, top + height - cardTop, 40)
        ctx.fillStyle = theme.surface
        ctx.fill()
        ctx.strokeStyle = withAlpha(theme.accent, 0.22)
        ctx.lineWidth = 2
        ctx.stroke()
        drawStack(card, top + radius * 2 + gap, top + radius * 2 + gap + content)
      }
      seal(ctx, c, theme, radius, cy)
    },
  }
}

/** A scalloped disc in the accent: the heading round its rim, the figure and "OFF" in its middle. */
function seal(ctx: CanvasRenderingContext2D, c: PromoContent, theme: StoryTheme, radius: number, cy: number) {
  const heading = c.draft.heading.trim().toUpperCase()
  const off = c.labels.off.trim().toUpperCase()
  // With a rim of words the figure keeps inside its inner ring; without, it can grow.
  const room = heading ? 1.1 : 1.4
  const numeral = measureNumeral(ctx, c.draft.discount, Math.round(radius * 0.7), radius * room)
  const offSize = Math.round(radius * 0.12)
  const offGap = radius * 0.1
  const content = numeral.height + (off ? offGap + offSize : 0)

  ctx.save()
  ctx.translate(CENTER, cy)
  ctx.rotate(TILT)

  // A soft drop shadow lifts it off the card, like a real sticker.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
  ctx.shadowBlur = radius * 0.18
  ctx.shadowOffsetY = radius * 0.07
  scallopPath(ctx, 0, 0, radius)
  ctx.fillStyle = theme.accent
  ctx.fill()
  ctx.shadowColor = 'transparent'

  if (heading) {
    rimText(ctx, heading, radius * 0.79, Math.round(radius * 0.095), withAlpha(theme.onAccent, 0.9))
    ring(ctx, radius * 0.69, Math.max(2, radius * 0.008), withAlpha(theme.onAccent, 0.45))
  } else {
    ring(ctx, radius * 0.84, Math.max(3, radius * 0.018), withAlpha(theme.onAccent, 0.55), [1, radius * 0.06])
  }

  const baseline = -content / 2 + numeral.height
  numeral.draw(0, baseline, theme.onAccent)
  if (off) {
    ctx.font = capsFont(offSize)
    ctx.textAlign = 'center'
    ctx.fillStyle = withAlpha(theme.onAccent, 0.86)
    withLetterSpacing(ctx, `${Math.round(offSize * 0.3)}px`, () => ctx.fillText(off, 0, baseline + offGap + offSize * 0.86))
  }
  ctx.restore()

  drawSparkle(ctx, CENTER + radius * 1.12, cy - radius * 0.7, radius * 0.15, theme.accent)
  drawSparkle(ctx, CENTER + radius * 1.36, cy - radius * 0.3, radius * 0.06, theme.accent)
  drawSparkle(ctx, CENTER - radius * 1.16, cy - radius * 0.2, radius * 0.1, theme.accent)
}


function ring(ctx: CanvasRenderingContext2D, radius: number, width: number, color: string, dash: number[] = []) {
  ctx.setLineDash(dash)
  ctx.lineCap = 'round'
  ctx.lineWidth = width
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineCap = 'butt'
}

/**
 * `text` round a circle, repeated as often as it fits with a sparkle between
 * each — set letter by letter, each turned to face outwards. Drawn about the
 * origin (the caller has moved and turned the context to the seal).
 */
function rimText(ctx: CanvasRenderingContext2D, text: string, radius: number, size: number, color: string) {
  drawRimText(ctx, text, { radius, size, font: capsFont, color })
}
