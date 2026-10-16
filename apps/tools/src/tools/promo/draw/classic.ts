import { STORY_BOX, STORY_CONTENT_W, drawStoryFooter, drawStoryHeader, glow } from '@/lib/story/draw'
import type { StoryTheme } from '@/lib/story/themes'
import {
  CENTER,
  type Block,
  type PromoContent,
  drawStack,
  fitBlocks,
  measureNumeral,
  present,
  rowsBlock,
  serifFont,
  textBlock,
  untilBlock,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Classic: the set's own header and footer, and between them the figure as
// the headline — large, in the accent, lit from behind.
//
//          SPECIAL OFFER
//           Anna Beauty
//             ──◆──
//            −20%
//     On manicure & pedicure
//   Gel polish ....... 8 000  6 400 ֏
//        ( ◷ Until 31 October )
//            DM to book
// ─────────────────────────────────────────────────────────────

export function drawClassic(ctx: CanvasRenderingContext2D, c: PromoContent, theme: StoryTheme) {
  const top = drawStoryHeader(ctx, theme, c.draft)
  const bottom = drawStoryFooter(ctx, theme, { contact: c.draft.contact, note: c.draft.note })

  const blocks = fitBlocks((k, last) => {
    let services: Block | null = null
    if (c.rows.length) {
      services = rowsBlock(ctx, c.rows, theme, {
        size: Math.round(44 * k),
        left: STORY_BOX.left,
        width: STORY_CONTENT_W,
        space: Math.round(76 * k),
        last,
      })
      if (!services) return null
    }
    return present([
      figure(ctx, c.draft.discount, theme, k),
      textBlock(ctx, c.draft.offer, {
        font: serifFont,
        size: Math.round(60 * k),
        width: STORY_CONTENT_W,
        color: theme.text,
        space: Math.round(44 * k),
      }),
      services,
      untilBlock(ctx, c.labels.until, theme, { size: Math.round(34 * k), space: Math.round(68 * k) }),
    ])
  }, bottom - top)

  drawStack(blocks, top, bottom)
}

/** The figure, with a soft pool of its own colour behind it. */
function figure(ctx: CanvasRenderingContext2D, percent: number, theme: StoryTheme, k: number): Block {
  const numeral = measureNumeral(ctx, percent, Math.round(400 * k), STORY_CONTENT_W)
  return {
    height: numeral.height,
    space: 0,
    draw(top) {
      glow(ctx, theme.accent, CENTER, top + numeral.height / 2, numeral.width * 0.72, theme.glow * 1.1)
      numeral.draw(CENTER, top + numeral.height, theme.accent)
    },
  }
}
