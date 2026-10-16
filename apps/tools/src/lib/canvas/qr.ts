import { QrCodeDataType, encode } from 'uqr'
import { addRoundedRect, roundedRect } from './shapes'

// ─────────────────────────────────────────────────────────────
// A QR code drawn on a canvas — styled, but built to scan: round dots for
// the data, rounded squares for the three finder "eyes" a camera looks for
// first, dark on a light tile whose margin is the quiet zone every scanner
// needs. Error correction M, so a dot lost to a printer's ink spread does
// not cost the code.
// ─────────────────────────────────────────────────────────────

interface QrStyle {
  /** The tile's top-left corner and side. */
  x: number
  y: number
  size: number
  /** The dots: dark, for contrast. */
  ink: string
  /** The tile: light. */
  paper: string
}

/** The tile's margin as a share of its side — the quiet zone, ≥ 2 modules at any size a card needs. */
const QUIET = 0.085

export function drawQr(ctx: CanvasRenderingContext2D, text: string, { x, y, size, ink, paper }: QrStyle) {
  const qr = encode(text, { ecc: 'M', border: 0 })
  const quiet = size * QUIET
  const cell = (size - quiet * 2) / qr.size
  const left = x + quiet
  const top = y + quiet

  roundedRect(ctx, x, y, size, size, size * 0.1)
  ctx.fillStyle = paper
  ctx.fill()

  ctx.fillStyle = ink
  ctx.beginPath()
  for (let row = 0; row < qr.size; row++) {
    for (let col = 0; col < qr.size; col++) {
      if (!qr.data[row][col] || qr.types[row][col] === QrCodeDataType.Position) continue
      const cx = left + (col + 0.5) * cell
      const cy = top + (row + 0.5) * cell
      ctx.moveTo(cx + cell * 0.46, cy)
      ctx.arc(cx, cy, cell * 0.46, 0, Math.PI * 2)
    }
  }
  ctx.fill()

  const far = (qr.size - 7) * cell
  for (const [dx, dy] of [[0, 0], [far, 0], [0, far]]) eye(ctx, left + dx, top + dy, cell)
}

/** A finder pattern: a 7-module ring around a 3-module centre, both rounded. */
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, cell: number) {
  ctx.beginPath()
  addRoundedRect(ctx, x, y, cell * 7, cell * 7, cell * 2.2)
  addRoundedRect(ctx, x + cell, y + cell, cell * 5, cell * 5, cell * 1.4)
  ctx.fill('evenodd')
  roundedRect(ctx, x + cell * 2, y + cell * 2, cell * 3, cell * 3, cell * 1)
  ctx.fill()
}
