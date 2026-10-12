// ─────────────────────────────────────────────────────────────
// Text layout on a canvas, which has none of its own: no wrapping, no
// ellipsis, no shrink-to-fit. All measure with whatever `ctx.font` is set.
// ─────────────────────────────────────────────────────────────

const ELLIPSIS = '…'

/** `text` shortened with an ellipsis until it fits `maxWidth`. */
export function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text

  // Binary search on the cut point: measureText is the cost, and a long name
  // in a narrow column would otherwise be measured once per character.
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (ctx.measureText(text.slice(0, mid).trimEnd() + ELLIPSIS).width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo).trimEnd() + ELLIPSIS
}

/**
 * Greedy word wrap into at most `maxLines` lines. Whatever does not fit is
 * folded into the last line and ellipsized, and a single word wider than a
 * line is ellipsized rather than broken mid-word.
 */
export function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    // The first word of a line always goes on it, even when it is too long.
    if (!line || ctx.measureText(candidate).width <= maxWidth) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)

  const kept =
    lines.length > maxLines
      ? [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')]
      : lines
  return kept.map((l) => ellipsize(ctx, l, maxWidth))
}

/**
 * The largest size from `max` down to `min` (in steps of 2) at which `text`
 * fits `maxWidth` on one line, or null when even `min` overflows. Leaves
 * `ctx.font` set to the last size tried.
 */
export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  { min, max }: { min: number; max: number },
  fontAt: (size: number) => string,
): number | null {
  for (let size = max; size >= min; size -= 2) {
    ctx.font = fontAt(size)
    if (ctx.measureText(text).width <= maxWidth) return size
  }
  return null
}

/**
 * Run `draw` with letter spacing, where the browser supports it on canvas, then
 * return to no spacing — the base every drawing in this app assumes.
 *
 * It resets to an explicit '0px' rather than to the value read back first: after
 * `ctx.save()`, Chrome reports `letterSpacing` as "" — not a valid value to
 * assign — so "restoring" it was silently ignored and the spacing stayed on for
 * every line drawn afterwards.
 */
export function withLetterSpacing(ctx: CanvasRenderingContext2D, spacing: string, draw: () => void) {
  if (!('letterSpacing' in ctx)) {
    draw()
    return
  }
  ctx.letterSpacing = spacing
  try {
    draw()
  } finally {
    ctx.letterSpacing = '0px'
  }
}
