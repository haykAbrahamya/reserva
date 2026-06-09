import type { CSSProperties } from 'react'
import type { PublicPartner } from '@/mock/partners'

/**
 * Resolves a partner's brand color into the accent CSS variables the booking
 * page styles everything through (`--accent`, `--accent-soft`, `--accent-strong`
 * and the button text `--fg-on-accent`). Overriding these four on the page root
 * re-skins the whole experience in the partner's color — the same color used for
 * the specialist avatars.
 *
 * Buttons paint `--accent` as their background with `--fg-on-accent` as text;
 * keeping them as a pair means a partner can carry a light accent without the
 * label disappearing. All current partners use white-on-accent.
 */
export function partnerBrandVars(partner: PublicPartner, dark = false): CSSProperties {
  const { accent } = partner
  return {
    '--accent': accent,
    // Hover/active shade. Light mode darkens the brand hue; dark mode LIGHTENS
    // it — otherwise accent-on-dark text/states sink into the surface.
    '--accent-strong': dark
      ? `color-mix(in srgb, ${accent} 72%, #fff)`
      : `color-mix(in srgb, ${accent} 78%, #000)`,
    '--accent-soft': `color-mix(in srgb, ${accent} ${dark ? 18 : 12}%, transparent)`,
    '--fg-on-accent': '#FFFFFF',
  } as CSSProperties
}
