// ─────────────────────────────────────────────────────────────
// Line icons for a canvas: the lucide glyphs the site itself uses (lucide,
// ISC licence), kept here as data so a card's icons are as sharp as its text
// at any print size. Each is drawn on lucide's 24-unit grid.
// ─────────────────────────────────────────────────────────────

type IconPart =
  | ['path', { d: string }]
  | ['rect', { x: number; y: number; width: number; height: number; rx: number }]
  | ['circle', { cx: number; cy: number; r: number }]
  | ['line', { x1: number; y1: number; x2: number; y2: number }]

export type Icon = readonly IconPart[]

export const ICONS = {
  instagram: [
    ['rect', { x: 2, y: 2, width: 20, height: 20, rx: 5 }],
    ['path', { d: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' }],
    ['line', { x1: 17.5, y1: 6.5, x2: 17.51, y2: 6.5 }],
  ],
  phone: [
    [
      'path',
      {
        d: 'M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384',
      },
    ],
  ],
  mapPin: [
    ['path', { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' }],
    ['circle', { cx: 12, cy: 10, r: 3 }],
  ],
  globe: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' }],
    ['path', { d: 'M2 12h20' }],
  ],
} satisfies Record<string, Icon>

export type IconName = keyof typeof ICONS

/** `icon` with its top-left at (x, y), `size` across, in lucide's stroke style. */
export function drawIcon(ctx: CanvasRenderingContext2D, icon: Icon, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [kind, a] of icon) {
    if (kind === 'path') {
      ctx.stroke(new Path2D(a.d))
      continue
    }
    ctx.beginPath()
    if (kind === 'rect') {
      const r = a.rx
      ctx.moveTo(a.x + r, a.y)
      ctx.arcTo(a.x + a.width, a.y, a.x + a.width, a.y + a.height, r)
      ctx.arcTo(a.x + a.width, a.y + a.height, a.x, a.y + a.height, r)
      ctx.arcTo(a.x, a.y + a.height, a.x, a.y, r)
      ctx.arcTo(a.x, a.y, a.x + a.width, a.y, r)
      ctx.closePath()
    } else if (kind === 'circle') {
      ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2)
    } else {
      ctx.moveTo(a.x1, a.y1)
      ctx.lineTo(a.x2, a.y2)
    }
    ctx.stroke()
  }
  ctx.restore()
}
