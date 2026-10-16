import { withAlpha } from '@/lib/canvas/color'
import { drawStoryFooter } from '@/lib/story/draw'
import { STORY } from '@/lib/story/size'
import type { StoryTheme } from '@/lib/story/themes'
import {
  CENTER,
  type Block,
  type PromoContent,
  capsBlock,
  drawNameHeader,
  drawStack,
  fitBlocks,
  measureNumeral,
  present,
  rowsBlock,
  serifFont,
  stackHeight,
  textBlock,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Coupon: the offer as a ticket to keep — a card with notches cut from its
// sides and a perforation to tear along. The figure on the ticket, the
// services and the date on its stub.
//
//            Anna Beauty
//   ╭────────────────────────────╮
//   │        SPECIAL OFFER       │
//   │            −20%            │
//   │   On manicure & pedicure   │
//   ◖ - - - - - - - - - - - - - -◗
//   │ Gel polish   8 000  6 400 ֏│
//   │    UNTIL 31 OCTOBER        │
//   ╰────────────────────────────╯
// ─────────────────────────────────────────────────────────────

const TICKET = { left: 80, width: STORY.width - 160, radius: 44 } as const

export function drawCoupon(ctx: CanvasRenderingContext2D, c: PromoContent, theme: StoryTheme) {
  const top = drawNameHeader(ctx, c.draft.title, theme.text) + 48
  const bottom = drawStoryFooter(ctx, theme, { contact: c.draft.contact, note: c.draft.note })

  const blocks = fitBlocks((k, last) => {
    const card = ticket(ctx, c, theme, k, last)
    return card ? [card] : null
  }, bottom - top)

  drawStack(blocks, top, bottom)
}

function ticket(ctx: CanvasRenderingContext2D, c: PromoContent, theme: StoryTheme, k: number, last: boolean): Block | null {
  const padding = Math.round(64 * k)
  const inner = TICKET.width - padding * 2
  const notch = Math.round(36 * k)

  const numeral = measureNumeral(ctx, c.draft.discount, Math.round(340 * k), inner)
  const figure: Block = {
    height: numeral.height,
    space: Math.round(40 * k),
    draw: (top) => numeral.draw(CENTER, top + numeral.height, theme.text),
  }
  const main = present([
    capsBlock(ctx, c.draft.heading, { size: Math.round(32 * k), color: theme.accent, space: 0, width: inner }),
    figure,
    textBlock(ctx, c.draft.offer, {
      font: serifFont,
      size: Math.round(54 * k),
      width: inner,
      color: theme.text,
      space: Math.round(40 * k),
    }),
  ])

  let rows: Block | null = null
  if (c.rows.length) {
    rows = rowsBlock(ctx, c.rows, theme, { size: Math.round(40 * k), left: TICKET.left + padding, width: inner, space: 0, last })
    if (!rows) return null
  }
  const stub = present([
    rows,
    capsBlock(ctx, c.labels.until, { size: Math.round(27 * k), color: theme.muted, space: Math.round(48 * k), width: inner }),
  ])

  const mainHeight = stackHeight(main) + padding * 2
  const stubHeight = stub.length ? stackHeight(stub) + padding * 2 : 0

  return {
    height: mainHeight + stubHeight,
    space: 0,
    draw(top) {
      const tear = stub.length ? top + mainHeight : null
      ticketPath(ctx, top, mainHeight + stubHeight, tear, notch)
      ctx.fillStyle = theme.surface
      ctx.fill()
      ctx.strokeStyle = withAlpha(theme.accent, 0.5)
      ctx.lineWidth = 2.5
      ctx.stroke()

      if (tear !== null) {
        ctx.setLineDash([16, 14])
        ctx.strokeStyle = withAlpha(theme.accent, 0.55)
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(TICKET.left + notch + 22, tear)
        ctx.lineTo(TICKET.left + TICKET.width - notch - 22, tear)
        ctx.stroke()
        ctx.setLineDash([])
        drawStack(stub, tear + padding, tear + stubHeight - padding)
      }
      drawStack(main, top + padding, top + mainHeight - padding)
    },
  }
}

/**
 * The ticket's outline, with a half-circle notch cut into each side at the
 * tear line — real holes in the path, so the background shows through them.
 */
function ticketPath(ctx: CanvasRenderingContext2D, top: number, height: number, tear: number | null, notch: number) {
  const { left: x, width: w, radius: r } = TICKET
  const bottom = top + height

  ctx.beginPath()
  ctx.moveTo(x + r, top)
  ctx.arcTo(x + w, top, x + w, top + r, r)
  if (tear !== null) {
    ctx.lineTo(x + w, tear - notch)
    ctx.arc(x + w, tear, notch, -Math.PI / 2, Math.PI / 2, true)
  }
  ctx.arcTo(x + w, bottom, x + w - r, bottom, r)
  ctx.arcTo(x, bottom, x, bottom - r, r)
  if (tear !== null) {
    ctx.lineTo(x, tear + notch)
    ctx.arc(x, tear, notch, Math.PI / 2, -Math.PI / 2, true)
  }
  ctx.arcTo(x, top, x + r, top, r)
  ctx.closePath()
}
