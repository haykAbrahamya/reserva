import type { CSSProperties } from 'react'
import type { PublicPartner } from '@/mock/partners'

/** Parse a #rgb / #rrggbb hex into [r,g,b] (0-255). Falls back to mid-grey. */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  if (h.length !== 6 || Number.isNaN(n)) return [128, 128, 128]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Relative luminance (WCAG) of an sRGB color, 0 (black) … 1 (white). */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/**
 * Readable text color to place ON a solid accent fill — near-black for light
 * accents, white for dark ones. This is what fixes white-on-pale-gold banners.
 */
export function onAccent(accent: string): string {
  // 0.55 threshold leans toward white text unless the accent is genuinely light.
  return luminance(hexToRgb(accent)) > 0.55 ? '#1A1714' : '#FFFFFF'
}

/**
 * Resolves a partner's brand color into the accent CSS variables the booking
 * page styles everything through. Overriding these on the page root re-skins the
 * whole experience in the partner's color.
 *
 *  --accent          the brand hue (button/banner fills, avatars)
 *  --accent-strong   hover/active shade (darker in light mode, lighter in dark)
 *  --accent-soft     low-alpha tint for soft backgrounds/chips
 *  --fg-on-accent    readable text ON a solid accent fill (luminance-aware)
 *  --accent-contrast accent-family text on NEUTRAL backgrounds, kept legible in
 *                    both themes (dark mode needs a lifted hue, not the raw brand)
 */
export function partnerBrandVars(partner: PublicPartner, dark = false): CSSProperties {
  const { accent } = partner
  return {
    '--accent': accent,
    '--accent-strong': dark
      ? `color-mix(in srgb, ${accent} 72%, #fff)`
      : `color-mix(in srgb, ${accent} 78%, #000)`,
    '--accent-soft': `color-mix(in srgb, ${accent} ${dark ? 18 : 12}%, transparent)`,
    // Luminance-aware so a light brand color never gets white text on it.
    '--fg-on-accent': onAccent(accent),
    // Accent text on neutral surfaces: in dark mode lift toward white so it
    // doesn't sink into the background; in light mode deepen for contrast.
    '--accent-contrast': dark
      ? `color-mix(in srgb, ${accent} 55%, #fff)`
      : `color-mix(in srgb, ${accent} 82%, #000)`,
  } as CSSProperties
}
