import { mix, withAlpha } from '@/lib/canvas/color'
import { STORY_BOX, STORY_CONTENT_W, drawRings, drawStoryFooter } from '@/lib/story/draw'
import { STORY } from '@/lib/story/size'
import type { StoryTheme } from '@/lib/story/themes'
import {
  CENTER,
  type Block,
  type PromoContent,
  HEADER_TOP,
  capsBlock,
  drawSparkle,
  drawStack,
  fitBlocks,
  measureNumeral,
  nameBlock,
  present,
  rowsBlock,
  serifFont,
  textBlock,
  untilBlock,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Poster: the top of the story is a block of the accent colour, ending in a
// wave, with the figure huge on it — the one that stops a thumb mid-scroll.
// Below the wave, on the ground, everything else.
//
//   ████████████████████████████
//   ██        Anna Beauty     ██
//   ██          −20%       ✦  ██
//   ██      SPECIAL OFFER     ██
//   ███████████▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
//       On manicure & pedicure
//   Gel polish ....... 8 000  6 400 ֏
//        ( ◷ Until 31 October )
// ─────────────────────────────────────────────────────────────

const { width: W, height: H } = STORY
/** How far the wave at the block's foot swings above and below its line. */
const SWING = 46

export function drawPoster(ctx: CanvasRenderingContext2D, c: PromoContent, theme: StoryTheme) {
  const bottom = drawStoryFooter(ctx, theme, { contact: c.draft.contact, note: c.draft.note })

  // The colour block is the first block, measured from the very top of the
  // story; the rest is centred in what is left under its wave.
  const [block, ...rest] = fitBlocks((k, last) => {
    let services: Block | null = null
    if (c.rows.length) {
      services = rowsBlock(ctx, c.rows, theme, {
        size: Math.round(44 * k),
        left: STORY_BOX.left,
        width: STORY_CONTENT_W,
        space: Math.round(64 * k),
        last,
      })
      if (!services) return null
    }
    return present([
      colourBlock(ctx, c, theme, k),
      textBlock(ctx, c.draft.offer, {
        font: serifFont,
        size: Math.round(60 * k),
        width: STORY_CONTENT_W,
        color: theme.text,
        space: Math.round(64 * k) + SWING,
      }),
      services,
      untilBlock(ctx, c.labels.until, theme, { size: Math.round(34 * k), space: Math.round(64 * k) }),
    ])
  }, bottom)

  block.draw(0)
  if (rest.length) drawStack(rest, block.height + rest[0].space, bottom)
}

/** The accent block: the name, the figure and the heading on it, in the palette's on-accent colour. */
function colourBlock(ctx: CanvasRenderingContext2D, c: PromoContent, theme: StoryTheme, k: number): Block {
  // The big sparkle flies just off the figure's top right, so the figure
  // leaves it room on both sides rather than taking the full width.
  const sparkle = Math.round(40 * k)
  const numeral = measureNumeral(ctx, c.draft.discount, Math.round(460 * k), W - 2 * (sparkle * 2 + 36))
  const name = nameBlock(ctx, c.draft.title, theme.onAccent)
  const heading = capsBlock(ctx, c.draft.heading, {
    size: Math.round(34 * k),
    color: withAlpha(theme.onAccent, 0.86),
    space: Math.round(52 * k),
  })
  const figureTop = HEADER_TOP + (name ? name.height + Math.round(56 * k) : 24)
  const figureBottom = figureTop + numeral.height
  const height = figureBottom + (heading ? heading.space + heading.height : 0) + Math.round(110 * k)

  return {
    height,
    space: 0,
    draw() {
      const foot = height - SWING * 0.4
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(W, 0)
      ctx.lineTo(W, foot - SWING)
      ctx.bezierCurveTo(W * 0.66, foot - SWING * 2.6, W * 0.36, foot + SWING * 2.2, 0, foot + SWING)
      ctx.closePath()

      const fill = ctx.createLinearGradient(0, 0, W, height)
      fill.addColorStop(0, theme.accent)
      fill.addColorStop(1, mix(theme.accent, theme.bg[1], 0.22))
      ctx.fillStyle = fill
      ctx.fill()
      ctx.clip()
      drawRings(ctx, theme.onAccent, W * 0.97, H * 0.035, { from: W * 0.148, step: W * 0.07, count: 9, alpha: 0.16 })
      ctx.restore()

      name?.draw(HEADER_TOP)
      numeral.draw(CENTER, figureBottom, theme.onAccent)
      heading?.draw(figureBottom + heading.space)

      const right = CENTER + numeral.width / 2
      const left = CENTER - numeral.width / 2
      const faint = withAlpha(theme.onAccent, 0.8)
      drawSparkle(ctx, right + sparkle + 12, figureTop + sparkle * 0.3, sparkle, theme.onAccent)
      drawSparkle(ctx, right + sparkle * 0.9, figureTop + sparkle * 2.6, sparkle * 0.4, faint)
      drawSparkle(ctx, left - sparkle * 0.7, figureBottom - sparkle * 0.6, sparkle * 0.55, faint)
    },
  }
}
