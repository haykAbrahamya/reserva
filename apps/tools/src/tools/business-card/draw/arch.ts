import { drawStack } from '@/lib/canvas/blocks'
import { withAlpha } from '@/lib/canvas/color'
import { PRINT } from '../model'
import {
  H,
  SAFE,
  W,
  type Face,
  accentFill,
  drawGround,
  drawMark,
  drawMonogram,
  drawQrTile,
  fitContacts,
  identityBlocks,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Arch: the window shape beauty brands love, rising from the card's bottom
// edge — filled, inside a hairline echo of itself, on the front; a frame for
// the QR code on the back.
//
//   front                          back
//   ┌──────────────────────┐       ┌──────────────────────┐
//   │ ╭──╮   NAIL ARTIST   │       │ ◎ @anna.nails   ╭──╮ │
//   │ │AP│   Anna Petrosyan│       │ ☏ +374 …        │▣▣│ │
//   │ │  │   ──            │       │ ⌖ Tumanyan 20   │▣▣│ │
//   └─┴──┴─────────────────┘       └─────────────────┴──┴─┘
// ─────────────────────────────────────────────────────────────

const FRONT = { x: 170, width: 460, top: 130 }
/** The gap between the filled arch and its hairline echo. */
const ECHO = 28

/** An arch from `top` down past the card's edge: a semicircle on two straight sides, left open at the foot. */
function archPath(ctx: CanvasRenderingContext2D, x: number, width: number, top: number) {
  const r = width / 2
  const foot = H + PRINT.bleed
  ctx.beginPath()
  ctx.moveTo(x, foot)
  ctx.lineTo(x, top + r)
  ctx.arc(x + r, top + r, r, Math.PI, 0)
  ctx.lineTo(x + width, foot)
}

export const archFront: Face = (ctx, c, theme) => {
  drawGround(ctx, theme)
  const { x, width, top } = FRONT

  archPath(ctx, x - ECHO, width + ECHO * 2, top - ECHO)
  ctx.strokeStyle = withAlpha(theme.accent, 0.55)
  ctx.lineWidth = 3
  ctx.stroke()

  archPath(ctx, x, width, top)
  ctx.closePath()
  ctx.fillStyle = accentFill(ctx, theme, x, top, x + width, H)
  ctx.fill()

  drawMonogram(ctx, c.initials, x + width / 2, top + width / 2 + 100, 170, { letters: theme.onAccent })
  const left = x + width + ECHO + 110
  drawStack(identityBlocks(ctx, c, theme, { left, maxWidth: W - SAFE - left }), 0, H)
}

export const archBack: Face = (ctx, c, theme) => {
  drawGround(ctx, theme)
  drawMark(ctx, theme.muted, SAFE)

  const width = 440
  const x = W - SAFE - width + 20
  const top = 110
  const cx = x + width / 2

  archPath(ctx, x, width, top)
  ctx.closePath()
  ctx.fillStyle = theme.surface
  ctx.fill()
  archPath(ctx, x, width, top)
  ctx.strokeStyle = withAlpha(theme.accent, 0.55)
  ctx.lineWidth = 3
  ctx.stroke()

  if (c.qr) {
    const size = 320
    drawQrTile(ctx, c.qr, theme, { x: cx - size / 2, y: top + width / 2 + 10, size, captionColor: theme.muted })
  } else {
    drawMonogram(ctx, c.initials, cx, top + width / 2 + 120, 150, { letters: theme.accent })
  }

  const maxWidth = x - 120 - SAFE
  if (c.contacts.length) {
    const contacts = fitContacts(ctx, c.contacts, theme, { max: 50, min: 30, maxWidth, room: H - SAFE * 2 - 60 })
    drawStack([{ height: contacts.height, space: 0, draw: (y) => contacts.drawAt(SAFE, y) }], SAFE, H - SAFE - 40)
  } else {
    drawStack(identityBlocks(ctx, c, theme, { left: SAFE, maxWidth }), 0, H)
  }
}
