import type { Block } from '@/lib/canvas/blocks'
import { isDark, mix, withAlpha } from '@/lib/canvas/color'
import { SANS, SERIF, font } from '@/lib/canvas/fonts'
import { drawMonogram } from '@/lib/canvas/monogram'
import { scallopPath } from '@/lib/canvas/shapes'
import { ellipsize, fitFontSize, withLetterSpacing, wrapLines } from '@/lib/canvas/text'
import type { StoryTheme } from '@/lib/story/themes'
import { hasSigner, type CertLabels, type CertificateDraft, type Signer } from '../model'

// ─────────────────────────────────────────────────────────────
// The parts every certificate design is built from, in design units: the
// sheet is 2000 wide (A4: 297 mm, so 1 pt of type is about 2.4 units), its
// height following the paper. Type is never set below 22 units — 9 pt on A4,
// still 6.5 pt on A5 — and nothing comes nearer the edge than an office
// printer can print: certificates get printed at home and at the copy shop.
// ─────────────────────────────────────────────────────────────

export const serifFont = (size: number) => font(500, size, SERIF)
export const titleFont = (size: number) => font(600, size, SERIF)
export const sansFont = (size: number) => font(500, size, SANS)
export const strongFont = (size: number) => font(600, size, SANS)

/** Every face a certificate uses — what must be loaded before drawing. */
export const CERT_FONTS = [serifFont(120), titleFont(100), sansFont(30), strongFont(28)] as const

/** What every design draws: the draft, the school's mark, and the sheet's size. */
export interface CertContent {
  draft: CertificateDraft
  labels: CertLabels
  /** The school's logo, decoded; null without one. */
  logo: HTMLImageElement | null
  /** The school's initials: its mark when there is no logo. */
  initials: string
  width: number
  height: number
}

export type Design = (ctx: CanvasRenderingContext2D, c: CertContent, theme: StoryTheme) => void

/** The four colours a certificate is set in. */
export interface Ink {
  text: string
  accent: string
  muted: string
  /** Rules, frames, the signature lines. */
  line: string
}

/**
 * Ink for white paper. A dark palette's colours were chosen for its own dark
 * ground — cream text, pale gold — and vanish on white, so on paper its text
 * becomes its deepest shade and its accent a darker, antique version of
 * itself. A light palette's colours already read on white.
 */
export function paperInk(theme: StoryTheme): Ink {
  if (isDark(theme.bg[1])) {
    return {
      text: theme.bg[1],
      accent: mix(theme.accent, '#000000', 0.4),
      muted: mix(theme.bg[1], '#FFFFFF', 0.42),
      line: mix(theme.accent, '#000000', 0.15),
    }
  }
  return { text: theme.text, accent: theme.accent, muted: theme.muted, line: mix(theme.accent, '#FFFFFF', 0.25) }
}

/** The palette's own colours, for a certificate printed on its ground. */
export function groundInk(theme: StoryTheme): Ink {
  return { text: theme.text, accent: theme.accent, muted: theme.muted, line: withAlpha(theme.accent, 0.7) }
}

export function drawPaper(ctx: CanvasRenderingContext2D, c: CertContent) {
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, c.width, c.height)
}

// ── Text ─────────────────────────────────────────────────────

interface TextOptions {
  font: (size: number) => string
  size: number
  color: string
  maxWidth: number
  x: number
  align?: CanvasTextAlign
  maxLines?: number
  /** Letter spacing as a share of the size, for capitals. */
  tracking?: number
  upper?: boolean
  space?: number
  lineHeight?: number
  /** Shrink down to this share of the size to stay on one line, before wrapping. */
  shrink?: number
  /** Never cut the text short: when even the lines it may take are not enough, set it smaller. */
  whole?: boolean
}

/** Do the wrapped lines hold all of `text`, nothing ellipsized away? */
const isWhole = (lines: string[], text: string) => lines.join(' ').replace(/\s+/g, ' ') === text.replace(/\s+/g, ' ')

/**
 * Lines of text as a block: wrapped to `maxWidth` (tracked capitals stay on
 * one line and shorten instead). Its height runs from the top of the
 * capitals to the last baseline. Null when there is no text.
 */
