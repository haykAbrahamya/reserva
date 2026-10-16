import { drawStack, fitBlocks, present, spreadBlocks } from '@/lib/canvas/blocks'
import { mix, withAlpha } from '@/lib/canvas/color'
import { drawMonogram } from '@/lib/canvas/monogram'
import { drawRimText } from '@/lib/canvas/rim'
import { drawSparkle } from '@/lib/canvas/shapes'
import type { StoryTheme } from '@/lib/story/themes'
import { hasSigner } from '../model'
import {
  SIGNATURE,
  type CertContent,
  type Design,
  drawPaper,
  drawSealPlace,
  drawSigner,
  issuedLine,
  nameBlock,
  paperInk,
  sansFont,
  serifFont,
  strongFont,
  textBlock,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Medallion: modern and asymmetric. The student on the left, set large and
// aligned to one edge; on the right a big round medal in the accent, the
// title and the school running round its rim like the words round a stamp,
// the school's mark at its heart. A hairline frames the page.
//
//   ┌──────────────────────────────────────────────┐
//   │ CERTIFICATE ─                   ✦  ╭~~~~~~╮   │
//   │                                  ╭ CERTIF  ╮  │
//   │ Mariam Hakobyan                  (   AB    ) │
//   │ for successfully completing      ╰ ANNA B. ╯  │
//   │ Manicure & nail design              ╰~~~~~╯ ✦ │
//   │ ________   ________                  (SEAL)   │
//   └──────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────

const FRAME = 64
const MARGIN = 170
const RADIUS = 300

export const medallion: Design = (ctx, c, theme) => {
  const { width: W, height: H, draft } = c
  const ink = paperInk(theme)
  drawPaper(ctx, c)

  ctx.strokeStyle = ink.line
  ctx.lineWidth = 2
  ctx.strokeRect(FRAME, FRAME, W - FRAME * 2, H - FRAME * 2)

  const cx = W - MARGIN - RADIUS + 20
  const cy = H / 2 - 60
  drawMedal(ctx, c, theme, cx, cy, RADIUS)
  drawSparkle(ctx, cx - RADIUS - 30, cy - RADIUS + 70, 34, ink.accent)
  drawSparkle(ctx, cx - RADIUS + 10, cy - RADIUS + 10, 13, ink.accent)
  drawSparkle(ctx, cx + RADIUS + 20, cy + RADIUS - 60, 22, ink.accent)

  const width = cx - RADIUS - 120 - MARGIN
  const lineY = H - 214
  const top = 170
  const bottom = lineY - SIGNATURE.room - 30
  const blocks = fitBlocks(
    (k) =>
      present([
        textBlock(ctx, draft.heading, { font: strongFont, size: Math.round(32 * k), color: ink.accent, maxWidth: width, x: MARGIN, align: 'left', tracking: 0.3, upper: true }),
        {
          height: 3,
          space: Math.round(30 * k),
          draw: (y) => {
            ctx.fillStyle = ink.accent
            ctx.fillRect(MARGIN, y, 140, 3)
          },
        },
        nameBlock(ctx, draft.recipient, { min: Math.round(80 * k), max: Math.round(130 * k), maxWidth: width, x: MARGIN, align: 'left', color: ink.text, space: Math.round(64 * k) }),
        textBlock(ctx, draft.wording, { font: sansFont, size: Math.round(30 * k), color: ink.muted, maxWidth: width, x: MARGIN, align: 'left', space: Math.round(48 * k) }),
        textBlock(ctx, draft.course, { font: serifFont, size: Math.round(60 * k), shrink: 0.8, whole: true, color: ink.accent, maxWidth: width, x: MARGIN, align: 'left', space: Math.round(24 * k) }),
        textBlock(ctx, draft.details, { font: sansFont, size: Math.round(26 * k), color: ink.muted, maxWidth: width, x: MARGIN, align: 'left', space: Math.round(22 * k) }),
        textBlock(ctx, issuedLine(c), { font: sansFont, size: 22, color: ink.muted, maxWidth: width, x: MARGIN, align: 'left', space: Math.round(30 * k) }),
      ]),
    bottom - top,
  )
  drawStack(spreadBlocks(blocks, bottom - top, 1.4), top, bottom)

  const signers = draft.signers.filter(hasSigner)
  const signatureWidth = Math.min(SIGNATURE.width, (width - 70) / 2)
  signers.forEach((signer, i) => drawSigner(ctx, signer, MARGIN + i * (signatureWidth + 70), lineY, ink, { align: 'left', width: signatureWidth }))
  if (draft.seal) drawSealPlace(ctx, cx, lineY - 24, ink, c.labels.seal)
}

/**
 * The medal: a disc of the accent, lit from the top left, two fine rings in
 * it; between them the title and the school round the rim; at the heart the
 * school's mark — a logo on a white disc, or the initials.
 */
function drawMedal(ctx: CanvasRenderingContext2D, c: CertContent, theme: StoryTheme, cx: number, cy: number, r: number) {
  ctx.save()
  ctx.shadowColor = 'rgba(30, 20, 15, 0.18)'
  ctx.shadowBlur = r * 0.16
  ctx.shadowOffsetY = r * 0.05
  const fill = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  fill.addColorStop(0, mix(theme.accent, '#FFFFFF', 0.16))
  fill.addColorStop(1, mix(theme.accent, theme.bg[1], 0.26))
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const line = withAlpha(theme.onAccent, 0.55)
  ctx.strokeStyle = line
  ctx.lineWidth = 2
  for (const ring of [0.95, 0.67]) {
    ctx.beginPath()
    ctx.arc(cx, cy, r * ring, 0, Math.PI * 2)
    ctx.stroke()
  }

  const rim = [c.draft.heading, c.draft.school].map((part) => part.trim().toUpperCase()).filter(Boolean).join('   ·   ')
  if (rim) {
    const size = Math.round(r * 0.078)
    ctx.save()
    ctx.translate(cx, cy)
    drawRimText(ctx, rim, { radius: r * 0.81, size, font: strongFont, color: withAlpha(theme.onAccent, 0.94), tracking: 0.26 })
    ctx.restore()
  }

  if (c.logo) {
    // The logo on a white disc, at the largest box of its own shape it holds.
    const disc = r * 0.6
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(cx, cy, disc, 0, Math.PI * 2)
    ctx.fill()
    const aspect = c.logo.naturalWidth / c.logo.naturalHeight
    const height = (disc * 2 * 0.84) / Math.sqrt(aspect * aspect + 1)
    const width = aspect * height
    ctx.drawImage(c.logo, cx - width / 2, cy - height / 2, width, height)
  } else if (c.initials) {
    drawMonogram(ctx, c.initials, cx, cy, r * 0.55, { letters: theme.onAccent })
  }
}
