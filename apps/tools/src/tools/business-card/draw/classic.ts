import { drawStack, present, type Block } from '@/lib/canvas/blocks'
import { withAlpha } from '@/lib/canvas/color'
import { drawOrnament } from '@/lib/story/draw'
import {
  CX,
  H,
  SAFE,
  W,
  type Face,
  capsWidth,
  drawCaps,
  drawGround,
  drawMark,
  drawMonogram,
  drawName,
  drawQrTile,
  fitContacts,
  layoutName,
  nameWidth,
  qrHeight,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Classic: everything centred, the initials in a fine double ring, the name
// in the house serif — the set's own story header, as a card.
//
//   front                          back
//   ┌──────────────────────┐       ┌──────────────────────┐
//   │         (AP)         │       │ Anna Petrosyan │ ▣▣▣ │
//   │    Anna Petrosyan    │       │ NAIL ARTIST    │ ▣▣▣ │
//   │        ──◆──         │       │ ◎ @anna.nails  │ ▣▣▣ │
//   │     NAIL ARTIST      │       │ ☏ +374 …       │INSTA│
//   └──────────────────────┘       └──────────────────────┘
// ─────────────────────────────────────────────────────────────

export const classicFront: Face = (ctx, c, theme) => {
  drawGround(ctx, theme)
  const r = 116
  const name = layoutName(ctx, c.draft.name, W - SAFE * 2 - 120, { min: 76, max: 128 })
  const role = c.draft.role.trim()
  const roleSize = 38

  const monogram: Block | null = c.initials
    ? { height: r * 2, space: 0, draw: (top) => drawMonogram(ctx, c.initials, CX, top + r, r, { ring: theme.accent, letters: theme.text }) }
    : null
  const nameBlock: Block | null = name
    ? { height: name.height, space: 74, draw: (top) => drawName(ctx, name, CX, top, theme.text) }
    : null
  const ornament: Block | null =
    name && role ? { height: 16, space: 52, draw: (top) => drawOrnament(ctx, theme, CX, top + 8) } : null
  const roleBlock: Block | null = role
    ? {
        height: Math.round(roleSize * 0.74),
        space: 48,
        draw: (top) => drawCaps(ctx, role, CX, top + roleSize * 0.74, { size: roleSize, color: theme.accent, align: 'center' }),
      }
    : null

  drawStack(present([monogram, nameBlock, ornament, roleBlock]), 0, H)
}

export const classicBack: Face = (ctx, c, theme) => {
  drawGround(ctx, theme)
  drawMark(ctx, theme.muted, SAFE)

  // Nothing to list: the back carries the mark alone, as a logo would.
  if (!c.contacts.length && !c.qr) {
    drawMonogram(ctx, c.initials, CX, H / 2, 150, { ring: theme.accent, letters: theme.text })
    return
  }

  const qrSize = 380
  const qrX = W - SAFE - qrSize
  const columnRight = c.qr ? qrX - 130 : W - SAFE
  const maxWidth = columnRight - SAFE

  const name = layoutName(ctx, c.draft.name, maxWidth, { min: 44, max: 62 })
  const role = c.draft.role.trim()
  const roleSize = 28
  const header = (name ? name.height : 0) + (role ? (name ? 36 : 0) + roleSize * 0.74 : 0)
  const room = H - SAFE * 2 - 60 - (header ? header + 64 : 0)
  const contacts = fitContacts(ctx, c.contacts, theme, { max: 50, min: 30, maxWidth, room })

  // The column is left-aligned; with no QR beside it, the whole column is centred.
  const columnWidth = Math.min(
    maxWidth,
    Math.max(contacts.width, name ? nameWidth(ctx, name) : 0, role ? capsWidth(ctx, role, roleSize) : 0),
  )
  const left = c.qr ? SAFE : Math.round((W - columnWidth) / 2)

  const blocks = present([
    name ? { height: name.height, space: 0, draw: (top: number) => drawName(ctx, name, left, top, theme.text, 'left') } : null,
    role
      ? {
          height: Math.round(roleSize * 0.74),
          space: name ? 36 : 0,
          draw: (top: number) => drawCaps(ctx, role, left, top + roleSize * 0.74, { size: roleSize, color: theme.accent, maxWidth }),
        }
      : null,
    contacts.height ? { height: contacts.height, space: header ? 64 : 0, draw: (top: number) => contacts.drawAt(left, top) } : null,
  ])
  drawStack(blocks, SAFE, H - SAFE - 40)

  if (c.qr) {
    drawQrTile(ctx, c.qr, theme, { x: qrX, y: (H - qrHeight(qrSize)) / 2, size: qrSize, captionColor: theme.muted })
    ctx.strokeStyle = withAlpha(theme.accent, 0.28)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(qrX - 65, SAFE + 30)
    ctx.lineTo(qrX - 65, H - SAFE - 30)
    ctx.stroke()
  }
}