export function textBlock(ctx: CanvasRenderingContext2D, text: string, o: TextOptions): Block | null {
  const value = o.upper ? text.trim().toUpperCase() : text.trim()
  if (!value) return null
  const { maxLines = 2, lineHeight: lh = 1.16, align = 'center' } = o
  let size = o.shrink
    ? (fitFontSize(ctx, value, o.maxWidth, { min: Math.round(o.size * o.shrink), max: o.size }, o.font) ?? o.size)
    : o.size
  ctx.font = o.font(size)
  const spacing = o.tracking ? Math.round(size * o.tracking) : 0
  // Tracked capitals are measured with their spacing on: it widens the line.
  let lines: string[] = []
  if (spacing) withLetterSpacing(ctx, `${spacing}px`, () => (lines = wrapLines(ctx, value, o.maxWidth, maxLines)))
  else lines = wrapLines(ctx, value, o.maxWidth, maxLines)

  // Set smaller rather than cut short: a name or a course must be whole.
  if (o.whole && !spacing) {
    const floor = Math.round(o.size * 0.5)
    while (size > floor && !isWhole(lines, value)) {
      size -= 2
      ctx.font = o.font(size)
      lines = wrapLines(ctx, value, o.maxWidth, maxLines)
    }
  }
  const lineHeight = Math.round(size * lh)
  const cap = Math.round(size * 0.72)
  // Tracking trails the last letter: nudge centred and right-aligned lines back.
  const nudge = align === 'center' ? spacing / 2 : align === 'right' ? spacing : 0

  return {
    height: cap + (lines.length - 1) * lineHeight,
    space: o.space ?? 0,
    draw(top) {
      ctx.font = o.font(size)
      ctx.fillStyle = o.color
      ctx.textAlign = align
      const baseline = (i: number) => top + cap + i * lineHeight
      if (spacing) {
        withLetterSpacing(ctx, `${spacing}px`, () => lines.forEach((line, i) => ctx.fillText(line, o.x + nudge, baseline(i))))
      } else {
        lines.forEach((line, i) => ctx.fillText(line, o.x, baseline(i)))
      }
    },
  }
}

/** The recipient's name: as large as fits on one line between `min` and `max`; longer, on two. */
export function nameBlock(
  ctx: CanvasRenderingContext2D,
  name: string,
  { min, max, maxWidth, x, align = 'center', color, space = 0 }: { min: number; max: number; maxWidth: number; x: number; align?: CanvasTextAlign; color: string; space?: number },
): Block | null {
  const value = name.trim()
  if (!value) return null
  const size = fitFontSize(ctx, value, maxWidth, { min, max }, serifFont) ?? min
  return textBlock(ctx, value, { font: serifFont, size, color, maxWidth, x, align, maxLines: 2, lineHeight: 1.08, space, whole: true })
}

/** "Yerevan, 16 October 2026 · № 0024": where, when, and which certificate. */
export function issuedLine(c: CertContent): string {
  const number = c.draft.number.trim()
  return [c.labels.issued, number ? `№ ${number}` : ''].filter(Boolean).join('   ·   ')
}

// ── The school's mark ────────────────────────────────────────

export const hasEmblem = (c: CertContent) => Boolean(c.logo || c.initials)

/**
 * The school's logo, fitted into a box `size` high and up to twice as wide —
 * a square badge and a long wordmark both come out at a sensible size — or,
 * without one, its initials in a ring.
 */
export function drawEmblem(
  ctx: CanvasRenderingContext2D,
  c: CertContent,
  cx: number,
  cy: number,
  size: number,
  { ring, letters }: { ring: string; letters: string },
) {
  if (c.logo) {
    const scale = Math.min((size * 2) / c.logo.naturalWidth, size / c.logo.naturalHeight)
    const width = c.logo.naturalWidth * scale
    const height = c.logo.naturalHeight * scale
    ctx.drawImage(c.logo, cx - width / 2, cy - height / 2, width, height)
    return
  }
  if (c.initials) drawMonogram(ctx, c.initials, cx, cy, size / 2, { ring, letters })
}

/** The width the emblem takes, for placing things beside it. */
export function emblemWidth(c: CertContent, size: number): number {
  if (!c.logo) return c.initials ? size : 0
  return Math.min((size * 2) / c.logo.naturalWidth, size / c.logo.naturalHeight) * c.logo.naturalWidth
}

// ── Ornament ─────────────────────────────────────────────────

/** Two short rules either side of a diamond. */
export function drawDivider(ctx: CanvasRenderingContext2D, cx: number, y: number, color: string, half = 120) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cx - half, y)
  ctx.lineTo(cx - 22, y)
  ctx.moveTo(cx + 22, y)
  ctx.lineTo(cx + half, y)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx, y - 9)
  ctx.lineTo(cx + 9, y)
  ctx.lineTo(cx, y + 9)
  ctx.lineTo(cx - 9, y)
  ctx.closePath()
  ctx.fill()
}

export const dividerBlock = (ctx: CanvasRenderingContext2D, cx: number, color: string, space: number): Block => ({
  height: 18,
  space,
  draw: (top) => drawDivider(ctx, cx, top + 9, color),
})

// ── Signing off ──────────────────────────────────────────────

/** A signature line: 64 mm long on A4, with a hand's room above it. */
export const SIGNATURE = { width: 440, room: 110 } as const
/** The stamp's place: a 36 mm circle on A4, about the size of a round stamp. */
export const SEAL_RADIUS = 122

