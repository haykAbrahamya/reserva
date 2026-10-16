import { drawStack, fitBlocks, present, spreadBlocks, type Block } from '@/lib/canvas/blocks'
import {
  type Design,
  type Ink,
  dividerBlock,
  drawEmblem,
  drawPaper,
  drawSignOff,
  hasEmblem,
  issuedLine,
  nameBlock,
  paperInk,
  sansFont,
  serifFont,
  signOffReach,
  strongFont,
  textBlock,
  titleFont,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Classic: white paper in a double frame — a bold rule and a hairline with
// notched corners — everything centred, the title in tracked capitals. The
// certificate everyone recognises, done with restraint.
//
//   ╔══════════════════════════════════════╗
//   ║ ╭──────────────────────────────────╮ ║
//   ║ │              (AB)                │ ║
//   ║ │       ANNA BEAUTY ACADEMY        │ ║
//   ║ │          C E R T I F I C A T E   │ ║
//   ║ │              ──◆──               │ ║
//   ║ │         Mariam Hakobyan          │ ║
//   ║ │  for successfully completing …   │ ║
//   ║ │      Manicure & nail design      │ ║
//   ║ │ ________     ( SEAL )   ________ │ ║
//   ║ ╰──────────────────────────────────╯ ║
//   ╚══════════════════════════════════════╝
// ─────────────────────────────────────────────────────────────

/** The frames' insets: inside what an office printer can reach (about 5 mm), on A5 too. */
const OUTER = 54
const INNER = 78
const NOTCH = 34

export const classic: Design = (ctx, c, theme) => {
  const { width: W, height: H, draft } = c
  const ink = paperInk(theme)
  drawPaper(ctx, c)
  drawFrame(ctx, W, H, ink)

  const lineY = H - 236
  const top = INNER + 70
  const bottom = lineY - signOffReach(c) - 26
  const x = W / 2
  const width = W - 2 * (INNER + 160)

  const blocks = fitBlocks((k) => {
    const emblem = Math.round(150 * k)
    const blocks: Array<Block | null> = [
      hasEmblem(c) ? { height: emblem, space: 0, draw: (y) => drawEmblem(ctx, c, x, y + emblem / 2, emblem, { ring: ink.accent, letters: ink.text }) } : null,
      textBlock(ctx, draft.school, { font: strongFont, size: Math.round(26 * k), color: ink.accent, maxWidth: width, x, tracking: 0.22, upper: true, space: Math.round(30 * k) }),
      textBlock(ctx, draft.heading, { font: titleFont, size: Math.round(100 * k), color: ink.text, maxWidth: width, x, tracking: 0.14, upper: true, space: Math.round(48 * k) }),
      dividerBlock(ctx, x, ink.accent, Math.round(34 * k)),
      nameBlock(ctx, draft.recipient, { min: Math.round(72 * k), max: Math.round(124 * k), maxWidth: width, x, color: ink.text, space: Math.round(50 * k) }),
      textBlock(ctx, draft.wording, { font: sansFont, size: Math.round(32 * k), color: ink.muted, maxWidth: width, x, space: Math.round(46 * k) }),
      textBlock(ctx, draft.course, { font: serifFont, size: Math.round(60 * k), shrink: 0.8, whole: true, color: ink.accent, maxWidth: width, x, space: Math.round(24 * k) }),
      textBlock(ctx, draft.details, { font: sansFont, size: Math.round(28 * k), color: ink.muted, maxWidth: width, x, space: Math.round(22 * k) }),
      textBlock(ctx, issuedLine(c), { font: sansFont, size: 24, color: ink.muted, maxWidth: width, x, space: Math.round(40 * k) }),
    ]
    return present(blocks)
  }, bottom - top)

  drawStack(spreadBlocks(blocks, bottom - top), top, bottom)
  drawSignOff(ctx, c, ink, { left: INNER + 120, right: W - INNER - 120, lineY })
}

/** A bold outer rule and, inside it, a hairline whose corners are notched inwards, a diamond in each notch. */
function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, ink: Ink) {
  ctx.strokeStyle = ink.accent
  ctx.lineWidth = 7
  ctx.strokeRect(OUTER, OUTER, W - OUTER * 2, H - OUTER * 2)

  const [x, y, w, h, r] = [INNER, INNER, W - INNER * 2, H - INNER * 2, NOTCH]
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arc(x + w, y, r, Math.PI, Math.PI / 2, true)
  ctx.lineTo(x + w, y + h - r)
  ctx.arc(x + w, y + h, r, -Math.PI / 2, -Math.PI, true)
  ctx.lineTo(x + r, y + h)
  ctx.arc(x, y + h, r, 0, -Math.PI / 2, true)
  ctx.lineTo(x, y + r)
  ctx.arc(x, y, r, Math.PI / 2, 0, true)
  ctx.closePath()
  ctx.strokeStyle = ink.line
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = ink.accent
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
    ctx.beginPath()
    ctx.moveTo(cx, cy - 10)
    ctx.lineTo(cx + 10, cy)
    ctx.lineTo(cx, cy + 10)
    ctx.lineTo(cx - 10, cy)
    ctx.closePath()
    ctx.fill()
  }
}
