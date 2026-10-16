import { drawSparkle } from './shapes'
import { ellipsize } from './text'

/**
 * `text` round a circle about the origin — the caller moves (and turns) the
 * context to the circle's centre — repeated as often as it fits, a sparkle
 * between repeats, each letter turned to face outwards. Like the words
 * round a stamp's rim.
 *
 * Text longer than the rim is set smaller until it fits once round, down to
 * two thirds of `size`; past that it is shortened, never overlapped.
 */
export function drawRimText(
  ctx: CanvasRenderingContext2D,
  text: string,
  {
    radius,
    size,
    font,
    color,
    tracking = 0.22,
  }: { radius: number; size: number; font: (size: number) => string; color: string; tracking?: number },
) {
  const circumference = Math.PI * 2 * radius
  const lengthAt = (at: number) => {
    ctx.font = font(at)
    return [...text].reduce((sum, letter) => sum + ctx.measureText(letter).width + at * tracking, 0) + at * 2
  }

  let fitted = size
  const length = lengthAt(size)
  if (length > circumference) fitted = Math.max(Math.round(size * 0.66), Math.floor((size * circumference) / length))
  ctx.font = font(fitted)
  const label = lengthAt(fitted) > circumference ? ellipsize(ctx, text, circumference - fitted * 3) : text
  ctx.font = font(fitted)

  ctx.textAlign = 'center'
  ctx.fillStyle = color
  const letters = [...label]
  const spacing = fitted * tracking
  const widths = letters.map((letter) => ctx.measureText(letter).width + spacing)
  const textWidth = widths.reduce((sum, w) => sum + w, 0)
  const separator = fitted * 2

  // As many repeats as fit, the slack shared out so the last meets the first.
  const repeats = Math.max(1, Math.floor(circumference / (textWidth + separator)))
  const unit = circumference / repeats
  const capHeight = fitted * 0.72

  for (let r = 0; r < repeats; r++) {
    // Each repeat starts so that the first one is centred at the top.
    let along = r * unit - textWidth / 2
    for (const [i, letter] of letters.entries()) {
      ctx.save()
      ctx.rotate((along + widths[i] / 2) / radius)
      ctx.fillText(letter, 0, -radius + capHeight / 2)
      ctx.restore()
      along += widths[i]
    }
    ctx.save()
    ctx.rotate((along + (unit - textWidth) / 2) / radius)
    drawSparkle(ctx, 0, -radius, fitted * 0.42, color)
    ctx.restore()
    ctx.fillStyle = color
  }
}
