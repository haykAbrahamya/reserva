import { present, type Block } from '@/lib/canvas/blocks'
import { mix, withAlpha } from '@/lib/canvas/color'
import { SANS, SERIF, font } from '@/lib/canvas/fonts'
import { ICONS, drawIcon } from '@/lib/canvas/icons'
import { drawQr } from '@/lib/canvas/qr'
import { roundedRect } from '@/lib/canvas/shapes'
import { ellipsize, fitFontSize, withLetterSpacing, wrapLines } from '@/lib/canvas/text'
import { BRAND_MARK, drawBackground, drawRings } from '@/lib/story/draw'
import type { StoryTheme } from '@/lib/story/themes'
import { CARD, PRINT, instagramLine, type CardDraft, type CardLabels, type Contact } from '../model'

// ─────────────────────────────────────────────────────────────
// The parts every card layout is built from, in card units: the card is
// 1800 × 1000 (90 × 50 mm at 20 px per mm), its ground runs 40 units (2 mm)
// past every edge into the bleed, and nothing that must survive the cut sits
// nearer the edge than SAFE.
// ─────────────────────────────────────────────────────────────

export const { width: W, height: H } = CARD
export const CX = W / 2
/** Keep-clear margin inside the cut: 5 mm, more than any print shop asks for. */
export const SAFE = 100

export const serifFont = (size: number) => font(500, size, SERIF)
export const capsFont = (size: number) => font(600, size, SANS)
export const textFont = (size: number) => font(500, size, SANS)
const markFont = font(500, 26, SANS)

/** Every face a card uses — what must be loaded before drawing. */
export const CARD_FONTS = [serifFont(110), capsFont(34), textFont(46), markFont] as const

/** What every layout draws: the draft, and what is worked out from it once. */
export interface CardContent {
  draft: CardDraft
  initials: string
  contacts: Contact[]
  /** The QR code's link and the word under it; null without one. */
  qr: { url: string; caption: string } | null
  labels: CardLabels
}

export type Face = (ctx: CanvasRenderingContext2D, content: CardContent, theme: StoryTheme) => void

// ── Ground ───────────────────────────────────────────────────

/** The palette's ground, glows and rings — the stories' own — run out into the bleed. */
export function drawGround(ctx: CanvasRenderingContext2D, theme: StoryTheme) {
  const bleed = PRINT.bleed
  ctx.save()
  ctx.translate(-bleed, -bleed)
  drawBackground(ctx, theme, W + bleed * 2, H + bleed * 2)
  ctx.restore()
}

/** The accent as a fill, lit from one corner: (x0, y0) bright, (x1, y1) a shade deeper. */
export function accentFill(ctx: CanvasRenderingContext2D, theme: StoryTheme, x0: number, y0: number, x1: number, y1: number) {
  const fill = ctx.createLinearGradient(x0, y0, x1, y1)
  fill.addColorStop(0, theme.accent)
  fill.addColorStop(1, mix(theme.accent, theme.bg[1], 0.24))
  return fill
}

/**
 * A full-height panel of the accent from x0 to x1 — run into the bleed above
 * and below — with the rings motif in it, radiating from `rings`.
 */
export function drawPanel(ctx: CanvasRenderingContext2D, theme: StoryTheme, x0: number, x1: number, rings: [number, number]) {
  const bleed = PRINT.bleed
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, -bleed, x1 - x0, H + bleed * 2)
  ctx.fillStyle = accentFill(ctx, theme, x0, -bleed, x1, H + bleed)
  ctx.fill()
  ctx.clip()
  drawRings(ctx, theme.onAccent, rings[0], rings[1], { from: 170, step: 78, count: 8, alpha: 0.16 })
  ctx.restore()
}

// ── Type ─────────────────────────────────────────────────────

/** Tracked capitals. The spacing trails the last letter, so centred and right-aligned lines are nudged back. */
export function drawCaps(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
  { size, color, align = 'left', maxWidth = W - SAFE * 2 }: { size: number; color: string; align?: CanvasTextAlign; maxWidth?: number },
) {
  const value = text.trim().toUpperCase()
  if (!value) return
  const spacing = Math.round(size * 0.26)
  const nudge = align === 'center' ? spacing / 2 : align === 'right' ? spacing : 0
  ctx.font = capsFont(size)
  ctx.fillStyle = color
  ctx.textAlign = align
  withLetterSpacing(ctx, `${spacing}px`, () => ctx.fillText(ellipsize(ctx, value, maxWidth), x + nudge, baseline))
}

