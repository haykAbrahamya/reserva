import { drawStack, fitBlocks, present, spreadBlocks } from '@/lib/canvas/blocks'
import { withAlpha } from '@/lib/canvas/color'
import { roundedRect } from '@/lib/canvas/shapes'
import { drawBackground } from '@/lib/story/draw'
import {
  type Design,
  dividerBlock,
  drawPaper,
  drawRosette,
  drawSignOff,
  groundInk,
  issuedLine,
  nameBlock,
  sansFont,
  serifFont,
  signOffReach,
  strongFont,
  textBlock,
  titleFont,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Luxe: the certificate in full colour — the palette's own ground, glows and
// rings, as on the stories — inside a fine double frame, with an award
// rosette at the top bearing the school's mark. On Noir or Mocha it is dark
// with gold; on the light palettes, soft and tinted.
//
// The colour stops a few millimetres short of the paper's edge, so it prints
// the same on an office printer, which cannot print to the edge, as at a shop.
// ─────────────────────────────────────────────────────────────

const MARGIN = 44

export const luxe: Design = (ctx, c, theme) => {
  const { width: W, height: H, draft } = c
  const ink = groundInk(theme)
  drawPaper(ctx, c)

  const panelW = W - MARGIN * 2
  const panelH = H - MARGIN * 2
  ctx.save()
  roundedRect(ctx, MARGIN, MARGIN, panelW, panelH, 24)
  ctx.clip()
  ctx.translate(MARGIN, MARGIN)
  drawBackground(ctx, theme, panelW, panelH)
  ctx.restore()

  for (const [inset, alpha, lineWidth] of [[34, 0.65, 2], [46, 0.3, 1.2]] as const) {
    roundedRect(ctx, MARGIN + inset, MARGIN + inset, panelW - inset * 2, panelH - inset * 2, 14)
    ctx.strokeStyle = withAlpha(theme.accent, alpha)
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }

  // A rosette bearing a logo is a little larger, so the logo on it reads.
  const r = c.logo ? 100 : 84
  const rosetteY = MARGIN + 56 + r + 24
  drawRosette(ctx, c, theme, W / 2, rosetteY, r)

  const x = W / 2
  const width = W - 2 * (MARGIN + 200)
  const lineY = H - 250
  const top = rosetteY + r * 1.7 + 44
  const bottom = lineY - signOffReach(c) - 24

  const blocks = fitBlocks(
    (k) =>
      present([
        textBlock(ctx, draft.school, { font: strongFont, size: Math.round(24 * k), color: ink.muted, maxWidth: width, x, tracking: 0.22, upper: true }),
        textBlock(ctx, draft.heading, { font: titleFont, size: Math.round(92 * k), color: ink.accent, maxWidth: width, x, tracking: 0.14, upper: true, space: Math.round(26 * k) }),
        dividerBlock(ctx, x, ink.accent, Math.round(32 * k)),
        nameBlock(ctx, draft.recipient, { min: Math.round(70 * k), max: Math.round(116 * k), maxWidth: width, x, color: ink.text, space: Math.round(46 * k) }),
        textBlock(ctx, draft.wording, { font: sansFont, size: Math.round(32 * k), color: ink.muted, maxWidth: width, x, space: Math.round(44 * k) }),
        textBlock(ctx, draft.course, { font: serifFont, size: Math.round(58 * k), shrink: 0.8, whole: true, color: ink.accent, maxWidth: width, x, space: Math.round(22 * k) }),
        textBlock(ctx, draft.details, { font: sansFont, size: Math.round(28 * k), color: ink.muted, maxWidth: width, x, space: Math.round(20 * k) }),
        textBlock(ctx, issuedLine(c), { font: sansFont, size: 24, color: ink.muted, maxWidth: width, x, space: Math.round(34 * k) }),
      ]),
    bottom - top,
  )
  drawStack(spreadBlocks(blocks, bottom - top), top, bottom)
  drawSignOff(ctx, c, ink, { left: MARGIN + 180, right: W - MARGIN - 180, lineY })
}
