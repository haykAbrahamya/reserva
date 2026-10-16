import { drawStack, fitBlocks, present, spreadBlocks, type Block } from '@/lib/canvas/blocks'
import { isDark, mix } from '@/lib/canvas/color'
import { roundedRect } from '@/lib/canvas/shapes'
import { ellipsize, withLetterSpacing } from '@/lib/canvas/text'
import type { StoryTheme } from '@/lib/story/themes'
import {
  type Design,
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
} from './kit'

// ─────────────────────────────────────────────────────────────
// Aura: soft clouds of the palette's colour drift across the page, and the
// certificate sits on a sheet of frosted glass over them — the soft
// gradient look of 2025, made only of the palette. The clouds stay inside a
// thin white margin, so it prints the same on an office printer as at a shop.
//
//      ░░▒▒▒░                          ░░▒▒
//    ░▒▓▓▒╭────────────────────────────╮▒░
//     ░▒▒░│            (AB)            │
//         │         CERTIFICATE        │
//         │       Mariam Hakobyan      │
//         │   Manicure & nail design   │
//         │ ________   (SEAL)  ________│░▒▒░
//         ╰────────────────────────────╯▒▓▓▒░
// ─────────────────────────────────────────────────────────────

/** The white border the clouds stop at: within what an office printer reaches. */
const MARGIN = 44

export const aura: Design = (ctx, c, theme) => {
  const { width: W, height: H, draft } = c
  const ink = paperInk(theme)
  drawPaper(ctx, c)
  ctx.save()
  roundedRect(ctx, MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2, 28)
  ctx.clip()
  drawClouds(ctx, W, H, theme)
  ctx.restore()

  // The glass: translucent white with a bright edge and a whisper of shadow.
  const card = { x: W * 0.1, y: H * 0.1, w: W * 0.8, h: H * 0.8 }
  ctx.save()
  ctx.shadowColor = 'rgba(30, 20, 15, 0.08)'
  ctx.shadowBlur = 70
  ctx.shadowOffsetY = 24
  roundedRect(ctx, card.x, card.y, card.w, card.h, 44)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.66)'
  ctx.fill()
  ctx.restore()
  roundedRect(ctx, card.x, card.y, card.w, card.h, 44)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
  ctx.lineWidth = 3
  ctx.stroke()

  const x = W / 2
  const width = card.w - 260
  const lineY = card.y + card.h - 150
  const top = card.y + 80
  const bottom = lineY - signOffReach(c) - 20

  const blocks = fitBlocks((k) => {
    const emblem = Math.round(108 * k)
    return present([
      hasEmblem(c) ? { height: emblem, space: 0, draw: (y) => drawEmblem(ctx, c, x, y + emblem / 2, emblem, { ring: ink.accent, letters: ink.text }) } : null,
      textBlock(ctx, draft.school, { font: strongFont, size: Math.round(22 * k), color: ink.muted, maxWidth: width, x, tracking: 0.24, upper: true, space: Math.round(26 * k) }),
      pillBlock(ctx, draft.heading, Math.round(30 * k), ink.accent, x, width, Math.round(40 * k)),
      nameBlock(ctx, draft.recipient, { min: Math.round(72 * k), max: Math.round(124 * k), maxWidth: width, x, color: ink.text, space: Math.round(44 * k) }),
      textBlock(ctx, draft.wording, { font: sansFont, size: Math.round(30 * k), color: ink.muted, maxWidth: width, x, space: Math.round(44 * k) }),
      textBlock(ctx, draft.course, { font: serifFont, size: Math.round(56 * k), shrink: 0.8, whole: true, color: ink.accent, maxWidth: width, x, space: Math.round(22 * k) }),
      textBlock(ctx, draft.details, { font: sansFont, size: Math.round(26 * k), color: ink.muted, maxWidth: width, x, space: Math.round(20 * k) }),
      textBlock(ctx, issuedLine(c), { font: sansFont, size: 22, color: ink.muted, maxWidth: width, x, space: Math.round(30 * k) }),
    ])
  }, bottom - top)
  drawStack(spreadBlocks(blocks, bottom - top), top, bottom)
  drawSignOff(ctx, c, ink, { left: card.x + 120, right: card.x + card.w - 120, lineY })
}

/** The title in tracked capitals inside a fine pill outline — a modern label. */
function pillBlock(ctx: CanvasRenderingContext2D, text: string, size: number, color: string, cx: number, maxWidth: number, space: number): Block | null {
  const value = text.trim().toUpperCase()
  if (!value) return null
  const spacing = Math.round(size * 0.4)
  const padX = size * 1.3
  const height = Math.round(size * 2.3)
  return {
    height,
    space,
    draw(top) {
      ctx.font = strongFont(size)
      let label = value
      let width = 0
      withLetterSpacing(ctx, `${spacing}px`, () => {
        label = ellipsize(ctx, value, maxWidth - padX * 2)
        width = ctx.measureText(label).width - spacing
      })
      roundedRect(ctx, cx - width / 2 - padX, top, width + padX * 2, height, height / 2)
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.55
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      withLetterSpacing(ctx, `${spacing}px`, () => ctx.fillText(label, cx + spacing / 2, top + height / 2 + size * 0.36))
    },
  }
}

/**
 * The clouds: large soft circles of the accent, a paler accent and a third
 * tint, each fading to nothing — overlapping into an aura. A light palette
 * lends its own pastel ground as the third; a dark one, a pale gold.
 */
function drawClouds(ctx: CanvasRenderingContext2D, W: number, H: number, theme: StoryTheme) {
  const dark = isDark(theme.bg[1])
  // A dark palette's accent is pale gold or caramel: it needs more of itself
  // to read as colour on white. A light palette's is deep: less goes further.
  const strength = dark ? 1 : 0.75
  const third = dark ? theme.bg[0] : theme.bg[1]
  const clouds: Array<[x: number, y: number, r: number, color: (alpha: number) => string, alpha: number]> = [
    [W * 0.1, H * 0.16, W * 0.52, (a) => mix(theme.accent, '#FFFFFF', 0.08, a), 0.9 * strength],
    [W * 0.92, H * 0.88, W * 0.5, (a) => mix(theme.accent, third, 0.18, a), 0.8 * strength],
    [W * 0.7, H * 0.02, W * 0.36, (a) => mix(theme.accent, '#FFFFFF', 0.45, a), 0.85],
    [W * 0.18, H * 0.98, W * 0.32, (a) => mix(theme.accent, '#FFFFFF', 0.3, a), 0.6],
  ]
  for (const [x, y, r, color, alpha] of clouds) {
    const cloud = ctx.createRadialGradient(x, y, 0, x, y, r)
    cloud.addColorStop(0, color(alpha))
    cloud.addColorStop(0.55, color(alpha * 0.45))
    cloud.addColorStop(1, color(0))
    ctx.fillStyle = cloud
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
}