export interface NameLayout {
  size: number
  lines: string[]
  lineHeight: number
  /** From the top of the capitals to the last baseline. */
  height: number
}

/** The name, as large as fits on one line between `min` and `max`; longer, it wraps onto a second. */
export function layoutName(
  ctx: CanvasRenderingContext2D,
  name: string,
  maxWidth: number,
  range: { min: number; max: number },
): NameLayout | null {
  const value = name.trim()
  if (!value) return null
  const fitted = fitFontSize(ctx, value, maxWidth, range, serifFont)
  const size = fitted ?? range.min
  ctx.font = serifFont(size)
  const lines = fitted ? [value] : wrapLines(ctx, value, maxWidth, 2)
  const lineHeight = Math.round(size * 1.1)
  return { size, lines, lineHeight, height: Math.round(size * 0.74) + (lines.length - 1) * lineHeight }
}

/** The widest line of a laid-out name. */
export function nameWidth(ctx: CanvasRenderingContext2D, name: NameLayout): number {
  ctx.font = serifFont(name.size)
  return Math.max(...name.lines.map((line) => ctx.measureText(line).width))
}

/** How wide a line of tracked capitals draws (see drawCaps). */
export function capsWidth(ctx: CanvasRenderingContext2D, text: string, size: number): number {
  ctx.font = capsFont(size)
  let width = 0
  withLetterSpacing(ctx, `${Math.round(size * 0.26)}px`, () => {
    width = ctx.measureText(text.trim().toUpperCase()).width
  })
  return width
}

/** Draws a laid-out name with the top of its capitals at `top`. */
export function drawName(
  ctx: CanvasRenderingContext2D,
  name: NameLayout,
  x: number,
  top: number,
  color: string,
  align: CanvasTextAlign = 'center',
) {
  ctx.font = serifFont(name.size)
  ctx.fillStyle = color
  ctx.textAlign = align
  name.lines.forEach((line, i) => ctx.fillText(line, x, top + name.size * 0.74 + i * name.lineHeight))
}

/**
 * The name side of a card whose other half is a mark: the profession in
 * tracked capitals, the name, a short rule, the Instagram — left-aligned at
 * `left`, to be stacked and centred.
 */
export function identityBlocks(
  ctx: CanvasRenderingContext2D,
  c: CardContent,
  theme: StoryTheme,
  { left, maxWidth, range = { min: 68, max: 106 } }: { left: number; maxWidth: number; range?: { min: number; max: number } },
): Block[] {
  const name = layoutName(ctx, c.draft.name, maxWidth, range)
  const role = c.draft.role.trim()
  const handle = c.draft.instagram.trim() ? instagramLine(c.draft.instagram) : ''
  const roleSize = 32
  const handleSize = 40

  return present([
    role
      ? {
          height: Math.round(roleSize * 0.74),
          space: 0,
          draw: (top) => drawCaps(ctx, role, left, top + roleSize * 0.74, { size: roleSize, color: theme.accent, maxWidth }),
        }
      : null,
    name ? { height: name.height, space: role ? 46 : 0, draw: (top) => drawName(ctx, name, left, top, theme.text, 'left') } : null,
    name || role
      ? {
          height: 3,
          space: 56,
          draw: (top) => {
            ctx.fillStyle = withAlpha(theme.accent, 0.7)
            ctx.fillRect(left, top, 120, 3)
          },
        }
      : null,
    handle
      ? {
          height: Math.round(handleSize * 0.74),
          space: 52,
          draw: (top) => {
            ctx.font = textFont(handleSize)
            ctx.fillStyle = theme.muted
            ctx.textAlign = 'left'
            ctx.fillText(ellipsize(ctx, handle, maxWidth), left, top + handleSize * 0.74)
          },
        }
      : null,
  ])
}

// The monogram — the initials as a mark — is shared: lib/canvas/monogram.
export { drawMonogram } from '@/lib/canvas/monogram'

// ── Contacts ─────────────────────────────────────────────────

export interface ContactsLayout extends Block {
  /** The widest line plus its icon — for centring the block when nothing sits beside it. */
  width: number
}

