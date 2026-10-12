import { SANS, font } from '@/lib/canvas/fonts'
import { wrapLines } from '@/lib/canvas/text'
import { formatPrice } from '@/lib/formatPrice'
import {
  STORY_BOX,
  STORY_CONTENT_W,
  STORY_FONTS,
  drawBackground,
  drawStoryFooter,
  drawStoryHeader,
} from '@/lib/story/draw'
import { STORY } from '@/lib/story/size'
import type { StoryTheme } from '@/lib/story/themes'
import { isFilled, type PriceItem, type PriceListDraft } from './model'

// ─────────────────────────────────────────────────────────────
// The price list story. The shared story kit draws the background, header and
// footer; this draws the one thing that is the price list's own — the
// services, centred between them, shrinking their type until they all fit.
// ─────────────────────────────────────────────────────────────

const ROW_SIZE = { min: 26, max: 46 }
const nameFont = (size: number) => font(500, size, SANS)
const priceFont = (size: number) => font(600, size, SANS)

/** Every face drawPriceList uses — what must be loaded before drawing. */
export const PRICE_LIST_FONTS = [...STORY_FONTS, priceFont(ROW_SIZE.max)] as const

export function drawPriceList(ctx: CanvasRenderingContext2D, draft: PriceListDraft, theme: StoryTheme) {
  ctx.save()
  ctx.clearRect(0, 0, STORY.width, STORY.height)
  ctx.textBaseline = 'alphabetic'

  drawBackground(ctx, theme, STORY.width, STORY.height)
  const top = drawStoryHeader(ctx, theme, draft)
  const bottom = drawStoryFooter(ctx, theme, draft)
  drawServices(ctx, draft.items.filter(isFilled), theme, top, bottom)

  ctx.restore()
}

interface Row {
  lines: string[]
  price: string
  priceWidth: number
  height: number
}

interface Layout {
  size: number
  lineHeight: number
  gap: number
  rows: Row[]
  height: number
}

/**
 * The largest type size at which every service fits the space. A name too
 * long for its line wraps to a second one (then ellipsizes), and the price
 * always stays whole — it is the one thing on the row that must be exact.
 */
function layoutServices(ctx: CanvasRenderingContext2D, items: PriceItem[], available: number): Layout {
  let layout: Layout | null = null

  for (let size = ROW_SIZE.max; size >= ROW_SIZE.min; size -= 2) {
    const lineHeight = Math.round(size * 1.3)
    const gap = Math.round(size * 0.9)

    const rows = items.map((item): Row => {
      const price = formatPrice(item.price)
      ctx.font = priceFont(size)
      const priceWidth = price ? ctx.measureText(price).width : 0

      ctx.font = nameFont(size)
      const nameWidth = Math.max(STORY_CONTENT_W * 0.35, STORY_CONTENT_W - (price ? priceWidth + size * 1.5 : 0))
      const lines = item.name.trim() ? wrapLines(ctx, item.name, nameWidth, 2) : []
      return { lines, price, priceWidth, height: Math.max(1, lines.length) * lineHeight }
    })

    const height = rows.reduce((sum, row) => sum + row.height, 0) + gap * Math.max(0, rows.length - 1)
    layout = { size, lineHeight, gap, rows, height }
    if (height <= available) break
  }

  return layout!
}

function drawServices(
  ctx: CanvasRenderingContext2D,
  items: PriceItem[],
  theme: StoryTheme,
  top: number,
  bottom: number,
) {
  if (!items.length) return
  const available = bottom - top
  const { size, lineHeight, gap, rows, height } = layoutServices(ctx, items, available)
  const left = STORY_BOX.left
  const right = STORY_BOX.right

  // Centred between header and footer: five services sit in the middle of the
  // story, fourteen fill it.
  let y = top + Math.max(0, (available - height) / 2)

  for (const row of rows) {
    const firstBaseline = y + lineHeight * 0.74
    const lastBaseline = firstBaseline + (Math.max(1, row.lines.length) - 1) * lineHeight

    ctx.textAlign = 'left'
    ctx.font = nameFont(size)
    ctx.fillStyle = theme.text
    row.lines.forEach((line, i) => ctx.fillText(line, left, firstBaseline + i * lineHeight))

    if (row.price) {
      // The price sits on the name's LAST line, joined to it by leader dots.
      const lastLine = row.lines[row.lines.length - 1]
      if (lastLine) {
        const nameEnd = left + ctx.measureText(lastLine).width
        drawLeader(ctx, theme, nameEnd + size * 0.5, right - row.priceWidth - size * 0.5, lastBaseline, size)
      }

      ctx.textAlign = 'right'
      ctx.font = priceFont(size)
      ctx.fillStyle = theme.accent
      ctx.fillText(row.price, right, lastBaseline)
    }

    y += row.height + gap
  }
}

/** A row of dots on the baseline, from the end of the name to the price. */
function drawLeader(
  ctx: CanvasRenderingContext2D,
  theme: StoryTheme,
  from: number,
  to: number,
  baseline: number,
  size: number,
) {
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
