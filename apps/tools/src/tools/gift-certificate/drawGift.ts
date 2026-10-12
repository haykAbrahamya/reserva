import { withAlpha } from '@/lib/canvas/color'
import { SANS, SERIF, font } from '@/lib/canvas/fonts'
import { roundedRect } from '@/lib/canvas/shapes'
import { ellipsize, fitFontSize, withLetterSpacing, wrapLines } from '@/lib/canvas/text'
import { formatPrice } from '@/lib/formatPrice'
import { BRAND_MARK, drawBackground } from '@/lib/story/draw'
import type { StoryTheme } from '@/lib/story/themes'
import { GIFT_CARD, type GiftDraft, type GiftLabels } from './model'

// ─────────────────────────────────────────────────────────────
// The gift certificate, a 1600×1000 card:
//
//   salon name ........................................ № 4827
//
//   GIFT CERTIFICATE
//   20 000 ֏                                            (monogram)
//   For Maria · From Anna
//   message
//   ───────────────────────────────────────────────────────────
//   valid until …            @contact               reserva.am
//
// Same background, palettes and type as the stories, so a salon's price list
// and its gift card look like they came from the same place.
// ─────────────────────────────────────────────────────────────

const { width: W, height: H } = GIFT_CARD
const PAD = 112
const TEXT_W = 1000

const VALUE_SIZE = { min: 84, max: 150 }
const salonFont = (size: number) => font(500, size, SERIF)
const valueFont = (size: number) => font(500, size, SERIF)
const headingFont = font(600, 30, SANS)
const labelFont = font(500, 36, SANS)
const nameFont = font(600, 38, SANS)
const messageFont = font(400, 36, SERIF, 'italic')
const smallFont = font(500, 28, SANS)
const contactFont = font(500, 30, SANS)
const brandFont = font(500, 24, SANS)

/** Every face drawGift uses — what must be loaded before drawing. */
export const GIFT_FONTS = [salonFont(60), valueFont(VALUE_SIZE.max), headingFont, labelFont, nameFont, messageFont] as const

export function drawGift(ctx: CanvasRenderingContext2D, draft: GiftDraft, theme: StoryTheme, labels: GiftLabels) {
  ctx.save()
  ctx.clearRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'

  drawBackground(ctx, theme, W, H)
  drawFrame(ctx, theme)
  drawMonogram(ctx, theme, draft.title)
  drawTopRow(ctx, draft, theme)
  drawBody(ctx, draft, theme, labels)
  drawBottomRow(ctx, draft, theme, labels)

  ctx.restore()
}

/** A hairline frame inset from the edge — what makes it read as a certificate, not a flyer. */
function drawFrame(ctx: CanvasRenderingContext2D, theme: StoryTheme) {
  roundedRect(ctx, 36, 36, W - 72, H - 72, 28)
  ctx.strokeStyle = withAlpha(theme.accent, 0.45)
  ctx.lineWidth = 2
  ctx.stroke()
}

/** The salon's initial, very large and very faint, behind the right side. */
function drawMonogram(ctx: CanvasRenderingContext2D, theme: StoryTheme, title: string) {
  const initial = [...title.trim()][0]?.toLocaleUpperCase()
  if (!initial) return
  ctx.font = valueFont(620)
  ctx.textAlign = 'right'
  ctx.fillStyle = withAlpha(theme.accent, 0.09)
  ctx.fillText(initial, W - 150, H - 230)
}

function drawTopRow(ctx: CanvasRenderingContext2D, draft: GiftDraft, theme: StoryTheme) {
  const baseline = 172

  const salon = draft.title.trim()
  if (salon) {
    const size = fitFontSize(ctx, salon, 900, { min: 40, max: 60 }, salonFont) ?? 40
    ctx.font = salonFont(size)
    ctx.textAlign = 'left'
    ctx.fillStyle = theme.text
    ctx.fillText(ellipsize(ctx, salon, 900), PAD, baseline)
  }

  const code = draft.code.trim()
  if (code) {
    ctx.font = smallFont
    ctx.textAlign = 'right'
    ctx.fillStyle = theme.muted
    withLetterSpacing(ctx, '2px', () => ctx.fillText(`№ ${code}`, W - PAD, baseline - 8))
  }
}

interface Block {
  valueSize: number
  valueLines: string[]
  messageLines: string[]
  height: number
}

