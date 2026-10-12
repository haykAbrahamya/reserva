import { withAlpha } from '@/lib/canvas/color'
import { SANS, font } from '@/lib/canvas/fonts'
import { roundedRect } from '@/lib/canvas/shapes'
import { ellipsize } from '@/lib/canvas/text'
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
import type { FreeSlotsDraft } from './model'

// ─────────────────────────────────────────────────────────────
// The free-slots story: the shared header and footer, the day under the
// title, and the free times as pills — the one thing a viewer is looking for,
// so it is the largest type on the page.
// ─────────────────────────────────────────────────────────────

const CENTER = STORY.width / 2
const dayFont = font(500, 40, SANS)
const timeFont = (size: number) => font(600, size, SANS)

/** Every face drawFreeSlots uses — what must be loaded before drawing. */
export const FREE_SLOTS_FONTS = [...STORY_FONTS, dayFont, timeFont(64)] as const

/** `dayLine` is the day in words ("Tuesday, 14 October"), formatted by the page in the visitor's language. */
export function drawFreeSlots(
  ctx: CanvasRenderingContext2D,
  draft: FreeSlotsDraft,
  theme: StoryTheme,
  dayLine: string,
) {
  ctx.save()
  ctx.clearRect(0, 0, STORY.width, STORY.height)
  ctx.textBaseline = 'alphabetic'

  drawBackground(ctx, theme, STORY.width, STORY.height)
  const top = drawStoryHeader(ctx, theme, draft)
  const bottom = drawStoryFooter(ctx, theme, { contact: draft.contact, note: draft.note })

  ctx.textAlign = 'center'
  ctx.font = dayFont
  ctx.fillStyle = theme.text
  ctx.fillText(ellipsize(ctx, dayLine, STORY_CONTENT_W), CENTER, top + 8)

  drawSlots(ctx, draft.slots, theme, top + 80, bottom)
  ctx.restore()
}

/**
 * The times as a centred grid. A few get two big columns; more get three.
 * A short last row is centred rather than left-aligned, so 5 times read as a
 * shape and not as a gap.
 */
function drawSlots(ctx: CanvasRenderingContext2D, slots: string[], theme: StoryTheme, top: number, bottom: number) {
  if (!slots.length) return

  const columns = slots.length <= 4 ? 2 : 3
  const gap = 28
  const pillHeight = columns === 2 ? 128 : 112
  const size = columns === 2 ? 64 : 54
  const pillWidth = (STORY_CONTENT_W - gap * (columns - 1)) / columns
  const rows = Math.ceil(slots.length / columns)
  const height = rows * pillHeight + (rows - 1) * gap
  const y0 = top + Math.max(0, (bottom - top - height) / 2)

  ctx.font = timeFont(size)
  ctx.textAlign = 'center'
  ctx.lineWidth = 2.5

  slots.forEach((time, i) => {
    const row = Math.floor(i / columns)
    const inRow = Math.min(columns, slots.length - row * columns)
    const rowWidth = inRow * pillWidth + (inRow - 1) * gap
    const x = STORY_BOX.left + (STORY_CONTENT_W - rowWidth) / 2 + (i % columns) * (pillWidth + gap)
    const y = y0 + row * (pillHeight + gap)

    roundedRect(ctx, x, y, pillWidth, pillHeight, pillHeight / 2)
    ctx.fillStyle = withAlpha(theme.accent, 0.14)
    ctx.fill()
    ctx.strokeStyle = withAlpha(theme.accent, 0.6)
    ctx.stroke()

    ctx.fillStyle = theme.text
    ctx.fillText(time, x + pillWidth / 2, y + pillHeight / 2 + size * 0.36)
  })
}
