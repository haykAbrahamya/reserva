import { drawStack, fitBlocks, present, spreadBlocks } from '@/lib/canvas/blocks'
import { ellipsize, withLetterSpacing, wrapLines } from '@/lib/canvas/text'
import { hasSigner } from '../model'
import {
  SEAL_RADIUS,
  SIGNATURE,
  type Design,
  drawEmblem,
  drawPaper,
  drawSealPlace,
  drawSigner,
  emblemWidth,
  hasEmblem,
  issuedLine,
  nameBlock,
  paperInk,
  sansFont,
  serifFont,
  strongFont,
  textBlock,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Minimal: no frame, wide margins, everything aligned to one left edge —
// the white space is the design. The student's name, very large, is the
// page; the rest is set small and quiet around it.
//
//   CERTIFICATE ─                                   (AB)
//                                       ANNA BEAUTY ACADEMY
//
//   Mariam Hakobyan
//   for successfully completing the course
//   Manicure & nail design
//
//   ________   ________                           ( SEAL )
//   Anna P.    Lilit S.          Yerevan, 16 October 2026
// ─────────────────────────────────────────────────────────────

const MARGIN = 170

export const minimal: Design = (ctx, c, theme) => {
  const { width: W, height: H, draft } = c
  const ink = paperInk(theme)
  drawPaper(ctx, c)

  // The title as a small tracked kicker, a short rule under it.
  const kickerTop = 150
  const kicker = textBlock(ctx, draft.heading, { font: strongFont, size: 30, color: ink.accent, maxWidth: W * 0.5, x: MARGIN, align: 'left', tracking: 0.26, upper: true })
  kicker?.draw(kickerTop)
  ctx.fillStyle = ink.accent
  ctx.fillRect(MARGIN, kickerTop + 62, 140, 3)

  // The school, top right: its mark, its name under it.
  const emblem = 116
  if (hasEmblem(c)) {
    drawEmblem(ctx, c, W - MARGIN - emblemWidth(c, emblem) / 2, kickerTop + emblem / 2 - 20, emblem, { ring: ink.accent, letters: ink.text })
  }
  const school = draft.school.trim().toUpperCase()
  if (school) {
    ctx.font = strongFont(22)
    ctx.fillStyle = ink.muted
    ctx.textAlign = 'right'
    withLetterSpacing(ctx, '5px', () => {
      const lines = wrapLines(ctx, school, W * 0.4, 2)
      const first = kickerTop + (hasEmblem(c) ? emblem + 22 : 22)
      lines.forEach((line, i) => ctx.fillText(line, W - MARGIN + 5, first + i * 34))
    })
  }

  const lineY = H - 226
  const top = 360
  const bottom = lineY - SIGNATURE.room - 40
  const width = W - MARGIN * 2

  const blocks = fitBlocks(
    (k) =>
      present([
        nameBlock(ctx, draft.recipient, { min: Math.round(84 * k), max: Math.round(150 * k), maxWidth: width, x: MARGIN, align: 'left', color: ink.text }),
        textBlock(ctx, draft.wording, { font: sansFont, size: Math.round(32 * k), color: ink.muted, maxWidth: width, x: MARGIN, align: 'left', space: Math.round(56 * k) }),
        textBlock(ctx, draft.course, { font: serifFont, size: Math.round(64 * k), shrink: 0.8, whole: true, color: ink.accent, maxWidth: width, x: MARGIN, align: 'left', space: Math.round(26 * k) }),
        textBlock(ctx, draft.details, { font: sansFont, size: Math.round(28 * k), color: ink.muted, maxWidth: width, x: MARGIN, align: 'left', space: Math.round(24 * k) }),
      ]),
    bottom - top,
  )
  drawStack(spreadBlocks(blocks, bottom - top), top, bottom)

  // Signatures from the left edge; the stamp and the date at the right.
  const signers = draft.signers.filter(hasSigner)
  signers.forEach((signer, i) => drawSigner(ctx, signer, MARGIN + i * (SIGNATURE.width + 90), lineY, ink, { align: 'left' }))

  const issued = issuedLine(c)
  if (issued) {
    ctx.font = sansFont(24)
    ctx.fillStyle = ink.muted
    ctx.textAlign = 'right'
    ctx.fillText(ellipsize(ctx, issued, W * 0.36), W - MARGIN, lineY + 86)
  }
  if (draft.seal) drawSealPlace(ctx, W - MARGIN - SEAL_RADIUS, lineY - 76, ink, c.labels.seal)
}
