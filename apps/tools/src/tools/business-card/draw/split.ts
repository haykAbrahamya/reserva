import { drawStack } from '@/lib/canvas/blocks'
import { withAlpha } from '@/lib/canvas/color'
import {
  H,
  SAFE,
  W,
  type Face,
  drawGround,
  drawMark,
  drawMonogram,
  drawPanel,
  drawQrTile,
  fitContacts,
  identityBlocks,
  qrHeight,
} from './kit'
import { PRINT } from '../model'

// ─────────────────────────────────────────────────────────────
// Two-tone: a panel of the accent colour holds the mark — the initials on
// the front, the QR code on the back, on opposite sides so the card reads
// as one object turned over.
//
//   front                          back
//   ┌──────┬───────────────┐       ┌───────────────┬──────┐
//   │██████│ NAIL ARTIST   │       │ ◎ @anna.nails │█▣▣▣██│
//   │██AP██│ Anna Petrosyan│       │ ☏ +374 …      │█▣▣▣██│
//   │██████│ ──            │       │ ⌖ Tumanyan 20 │█INSTA│
//   └──────┴───────────────┘       └───────────────┴──────┘
// ─────────────────────────────────────────────────────────────

/** The front panel's right edge; the back's panel is as wide, on the other side. */
const PANEL = 660

export const splitFront: Face = (ctx, c, theme) => {
  drawGround(ctx, theme)
  drawPanel(ctx, theme, -PRINT.bleed, PANEL, [0, H])
  drawMonogram(ctx, c.initials, PANEL / 2, H / 2, 200, { letters: theme.onAccent })
  const left = PANEL + 120
  drawStack(identityBlocks(ctx, c, theme, { left, maxWidth: W - SAFE - left }), 0, H)
}

export const splitBack: Face = (ctx, c, theme) => {
  drawGround(ctx, theme)
  const panelLeft = W - PANEL
  drawPanel(ctx, theme, panelLeft, W + PRINT.bleed, [W, 0])
  const panelCenter = panelLeft + PANEL / 2

  if (c.qr) {
    const size = 360
    drawQrTile(ctx, c.qr, theme, {
      x: panelCenter - size / 2,
      y: (H - qrHeight(size)) / 2,
      size,
      captionColor: withAlpha(theme.onAccent, 0.9),
    })
  } else {
    drawMonogram(ctx, c.initials, panelCenter, H / 2, 180, { letters: theme.onAccent })
  }
  drawMark(ctx, theme.muted, SAFE)

  const maxWidth = panelLeft - 110 - SAFE
  if (c.contacts.length) {
    const contacts = fitContacts(ctx, c.contacts, theme, { max: 50, min: 30, maxWidth, room: H - SAFE * 2 - 60 })
    drawStack([{ height: contacts.height, space: 0, draw: (top) => contacts.drawAt(SAFE, top) }], SAFE, H - SAFE - 40)
  } else {
    drawStack(identityBlocks(ctx, c, theme, { left: SAFE, maxWidth }), 0, H)
  }
}
