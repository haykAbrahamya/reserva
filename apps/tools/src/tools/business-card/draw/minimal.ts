import { withAlpha } from '@/lib/canvas/color'
import { ellipsize, wrapLines } from '@/lib/canvas/text'
import type { StoryTheme } from '@/lib/story/themes'
import type { Contact } from '../model'
import {
  H,
  SAFE,
  W,
  type Face,
  drawCaps,
  drawGround,
  drawMark,
  drawMonogram,
  drawName,
  drawQrTile,
  layoutName,
  qrHeight,
  textFont,
} from './kit'

// ─────────────────────────────────────────────────────────────
// Minimal: editorial and left-aligned. The name large at the foot of the
// front, the initials small in its corner; on the back, every contact under
// its own small label, like a magazine's credits.
//
//   front                          back
//   ┌──────────────────────┐       ┌──────────────────────┐
//   │ (ap)      @anna.nails│       │ Anna P.   NAIL ARTIST│
//   │ ──                   │       │──────────────────────│
//   │ NAIL ARTIST          │       │ INSTAGRAM  PHONE  ▣▣ │
//   │ Anna Petrosyan       │       │ @anna…     +374…  ▣▣ │
//   └──────────────────────┘       └──────────────────────┘
// ─────────────────────────────────────────────────────────────

export const minimalFront: Face = (ctx, c, theme) => {
  drawGround(ctx, theme)
  const r = 56
  if (c.initials) drawMonogram(ctx, c.initials, SAFE + r, SAFE + r, r, { ring: theme.accent, letters: theme.text })

  const handle = c.contacts.find((contact) => contact.icon === 'instagram')?.text
  if (handle) {
    ctx.font = textFont(36)
    ctx.fillStyle = theme.muted
    ctx.textAlign = 'right'
    ctx.fillText(ellipsize(ctx, handle, W / 2), W - SAFE, SAFE + r + 13)
  }

  // From the foot up: the name, the profession over it, a short rule over that.
  let bottom = H - SAFE
  const name = layoutName(ctx, c.draft.name, W - SAFE * 2, { min: 88, max: 138 })
  if (name) {
    const top = bottom - name.height
    drawName(ctx, name, SAFE, top, theme.text, 'left')
    bottom = top - 54
  }
  const role = c.draft.role.trim()
  if (role) {
    drawCaps(ctx, role, SAFE, bottom, { size: 32, color: theme.accent })
    bottom -= Math.round(32 * 0.74) + 46
  }
  if (name || role) {
    ctx.fillStyle = withAlpha(theme.accent, 0.7)
    ctx.fillRect(SAFE, bottom - 3, 110, 3)
  }
}

export const minimalBack: Face = (ctx, c, theme) => {
  drawGround(ctx, theme)
  drawMark(ctx, theme.muted, SAFE)

  // The header: the name, and the profession at the far end of its line,
  // each with its share of the line and a gap between them.
  const width = W - SAFE * 2
  const role = c.draft.role.trim()
  const name = layoutName(ctx, c.draft.name, role ? width * 0.58 : width, { min: 40, max: 58 })
  const headerBaseline = SAFE + (name ? Math.round(name.size * 0.74) : 24)
  if (name) drawName(ctx, name, SAFE, SAFE, theme.text, 'left')
  if (role) drawCaps(ctx, role, W - SAFE, headerBaseline, { size: 26, color: theme.accent, align: 'right', maxWidth: width * 0.36 })

  const ruleY = SAFE + (name ? name.height : 24) + 44
  ctx.fillStyle = withAlpha(theme.accent, 0.3)
  ctx.fillRect(SAFE, ruleY, width, 2)

  const top = ruleY + 70
  const bottom = H - SAFE - 40

  // Nothing to list: the initials, as a logo would sit on a card's back.
  if (!c.contacts.length && !c.qr) {
    drawMonogram(ctx, c.initials, W / 2, (top + bottom) / 2, 110, { ring: theme.accent, letters: theme.text })
    return
  }

  const qrSize = 280
  const qrX = W - SAFE - qrSize
  if (c.qr) drawQrTile(ctx, c.qr, theme, { x: qrX, y: top + (bottom - top - qrHeight(qrSize)) / 2, size: qrSize, captionColor: theme.muted })

  const right = c.qr ? qrX - 90 : W - SAFE
  drawCredits(ctx, c.contacts, theme, { left: SAFE, right, top, bottom })
}

/**
 * The size a value is set at in its column: the row's size, or smaller when
 * one unbreakable word — a long link — would otherwise be cut short.
 */
function cellSize(ctx: CanvasRenderingContext2D, text: string, column: number, size: number): number {
  const longest = text.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '')
  let fitted = size
  ctx.font = textFont(fitted)
  while (fitted > 28 && ctx.measureText(longest).width > column) {
    fitted -= 2
    ctx.font = textFont(fitted)
  }
  return fitted
}

/** The contacts two to a row, each under its label, centred in the room between `top` and `bottom`. */
function drawCredits(
  ctx: CanvasRenderingContext2D,
  contacts: Contact[],
  theme: StoryTheme,
  { left, right, top, bottom }: { left: number; right: number; top: number; bottom: number },
) {
  if (!contacts.length) return
  const gutter = 70
  const column = (right - left - gutter) / 2

  for (let size = 46; size >= 28; size -= 2) {
    const labelSize = Math.round(size * 0.52)
    const lineHeight = Math.round(size * 1.22)
    const subSize = Math.round(size * 0.7)
    const cells = contacts.map((contact) => {
      const textSize = cellSize(ctx, contact.text, column, size)
      ctx.font = textFont(textSize)
      const lines = wrapLines(ctx, contact.text, column, 2)
      return {
        contact,
        lines,
        textSize,
        height: labelSize + 20 + lines.length * lineHeight + (contact.sub ? Math.round(subSize * 1.35) : 0),
      }
    })
    const rows: Array<typeof cells> = []
    for (let i = 0; i < cells.length; i += 2) rows.push(cells.slice(i, i + 2))
    const rowGap = Math.round(size * 1)
    const heights = rows.map((row) => Math.max(...row.map((cell) => cell.height)))
    const total = heights.reduce((sum, h) => sum + h, 0) + rowGap * (rows.length - 1)
    if (total > bottom - top && size > 28) continue

    let y = top + Math.max(0, (bottom - top - total) / 2)
    rows.forEach((row, r) => {
      row.forEach((cell, i) => {
        const x = left + i * (column + gutter)
        drawCaps(ctx, cell.contact.label, x, y + labelSize * 0.74, { size: labelSize, color: theme.muted, maxWidth: column })
        ctx.font = textFont(cell.textSize)
        ctx.fillStyle = theme.text
        ctx.textAlign = 'left'
        const first = y + labelSize + 20 + lineHeight * 0.74
        cell.lines.forEach((line, l) => ctx.fillText(line, x, first + l * lineHeight))
        if (cell.contact.sub) {
          ctx.font = textFont(subSize)
          ctx.fillStyle = theme.muted
          ctx.fillText(cell.contact.sub, x, y + labelSize + 20 + cell.lines.length * lineHeight + subSize * 0.82)
        }
      })
      y += heights[r] + rowGap
    })
    return
  }
}
