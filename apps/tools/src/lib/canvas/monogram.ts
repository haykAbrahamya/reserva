import { SERIF, font } from './fonts'
import { fitFontSize } from './text'

// ─────────────────────────────────────────────────────────────
// Initials as a mark: what a card or a certificate shows where a logo would
// go, when there is none.
// ─────────────────────────────────────────────────────────────

const serif = (size: number) => font(500, size, SERIF)

/** Up to two initials, from the first letters of the name's first two words: "Anna Petrosyan" → "AP". */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => /\p{L}/u.exec(word)?.[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase()
}

/**
 * The initials in a ring, on a disc, or alone — optically centred on
 * (cx, cy): the capitals are measured, not guessed.
 */
export function drawMonogram(
  ctx: CanvasRenderingContext2D,
  initials: string,
  cx: number,
  cy: number,
  r: number,
  { letters, ring, disc }: { letters: string; ring?: string; disc?: string | CanvasGradient },
) {
  if (disc) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = disc
    ctx.fill()
  }
  if (ring) {
    ctx.strokeStyle = ring
    ctx.lineWidth = Math.max(3, r * 0.026)
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.45
    ctx.lineWidth = Math.max(2, r * 0.012)
    ctx.beginPath()
    ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  if (!initials) return

  const size = fitFontSize(ctx, initials, r * 1.18, { min: Math.round(r * 0.4), max: Math.round(r * 0.86) }, serif) ?? r * 0.4
  ctx.font = serif(size)
  const capitals = ctx.measureText(initials).actualBoundingBoxAscent
  ctx.textAlign = 'center'
  ctx.fillStyle = letters
  ctx.fillText(initials, cx, cy + capitals / 2)
}
