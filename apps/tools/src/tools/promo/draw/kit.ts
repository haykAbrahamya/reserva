import type { Block } from '@/lib/canvas/blocks'
import { withAlpha } from '@/lib/canvas/color'
import { SANS, SERIF, font } from '@/lib/canvas/fonts'
import { roundedRect } from '@/lib/canvas/shapes'
import { ellipsize, fitFontSize, withLetterSpacing, wrapLines } from '@/lib/canvas/text'
import { STORY_BOX, STORY_CONTENT_W, STORY_FONTS } from '@/lib/story/draw'
import { STORY } from '@/lib/story/size'
import type { StoryTheme } from '@/lib/story/themes'
import type { PromoDraft, PromoLabels, PromoPrice } from '../model'

// ─────────────────────────────────────────────────────────────
// The parts every promo layout is built from: the discount figure, the
// crossed-out prices, the end-date pill, a sparkle — and the little layout
// engine that stacks them and shrinks them together until they fit.
// ─────────────────────────────────────────────────────────────

export const CENTER = STORY.width / 2

export const numeralFont = (size: number) => font(600, size, SERIF)
export const serifFont = (size: number) => font(500, size, SERIF)
export const capsFont = (size: number) => font(600, size, SANS)
const nameFont = (size: number) => font(500, size, SANS)
const nowFont = (size: number) => font(600, size, SANS)
const wasFont = (size: number) => font(500, size, SANS)
const untilFont = (size: number) => font(500, size, SANS)

/** Every face the promo layouts use — what must be loaded before drawing. */
export const PROMO_FONTS = [...STORY_FONTS, numeralFont(400), serifFont(60), capsFont(30), nameFont(44), nowFont(44)] as const

/** What every layout draws: the draft, its services already priced, and the story's words. */
export interface PromoContent {
  draft: PromoDraft
  rows: PromoRow[]
  labels: PromoLabels
}

// The layout engine (blocks stacked, scaled down together until they fit)
// is shared: lib/canvas/blocks.
export { drawStack, fitBlocks, present, stackHeight } from '@/lib/canvas/blocks'
export type { Block }

// ── The discount figure ──────────────────────────────────────

export interface Numeral {
  width: number
  /** The height of the digits — what the figure takes up on the page. */
  height: number
  /** Draws it centred on `cx`, sitting on `baseline`. */
  draw: (cx: number, baseline: number, color: string) => void
}

/**
 * "−20%" set as a display figure rather than typed: the digits large, a
 * drawn minus bar at their middle, the percent sign half size and hung from
 * their top. As large as `size`, or smaller until it fits `maxWidth`.
 */
export function measureNumeral(ctx: CanvasRenderingContext2D, percent: number, size: number, maxWidth: number): Numeral {
  const at = numeralAt(ctx, percent, size)
  return at.width <= maxWidth ? at : numeralAt(ctx, percent, Math.floor((size * maxWidth) / at.width))
}

function numeralAt(ctx: CanvasRenderingContext2D, percent: number, size: number): Numeral {
  const digits = String(percent)
  ctx.font = numeralFont(size)
  const figure = ctx.measureText(digits)
  const height = figure.actualBoundingBoxAscent
  ctx.font = numeralFont(size * 0.5)
  const sign = ctx.measureText('%')

  const bar = { width: size * 0.3, thickness: Math.max(3, size * 0.06), gap: size * 0.07 }
  const signGap = size * 0.03
  const width = bar.width + bar.gap + figure.width + signGap + sign.width

  return {
    width,
    height,
    draw(cx, baseline, color) {
      let x = cx - width / 2
      ctx.fillStyle = color
      roundedRect(ctx, x, baseline - height * 0.5 - bar.thickness / 2, bar.width, bar.thickness, bar.thickness / 2)
      ctx.fill()
      x += bar.width + bar.gap

      ctx.textAlign = 'left'
      ctx.font = numeralFont(size)
      ctx.fillText(digits, x, baseline)
      x += figure.width + signGap

      ctx.font = numeralFont(size * 0.5)
      ctx.fillText('%', x, baseline - height + sign.actualBoundingBoxAscent)
    },
  }
}

// ── Text ─────────────────────────────────────────────────────

interface TextOptions {
  font: (size: number) => string
  size: number
  width: number
  color: string
  maxLines?: number
  space: number
  /** Letter spacing, for tracked capitals. */
  tracking?: string
  cx?: number
}