/** The contact lines, each with its icon: a phone's messengers on a quieter line under it. */
export function contactsBlock(
  ctx: CanvasRenderingContext2D,
  contacts: Contact[],
  theme: StoryTheme,
  { size, maxWidth, colors }: { size: number; maxWidth: number; colors?: { icon: string; text: string; sub: string } },
): ContactsLayout & { drawAt: (left: number, top: number) => void } {
  const { icon: iconColor, text: textColor, sub: subColor } = colors ?? { icon: theme.accent, text: theme.text, sub: theme.muted }
  const icon = Math.round(size * 0.92)
  const indent = icon + Math.round(size * 0.62)
  const lineHeight = Math.round(size * 1.24)
  const subSize = Math.round(size * 0.7)
  const subHeight = Math.round(subSize * 1.35)
  const gap = Math.round(size * 0.62)

  ctx.font = textFont(size)
  const rows = contacts.map((contact) => {
    const lines = wrapLines(ctx, contact.text, maxWidth - indent, 2)
    const width = Math.max(...lines.map((line) => ctx.measureText(line).width))
    return { contact, lines, width, height: lines.length * lineHeight + (contact.sub ? subHeight : 0) }
  })
  const height = rows.reduce((sum, row) => sum + row.height, 0) + gap * Math.max(0, rows.length - 1)
  const width = rows.length ? indent + Math.max(...rows.map((row) => row.width)) : 0

  const drawAt = (left: number, top: number) => {
    let y = top
    for (const row of rows) {
      drawIcon(ctx, ICONS[row.contact.icon], left, y + (lineHeight - icon) / 2, icon, iconColor)
      ctx.textAlign = 'left'
      ctx.font = textFont(size)
      ctx.fillStyle = textColor
      row.lines.forEach((line, i) => ctx.fillText(line, left + indent, y + lineHeight * 0.72 + i * lineHeight))
      if (row.contact.sub) {
        ctx.font = textFont(subSize)
        ctx.fillStyle = subColor
        ctx.fillText(row.contact.sub, left + indent, y + row.lines.length * lineHeight + subSize * 0.82)
      }
      y += row.height + gap
    }
  }

  return { height, width, space: 0, draw: (top) => drawAt(SAFE, top), drawAt }
}

/** The largest size from `max` down whose contact lines fit `room` high. */
export function fitContacts(
  ctx: CanvasRenderingContext2D,
  contacts: Contact[],
  theme: StoryTheme,
  { max, min, maxWidth, room, colors }: { max: number; min: number; maxWidth: number; room: number; colors?: { icon: string; text: string; sub: string } },
) {
  let block = contactsBlock(ctx, contacts, theme, { size: max, maxWidth, colors })
  for (let size = max - 2; size >= min && block.height > room; size -= 2) {
    block = contactsBlock(ctx, contacts, theme, { size, maxWidth, colors })
  }
  return block
}

// ── QR code ──────────────────────────────────────────────────

/** The QR code on its light tile, the word under it saying whose it is. Returns its full height. */
export function qrHeight(size: number): number {
  return size + 26 + 30
}

export function drawQrTile(
  ctx: CanvasRenderingContext2D,
  qr: { url: string; caption: string },
  theme: StoryTheme,
  { x, y, size, captionColor }: { x: number; y: number; size: number; captionColor: string },
) {
  // A dark shade of the palette's own accent: branded, and as easy to scan as black.
  drawQr(ctx, qr.url, { x, y, size, ink: mix(theme.accent, '#000000', 0.72), paper: '#FFFFFF' })
  roundedRect(ctx, x, y, size, size, size * 0.1)
  ctx.strokeStyle = withAlpha(theme.accent, 0.3)
  ctx.lineWidth = 2
  ctx.stroke()
  drawCaps(ctx, qr.caption, x + size / 2, y + size + 26 + 22, { size: 24, color: captionColor, align: 'center', maxWidth: size + 120 })
}

// ── Mark ─────────────────────────────────────────────────────

/** Where the mark sits: 3.5 mm above the cut, inside any print shop's safe line. */
export const MARK_BASELINE = H - 72

/** reserva.am, small and quiet, on the back: the line that brings the next visitor. */
export function drawMark(ctx: CanvasRenderingContext2D, color: string, x: number, align: CanvasTextAlign = 'left') {
  ctx.font = markFont
  ctx.fillStyle = color
  ctx.textAlign = align
  withLetterSpacing(ctx, '4px', () => ctx.fillText(BRAND_MARK, x, MARK_BASELINE))
}
