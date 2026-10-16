const channels = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const
}

/** `#RRGGBB` at the given opacity, as a canvas-ready rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Two `#RRGGBB` colours mixed, `amount` of the way from `from` to `to`, as rgb() — or rgba() at `alpha`. */
export function mix(from: string, to: string, amount: number, alpha?: number): string {
  const a = channels(from)
  const b = channels(to)
  const [r, g, bl] = a.map((value, i) => Math.round(value + (b[i] - value) * amount))
  return alpha === undefined ? `rgb(${r}, ${g}, ${bl})` : `rgba(${r}, ${g}, ${bl}, ${alpha})`
}

/** A dark `#RRGGBB` — one light text reads on. Relative luminance, as WCAG counts it. */
export function isDark(hex: string): boolean {
  const [r, g, b] = channels(hex).map((value) => {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18
}
