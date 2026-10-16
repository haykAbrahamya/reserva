/**
 * A rounded rectangle path. `ctx.roundRect` would do, but it only reached
 * every browser in 2023, and a phone two OS versions behind is exactly who
 * uses these tools.
 */
export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  addRoundedRect(ctx, x, y, width, height, radius)
}

/**
 * The same rectangle added to the path already begun — for a shape with a
 * hole (two of them, filled 'evenodd'), like a ring or a frame.
 */
export function addRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

/** A four-pointed sparkle, ✦ — the beauty trade's own punctuation. */
export function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const waist = r * 0.16
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x + waist, y - waist, x + r, y)
  ctx.quadraticCurveTo(x + waist, y + waist, x, y + r)
  ctx.quadraticCurveTo(x - waist, y + waist, x - r, y)
  ctx.quadraticCurveTo(x - waist, y - waist, x, y - r)
  ctx.closePath()
  ctx.fill()
}

/** A disc with rounded scallops round its edge, like a rosette, a seal or a price sticker. */
export function scallopPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, bumps = 22) {
  const depth = radius * 0.055
  const steps = bumps * 24
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2
    const r = radius - depth + depth * Math.abs(Math.sin((angle * bumps) / 2))
    if (i === 0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
    else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
  }
  ctx.closePath()
}
