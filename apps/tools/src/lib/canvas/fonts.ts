// ─────────────────────────────────────────────────────────────
// Fonts for drawing on a canvas.
//
// The same stacks as the design system's --font-serif / --font-sans, so an
// exported image is set in the faces the site is. Canvas does per-glyph
// fallback down the list like CSS does, which is what lets one string mix Latin
// and Armenian.
// ─────────────────────────────────────────────────────────────

export const SERIF = '"Fraunces", "Noto Serif Armenian", "Noto Serif", Georgia, serif'
export const SANS = '"Geist", "Noto Sans Armenian", -apple-system, "Segoe UI", Roboto, sans-serif'

/** A canvas `font` shorthand. */
export function font(weight: number, size: number, family: string, style: 'normal' | 'italic' = 'normal'): string {
  return `${style === 'italic' ? 'italic ' : ''}${weight} ${size}px ${family}`
}

/**
 * Load the faces needed to draw `text` in each of `specs`.
 *
 * A canvas, unlike the DOM, never repaints when a web font arrives — whatever
 * face was available at draw time is baked into the pixels. The fonts are
 * served in unicode-range subsets, so passing the actual text is what makes the
 * Armenian or Cyrillic subset load, not just the Latin one.
 */
export async function loadFonts(specs: readonly string[], text: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.allSettled(specs.map((spec) => document.fonts.load(spec, text || 'Aa')))
}
