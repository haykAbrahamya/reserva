import { withAlpha } from '@/lib/canvas/color'
import { SANS, SERIF, font } from '@/lib/canvas/fonts'
import { ellipsize, fitFontSize, withLetterSpacing, wrapLines } from '@/lib/canvas/text'
import type { StoryBrand } from './brand'
import { STORY } from './size'
import type { StoryTheme } from './themes'

// ─────────────────────────────────────────────────────────────
// The parts every story tool draws the same way, so a price list, a free-slots
// story and anything after them are recognisably one set:
//
//   background · header (heading, title, ornament) · footer (note, contact, mark)
//
// Each tool draws only its own middle, between what the header and footer
// return.
// ─────────────────────────────────────────────────────────────

/** On every image: the line that brings the next visitor to the tools. */
export const BRAND_MARK = 'reserva.am'

/** The drawable area of a story: inside Instagram's safe zones, with side margins. */
export const STORY_BOX = {
  left: 104,
  right: STORY.width - 104,
  top: STORY.safeTop,
  bottom: STORY.height - STORY.safeBottom,
} as const

export const STORY_CONTENT_W = STORY_BOX.right - STORY_BOX.left
const CENTER = STORY.width / 2

const TITLE_SIZE = { min: 64, max: 104 }
const headingFont = font(600, 30, SANS)
const titleFont = (size: number) => font(500, size, SERIF)
const noteFont = font(600, 34, SANS)
const contactFont = font(500, 34, SANS)
const brandFont = font(500, 24, SANS)

/** The faces the shared header and footer use — part of every story tool's font list. */
export const STORY_FONTS = [headingFont, titleFont(TITLE_SIZE.max), noteFont, contactFont] as const

// ── Background ───────────────────────────────────────────────

/**
 * Ground gradient, two soft accent glows, and hairline rings from the top
 * corner — the same motif as tools.reserva.am itself. Measured from the
 * canvas, so a landscape card gets the same look as a story.
 */
export function drawBackground(ctx: CanvasRenderingContext2D, theme: StoryTheme, width: number, height: number) {
  const unit = Math.min(width, height)

  const ground = ctx.createLinearGradient(0, 0, 0, height)
  ground.addColorStop(0, theme.bg[0])
  ground.addColorStop(1, theme.bg[1])
  ctx.fillStyle = ground
  ctx.fillRect(0, 0, width, height)

  glow(ctx, theme.accent, width * 0.95, height * 0.04, unit * 0.76, theme.glow)
  glow(ctx, theme.accent, width * 0.02, height * 0.98, unit * 0.63, theme.glow * 0.75)

  const [cx, cy] = [width * 0.97, height * 0.035]
  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 2
  for (let i = 0; i < 9; i++) {
    ctx.globalAlpha = 0.18 * (1 - i / 9)
    ctx.beginPath()
    ctx.arc(cx, cy, unit * 0.148 + i * unit * 0.07, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function glow(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, radius: number, alpha: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, withAlpha(color, alpha))
  gradient.addColorStop(1, withAlpha(color, 0))
  ctx.fillStyle = gradient
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

/** Two short rules either side of a diamond. */
export function drawOrnament(ctx: CanvasRenderingContext2D, theme: StoryTheme, x: number, y: number) {
  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.moveTo(x - 96, y)
  ctx.lineTo(x - 20, y)
  ctx.moveTo(x + 20, y)
  ctx.lineTo(x + 96, y)
  ctx.stroke()

  ctx.globalAlpha = 1
  ctx.fillStyle = theme.accent
  ctx.beginPath()
  ctx.moveTo(x, y - 8)
  ctx.lineTo(x + 8, y)
  ctx.lineTo(x, y + 8)
  ctx.lineTo(x - 8, y)
  ctx.closePath()
  ctx.fill()
}

// ── Header ───────────────────────────────────────────────────

/** Heading, title and ornament, centred. Returns where the story's content may start. */
export function drawStoryHeader(ctx: CanvasRenderingContext2D, theme: StoryTheme, brand: StoryBrand): number {
  let y = STORY_BOX.top + 24
  ctx.textAlign = 'center'

  const heading = brand.heading.trim().toUpperCase()
  if (heading) {
    ctx.font = headingFont
    ctx.fillStyle = theme.accent
    withLetterSpacing(ctx, '7px', () => ctx.fillText(ellipsize(ctx, heading, STORY_CONTENT_W), CENTER, y + 30))
    y += 30 + 44
  }

  const title = brand.title.trim()
  if (title) {
    // As large as fits on one line; a name too long even at the minimum wraps
    // onto a second line instead of shrinking further.
    const fitted = fitFontSize(ctx, title, STORY_CONTENT_W, TITLE_SIZE, titleFont)
    const size = fitted ?? TITLE_SIZE.min
    ctx.font = titleFont(size)
    const lines = fitted ? [title] : wrapLines(ctx, title, STORY_CONTENT_W, 2)
    const lineHeight = size * 1.06

    ctx.fillStyle = theme.text
    lines.forEach((line, i) => ctx.fillText(line, CENTER, y + size * 0.82 + i * lineHeight))
    y += lineHeight * lines.length
  }

  y += 44
  drawOrnament(ctx, theme, CENTER, y)
  return y + 64
}

// ── Footer ───────────────────────────────────────────────────

interface FooterLines {
  contact: string
  /** An optional call to action above the contact, in the accent — "DM to book". */
  note?: string
}

/** Note, contact and the brand mark, centred at the foot. Returns where content must end. */
export function drawStoryFooter(ctx: CanvasRenderingContext2D, theme: StoryTheme, { contact, note }: FooterLines): number {
  const base = STORY_BOX.bottom
  ctx.textAlign = 'center'

  ctx.font = brandFont
  ctx.fillStyle = theme.muted
  withLetterSpacing(ctx, '4px', () => ctx.fillText(BRAND_MARK, CENTER, base))
  let top = base - 24

  const contactLine = contact.trim()
  if (contactLine) {
    const baseline = top - 36
    ctx.font = contactFont
    ctx.fillStyle = theme.text
    ctx.fillText(ellipsize(ctx, contactLine, STORY_CONTENT_W), CENTER, baseline)
    top = baseline - 34
  }

  const noteLine = note?.trim()
  if (noteLine) {
    const baseline = top - 22
    ctx.font = noteFont
    ctx.fillStyle = theme.accent
    ctx.fillText(ellipsize(ctx, noteLine, STORY_CONTENT_W), CENTER, baseline)
    top = baseline - 34
  }

  return top - 64
}
