import { drawStack, fitBlocks, present, spreadBlocks } from '@/lib/canvas/blocks'
import { mix, withAlpha } from '@/lib/canvas/color'
import { roundedRect } from '@/lib/canvas/shapes'
import { ellipsize, withLetterSpacing, wrapLines } from '@/lib/canvas/text'
import { drawRings } from '@/lib/story/draw'
import {
  type Design,
  drawEmblem,
  drawPaper,
  drawSignOff,
  hasEmblem,
  nameBlock,
  paperInk,
  sansFont,
  serifFont,
  signOffReach,
  strongFont,
  textBlock,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Band: a tall panel of the accent colour down the left holds the school —
// its mark, its name, where and when — and the white page beside it holds
// the student. Bold, and still mostly white paper.
//
//   ┌──────┐
//   │█(AB)█│  CERTIFICATE ─
//   │█ANNA█│  Mariam Hakobyan
//   │█    █│  for successfully completing the course
//   │█    █│  Manicure & nail design
//   │█2026█│  ________     ( SEAL )     ________
//   └──────┘
// ─────────────────────────────────────────────────────────────

/** The panel's inset from the edge (what an office printer reaches) and its width. */
const MARGIN = 54
const PANEL = 600

export const band: Design = (ctx, c, theme) => {
  const { width: W, height: H, draft } = c
  const ink = paperInk(theme)
  drawPaper(ctx, c)

  // The panel: the accent, lit from its top corner, the rings rising from its foot.
  const panelH = H - MARGIN * 2
  ctx.save()
  roundedRect(ctx, MARGIN, MARGIN, PANEL, panelH, 22)
  const fill = ctx.createLinearGradient(MARGIN, MARGIN, MARGIN + PANEL, H - MARGIN)
  fill.addColorStop(0, theme.accent)
  fill.addColorStop(1, mix(theme.accent, theme.bg[1], 0.26))
  ctx.fillStyle = fill
  ctx.fill()
  ctx.clip()
  drawRings(ctx, theme.onAccent, MARGIN, H - MARGIN, { from: 170, step: 80, count: 9, alpha: 0.16 })
  ctx.restore()

  const cx = MARGIN + PANEL / 2
  const emblem = 170
  const emblemY = MARGIN + 170
  if (hasEmblem(c)) {
    if (c.logo) {
      // A logo sits on a white tile, so any logo reads on any colour.
      roundedRect(ctx, cx - 160, emblemY - 120, 320, 240, 24)
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
    }
    drawEmblem(ctx, c, cx, emblemY, emblem, { ring: withAlpha(theme.onAccent, 0.8), letters: theme.onAccent })
  }

  const onAccent = theme.onAccent
  const school = draft.school.trim().toUpperCase()
  if (school) {
    // Measured with its spacing on, and wrapped rather than cut: a long
    // academy name takes two or three lines of the panel.
    ctx.font = strongFont(24)
    ctx.fillStyle = withAlpha(onAccent, 0.92)
    ctx.textAlign = 'center'
    withLetterSpacing(ctx, '5px', () => {
      const lines = wrapLines(ctx, school, PANEL - 100, 3)
      const first = emblemY + (hasEmblem(c) ? 170 : 0)
      lines.forEach((line, i) => ctx.fillText(line, cx + 2.5, first + i * 38))
    })
  }

  // Where, when and which, at the panel's foot.
  ctx.font = sansFont(24)
  ctx.fillStyle = withAlpha(onAccent, 0.86)
  ctx.textAlign = 'center'
  const lines = [c.labels.issued, draft.number.trim() ? `№ ${draft.number.trim()}` : ''].filter(Boolean)
  lines.forEach((line, i) => ctx.fillText(ellipsize(ctx, line, PANEL - 90), cx, H - MARGIN - 80 - (lines.length - 1 - i) * 40))

  // The page beside it.
  const left = MARGIN + PANEL + 120
  const right = W - 140
  const width = right - left
  const lineY = H - 230
  const top = 170
  const bottom = lineY - signOffReach(c) - 30

  const blocks = fitBlocks(
    (k) =>
      present([
        textBlock(ctx, draft.heading, { font: strongFont, size: Math.round(32 * k), color: ink.accent, maxWidth: width, x: left, align: 'left', tracking: 0.26, upper: true }),
        {
          height: 3,
          space: Math.round(30 * k),
          draw: (y) => {
            ctx.fillStyle = ink.accent
            ctx.fillRect(left, y, 140, 3)
          },
        },
        nameBlock(ctx, draft.recipient, { min: Math.round(80 * k), max: Math.round(132 * k), maxWidth: width, x: left, align: 'left', color: ink.text, space: Math.round(70 * k) }),
        textBlock(ctx, draft.wording, { font: sansFont, size: Math.round(32 * k), color: ink.muted, maxWidth: width, x: left, align: 'left', space: Math.round(50 * k) }),
        textBlock(ctx, draft.course, { font: serifFont, size: Math.round(62 * k), shrink: 0.8, whole: true, color: ink.accent, maxWidth: width, x: left, align: 'left', space: Math.round(24 * k) }),
        textBlock(ctx, draft.details, { font: sansFont, size: Math.round(28 * k), color: ink.muted, maxWidth: width, x: left, align: 'left', space: Math.round(22 * k) }),
      ]),
    bottom - top,
  )
  drawStack(spreadBlocks(blocks, bottom - top), top, bottom)
  drawSignOff(ctx, c, ink, { left: left - 40, right: right + 20, lineY })
}