/** Centred lines of text, wrapped to `width`; null when there is no text. */
export function textBlock(ctx: CanvasRenderingContext2D, text: string, options: TextOptions): Block | null {
  const value = text.trim()
  if (!value) return null
  const { font: fontAt, size, width, color, maxLines = 3, space, tracking, cx = CENTER } = options

  ctx.font = fontAt(size)
  // A tracked line stays one line, shortened while the spacing is on: it
  // changes the width being measured.
  const lines = tracking ? [value] : wrapLines(ctx, value, width, maxLines)
  const lineHeight = Math.round(size * 1.2)

  return {
    height: lines.length * lineHeight,
    space,
    draw(top) {
      ctx.font = fontAt(size)
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      const baseline = (i: number) => top + lineHeight * 0.78 + i * lineHeight
      if (tracking) withLetterSpacing(ctx, tracking, () => ctx.fillText(ellipsize(ctx, value, width), cx, baseline(0)))
      else lines.forEach((line, i) => ctx.fillText(line, cx, baseline(i)))
    },
  }
}

/** A tracked capital line: "SPECIAL OFFER". */
export function capsBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  { size, color, space, width = STORY_CONTENT_W }: { size: number; color: string; space: number; width?: number },
): Block | null {
  return textBlock(ctx, text.toUpperCase(), {
    font: capsFont,
    size,
    width,
    color,
    space,
    tracking: `${Math.round(size * 0.24)}px`,
  })
}

// ── Services ─────────────────────────────────────────────────

export interface PromoRow {
  name: string
  price: PromoPrice | null
}

interface MeasuredRow {
  lines: string[]
  price: PromoPrice | null
  wasWidth: number
  nowWidth: number
  height: number
}

/**
 * The services: each name on the left (wrapping to a second line when long),
 * on the right the usual price crossed out and the new one in the accent.
 * Null when the prices are too wide for `width` at this size — unless it is
 * the `last` size there is.
 */
export function rowsBlock(
  ctx: CanvasRenderingContext2D,
  rows: PromoRow[],
  theme: StoryTheme,
  { size, left, width, space, last }: { size: number; left: number; width: number; space: number; last: boolean },
): Block | null {
  const lineHeight = Math.round(size * 1.3)
  const gap = Math.round(size * 0.66)
  const wasSize = Math.round(size * 0.8)
  const join = size * 0.42

  const measured: MeasuredRow[] = []
  for (const row of rows) {
    ctx.font = nowFont(size)
    const nowWidth = row.price ? ctx.measureText(row.price.now).width : 0
    ctx.font = wasFont(wasSize)
    const wasWidth = row.price?.was ? ctx.measureText(row.price.was).width : 0
    const priceWidth = nowWidth + (wasWidth ? wasWidth + join : 0)
    if (priceWidth > width * 0.66 && !last) return null

    ctx.font = nameFont(size)
    const nameWidth = Math.max(width * 0.34, width - (priceWidth ? priceWidth + size * 1.2 : 0))
    const lines = row.name.trim() ? wrapLines(ctx, row.name, nameWidth, 2) : []
    measured.push({ lines, price: row.price, wasWidth, nowWidth, height: Math.max(1, lines.length) * lineHeight })
  }

  const right = left + width
  return {
    height: measured.reduce((sum, row) => sum + row.height, 0) + gap * (measured.length - 1),
    space,
    draw(top) {
      let y = top
      for (const row of measured) {
        const first = y + lineHeight * 0.74
        const baseline = first + (Math.max(1, row.lines.length) - 1) * lineHeight

        ctx.textAlign = 'left'
        ctx.font = nameFont(size)
        ctx.fillStyle = theme.text
        row.lines.forEach((line, i) => ctx.fillText(line, left, first + i * lineHeight))
        const nameEnd = row.lines.length ? left + ctx.measureText(row.lines[row.lines.length - 1]).width : left

        if (row.price) {
          ctx.textAlign = 'right'
          ctx.font = nowFont(size)
          ctx.fillStyle = theme.accent
          ctx.fillText(row.price.now, right, baseline)
          let x = right - row.nowWidth

          if (row.wasWidth) {
            x -= join
            ctx.font = wasFont(wasSize)
            ctx.fillStyle = theme.muted
            ctx.fillText(row.price.was, x, baseline)
            strike(ctx, theme, x - row.wasWidth, x, baseline - wasSize * 0.36, wasSize)
            x -= row.wasWidth
          }
          if (row.lines.length) leader(ctx, theme, nameEnd + size * 0.5, x - size * 0.5, baseline, size)
        }
        y += row.height + gap
      }
    },
  }
}