/** Measure first, so the block can be centred between the top row and the rule. */
function layoutBody(ctx: CanvasRenderingContext2D, draft: GiftDraft): Block {
  const value = formatPrice(draft.value)
  const fitted = value ? fitFontSize(ctx, value, TEXT_W, VALUE_SIZE, valueFont) : null
  const valueSize = fitted ?? VALUE_SIZE.min
  ctx.font = valueFont(valueSize)
  const valueLines = !value ? [] : fitted ? [value] : wrapLines(ctx, value, TEXT_W, 2)

  ctx.font = messageFont
  const messageLines = draft.message.trim() ? wrapLines(ctx, draft.message, TEXT_W, 2) : []

  const people = [draft.recipient, draft.sender].filter((name) => name.trim()).length
  const height =
    30 + 40 +
    valueLines.length * valueSize * 1.04 +
    (people ? 40 + people * 58 : 0) +
    (messageLines.length ? 28 + messageLines.length * 46 : 0)

  return { valueSize, valueLines, messageLines, height }
}

function drawBody(ctx: CanvasRenderingContext2D, draft: GiftDraft, theme: StoryTheme, labels: GiftLabels) {
  const block = layoutBody(ctx, draft)
  const [top, bottom] = [230, H - 190]
  let y = top + Math.max(0, (bottom - top - block.height) / 2)
  ctx.textAlign = 'left'

  const heading = draft.heading.trim().toUpperCase()
  if (heading) {
    ctx.font = headingFont
    ctx.fillStyle = theme.accent
    withLetterSpacing(ctx, '7px', () => ctx.fillText(ellipsize(ctx, heading, TEXT_W), PAD, y + 30))
  }
  y += 30 + 40

  ctx.font = valueFont(block.valueSize)
  ctx.fillStyle = theme.text
  for (const line of block.valueLines) {
    ctx.fillText(line, PAD, y + block.valueSize * 0.86)
    y += block.valueSize * 1.04
  }

  const people: [string, string][] = [
    [labels.for, draft.recipient.trim()],
    [labels.from, draft.sender.trim()],
  ]
  const named = people.filter(([, name]) => name)
  if (named.length) y += 40
  for (const [label, name] of named) {
    drawLabelled(ctx, theme, label, name, y + 40)
    y += 58
  }

  if (block.messageLines.length) {
    y += 28
    ctx.font = messageFont
    ctx.fillStyle = theme.muted
    for (const line of block.messageLines) {
      ctx.fillText(line, PAD, y + 36)
      y += 46
    }
  }
}

/** "For" in the quiet colour, the name after it in the strong one. */
function drawLabelled(ctx: CanvasRenderingContext2D, theme: StoryTheme, label: string, name: string, baseline: number) {
  ctx.font = labelFont
  ctx.fillStyle = theme.muted
  ctx.fillText(label, PAD, baseline)
  const offset = ctx.measureText(`${label} `).width

  ctx.font = nameFont
  ctx.fillStyle = theme.text
  ctx.fillText(ellipsize(ctx, name, TEXT_W - offset), PAD + offset, baseline)
}

function drawBottomRow(ctx: CanvasRenderingContext2D, draft: GiftDraft, theme: StoryTheme, labels: GiftLabels) {
  const ruleY = H - 168
  ctx.strokeStyle = withAlpha(theme.accent, 0.35)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(PAD, ruleY)
  ctx.lineTo(W - PAD, ruleY)
  ctx.stroke()

  const baseline = H - 104
  const gap = 40

  // The contact is centred; the validity takes whatever room is left of it —
  // an Armenian date ("… հունվարի 2027 թ.") is much longer than an English one.
  const contact = draft.contact.trim()
  ctx.font = contactFont
  const contactLine = contact ? ellipsize(ctx, contact, 480) : ''
  const contactWidth = contactLine ? ctx.measureText(contactLine).width : 0
  if (contactLine) {
    ctx.textAlign = 'center'
    ctx.fillStyle = theme.text
    ctx.fillText(contactLine, W / 2, baseline)
  }

  if (labels.validity) {
    ctx.font = smallFont
    ctx.textAlign = 'left'
    ctx.fillStyle = theme.muted
    const room = contactLine ? W / 2 - contactWidth / 2 - gap - PAD : W - PAD * 2 - 260
    ctx.fillText(ellipsize(ctx, labels.validity, room), PAD, baseline)
  }

  ctx.font = brandFont
  ctx.textAlign = 'right'
  ctx.fillStyle = theme.muted
  withLetterSpacing(ctx, '4px', () => ctx.fillText(BRAND_MARK, W - PAD, baseline))
}