/** One person's signature: the line to sign on, their name under it, their title under that. */
export function drawSigner(
  ctx: CanvasRenderingContext2D,
  signer: Signer,
  x: number,
  lineY: number,
  ink: Ink,
  { align = 'center', width = SIGNATURE.width }: { align?: 'center' | 'left'; width?: number } = {},
) {
  const left = align === 'center' ? x - width / 2 : x
  ctx.strokeStyle = ink.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(left, lineY)
  ctx.lineTo(left + width, lineY)
  ctx.stroke()

  const name = signer.name.trim()
  const title = signer.title.trim()
  ctx.textAlign = align
  if (name) {
    ctx.font = strongFont(28)
    ctx.fillStyle = ink.text
    ctx.fillText(ellipsize(ctx, name, width + 40), x, lineY + 48)
  }
  if (title) {
    const spacing = 4
    ctx.font = sansFont(22)
    ctx.fillStyle = ink.muted
    withLetterSpacing(ctx, `${spacing}px`, () =>
      ctx.fillText(
        ellipsize(ctx, title.toUpperCase(), width + 40),
        x + (align === 'center' ? spacing / 2 : 0),
        lineY + (name ? 86 : 48),
      ),
    )
  }
}

/** The stamp's place: a dashed circle, its short label in the middle. */
export function drawSealPlace(ctx: CanvasRenderingContext2D, cx: number, cy: number, ink: Ink, label: string) {
  ctx.save()
  ctx.setLineDash([12, 10])
  ctx.strokeStyle = ink.muted
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(cx, cy, SEAL_RADIUS, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  const spacing = 4
  ctx.font = strongFont(24)
  ctx.fillStyle = ink.muted
  ctx.textAlign = 'center'
  withLetterSpacing(ctx, `${spacing}px`, () => ctx.fillText(label, cx + spacing / 2, cy + 9))
}

/** The stamp's centre, just above the signature lines it sits between. */
const SEAL_LIFT = 24

/** How high the sign-off reaches above its signature lines — what the text above must clear. */
export function signOffReach(c: CertContent): number {
  return c.draft.seal ? Math.max(SIGNATURE.room, SEAL_RADIUS + SEAL_LIFT + 30) : SIGNATURE.room
}

/**
 * The signatures and the stamp's place in one row, spread evenly across
 * `left`…`right`: one signer in the middle, two at the ends with the stamp
 * between them. The stamp sits a little above the lines, half over the
 * signatures, as a stamp is put.
 */
export function drawSignOff(ctx: CanvasRenderingContext2D, c: CertContent, ink: Ink, { left, right, lineY }: { left: number; right: number; lineY: number }) {
  const signers = c.draft.signers.filter(hasSigner)
  const slots: Array<Signer | 'seal'> = [...signers]
  if (c.draft.seal) slots.splice(signers.length > 1 ? 1 : signers.length, 0, 'seal')
  const slot = (right - left) / slots.length
  // Each line as long as a signature needs, but never into its neighbour's slot.
  const width = Math.min(SIGNATURE.width, slot - 60)
  slots.forEach((item, i) => {
    const x = left + slot * (i + 0.5)
    if (item === 'seal') drawSealPlace(ctx, x, lineY - SEAL_LIFT, ink, c.labels.seal)
    else drawSigner(ctx, item, x, lineY, ink, { width })
  })
}

// ── The rosette ──────────────────────────────────────────────

/**
 * An award rosette: a scalloped disc in the accent with two ribbon tails
 * under it, the school's mark on it — a logo on a white disc, so any logo
 * reads; or the initials straight on the accent.
 */
export function drawRosette(ctx: CanvasRenderingContext2D, c: CertContent, theme: StoryTheme, cx: number, cy: number, r: number) {
  // The tails, behind the disc.
  const tail = (side: 1 | -1, color: string) => {
    const x0 = cx + side * r * 0.28
    const x1 = cx + side * r * 0.95
    const y0 = cy + r * 0.3
    const y1 = cy + r * 1.7
    const w = r * 0.42
    ctx.beginPath()
    ctx.moveTo(x0 - (side * w) / 2, y0)
    ctx.lineTo(x0 + (side * w) / 2, y0)
    ctx.lineTo(x1 + (side * w) / 2, y1)
    ctx.lineTo(x1, y1 - w * 0.55)
    ctx.lineTo(x1 - (side * w) / 2, y1)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }
  tail(-1, mix(theme.accent, theme.bg[1], 0.22))
  tail(1, mix(theme.accent, theme.bg[1], 0.34))

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)'
  ctx.shadowBlur = r * 0.2
  ctx.shadowOffsetY = r * 0.06
  scallopPath(ctx, cx, cy, r, 26)
  const fill = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  fill.addColorStop(0, mix(theme.accent, '#FFFFFF', 0.18))
  fill.addColorStop(1, mix(theme.accent, theme.bg[1], 0.2))
  ctx.fillStyle = fill
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = withAlpha(theme.onAccent, 0.5)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2)
  ctx.stroke()

  if (c.logo) {
    // The logo on a white disc, at the largest box of its own shape the disc
    // holds: a square badge fills it, a long wordmark runs across it.
    const disc = r * 0.7
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(cx, cy, disc, 0, Math.PI * 2)
    ctx.fill()
    const aspect = c.logo.naturalWidth / c.logo.naturalHeight
    const height = (disc * 2 * 0.86) / Math.sqrt(aspect * aspect + 1)
    const width = aspect * height
    ctx.drawImage(c.logo, cx - width / 2, cy - height / 2, width, height)
  } else if (c.initials) {
    drawMonogram(ctx, c.initials, cx, cy, r * 0.62, { letters: theme.onAccent })
  }
}