/** The line through an old price, a touch past both ends. */
function strike(ctx: CanvasRenderingContext2D, theme: StoryTheme, from: number, to: number, y: number, size: number) {
  ctx.strokeStyle = withAlpha(theme.accent, 0.85)
  ctx.lineWidth = Math.max(2, size * 0.08)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(from - size * 0.08, y + size * 0.06)
  ctx.lineTo(to + size * 0.08, y - size * 0.06)
  ctx.stroke()
  ctx.lineCap = 'butt'
}

/** A row of dots on the baseline, from the end of the name to the prices. */
function leader(ctx: CanvasRenderingContext2D, theme: StoryTheme, from: number, to: number, baseline: number, size: number) {
  const step = size * 0.4
  if (to - from < step * 2) return
  const radius = Math.max(1.8, size * 0.055)
  ctx.fillStyle = theme.line
  for (let x = from; x <= to; x += step) {
    ctx.beginPath()
    ctx.arc(x, baseline - radius, radius, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ── The end date ─────────────────────────────────────────────

/** "Until 31 October" in a pill, with a small clock. Null with no end date. */
export function untilBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  theme: StoryTheme,
  { size, space }: { size: number; space: number },
): Block | null {
  if (!text) return null
  const icon = size * 0.92
  const padding = size * 0.95
  const height = Math.round(size * 2.1)

  ctx.font = untilFont(size)
  const label = ellipsize(ctx, text, STORY_CONTENT_W - padding * 2 - icon - size * 0.5)
  const width = padding * 2 + icon + size * 0.5 + ctx.measureText(label).width

  return {
    height,
    space,
    draw(top) {
      const x = CENTER - width / 2
      roundedRect(ctx, x, top, width, height, height / 2)
      ctx.fillStyle = withAlpha(theme.accent, 0.12)
      ctx.fill()
      ctx.strokeStyle = withAlpha(theme.accent, 0.55)
      ctx.lineWidth = 2
      ctx.stroke()

      drawClock(ctx, theme.accent, x + padding + icon / 2, top + height / 2, icon / 2, size)

      ctx.textAlign = 'left'
      ctx.font = untilFont(size)
      ctx.fillStyle = theme.text
      ctx.fillText(label, x + padding + icon + size * 0.5, top + height / 2 + size * 0.36)
    },
  }
}

function drawClock(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, r: number, size: number) {
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, size * 0.08)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(x, y, r * 0.9, 0, Math.PI * 2)
  ctx.moveTo(x, y - r * 0.5)
  ctx.lineTo(x, y)
  ctx.lineTo(x + r * 0.38, y + r * 0.22)
  ctx.stroke()
  ctx.lineCap = 'butt'
}

// ── Header ───────────────────────────────────────────────────

/** Where a layout's own header starts: just inside the top safe zone. */
export const HEADER_TOP = STORY_BOX.top + 16

/**
 * The name on its own, a lighter header than the other tools' — for the
 * layouts whose heading sits elsewhere (round the seal, on the ticket, under
 * the figure). As large as fits on one line; too long even at the smallest,
 * it wraps onto a second, as the other headers do. Null without a name.
 */
export function nameBlock(ctx: CanvasRenderingContext2D, title: string, color: string): Block | null {
  const name = title.trim()
  if (!name) return null
  const fitted = fitFontSize(ctx, name, STORY_CONTENT_W, { min: 50, max: 76 }, serifFont)
  const size = fitted ?? 50
  ctx.font = serifFont(size)
  const lines = fitted ? [name] : wrapLines(ctx, name, STORY_CONTENT_W, 2)
  const lineHeight = size * 1.08

  return {
    height: size * 1.1 + (lines.length - 1) * lineHeight,
    space: 0,
    draw(top) {
      ctx.font = serifFont(size)
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      lines.forEach((line, i) => ctx.fillText(line, CENTER, top + size * 0.86 + i * lineHeight))
    },
  }
}

/** The name at the top of the story. Returns where the content may start. */
export function drawNameHeader(ctx: CanvasRenderingContext2D, title: string, color: string): number {
  const name = nameBlock(ctx, title, color)
  name?.draw(HEADER_TOP)
  return HEADER_TOP + (name?.height ?? 0)
}

// ── Ornament ─────────────────────────────────────────────────

// The sparkle, ✦, is shared: lib/canvas/shapes.
export { drawSparkle } from '@/lib/canvas/shapes'


