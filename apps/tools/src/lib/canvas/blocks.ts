// ─────────────────────────────────────────────────────────────
// A small layout engine for drawings with no layout of their own: measure
// each piece first, stack the pieces, and shrink them all together until
// they fit the room there is.
// ─────────────────────────────────────────────────────────────

/** One piece of a drawing: measured first, drawn once its place is known. */
export interface Block {
  height: number
  /** Room above it, when something is above it. */
  space: number
  draw: (top: number) => void
}

export function stackHeight(blocks: Block[]): number {
  return blocks.reduce((sum, block, i) => sum + block.height + (i ? block.space : 0), 0)
}

/** The blocks one under another, centred between `top` and `bottom`. */
export function drawStack(blocks: Block[], top: number, bottom: number) {
  let y = top + Math.max(0, (bottom - top - stackHeight(blocks)) / 2)
  blocks.forEach((block, i) => {
    if (i) y += block.space
    block.draw(y)
    y += block.height
  })
}

/**
 * Lets blocks breathe: when they fit with room to spare, that room is shared
 * out among the spaces between them — each up to `stretch` times its size —
 * so short content fills its page evenly instead of huddling in the middle.
 */
export function spreadBlocks(blocks: Block[], available: number, stretch = 1.6): Block[] {
  const spaces = blocks.reduce((sum, block, i) => sum + (i ? block.space : 0), 0)
  const spare = available - stackHeight(blocks)
  if (spare <= 0 || spaces <= 0) return blocks
  const factor = Math.min(stretch, 1 + spare / spaces)
  return blocks.map((block, i) => (i ? { ...block, space: Math.round(block.space * factor) } : block))
}

/** Present blocks only: an empty field is simply not drawn. */
export const present = (blocks: Array<Block | null>): Block[] => blocks.filter((b): b is Block => b !== null)

const SCALES = [1, 0.94, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58, 0.52] as const

/**
 * Every size in a layout scales together, from roomy to compact, and the
 * first scale whose blocks fit `available` wins: little content gets the
 * big type; a lot gets smaller type rather than running off the edge.
 *
 * `build` answers null when something is too WIDE at that scale (a long
 * price range); on the last scale it must answer anyway.
 */
export function fitBlocks(build: (k: number, last: boolean) => Block[] | null, available: number): Block[] {
  let fallback: Block[] | null = null
  for (const [i, k] of SCALES.entries()) {
    const blocks = build(k, i === SCALES.length - 1)
    if (!blocks) continue
    if (stackHeight(blocks) <= available) return blocks
    fallback = blocks
  }
  return fallback ?? []
}
