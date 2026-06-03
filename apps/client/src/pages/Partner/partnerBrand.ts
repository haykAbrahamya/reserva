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
export function partnerBrandVars(partner: PublicPartner): CSSProperties {
  const { accent } = partner
  return {
    '--accent': accent,
    // Hover/active shade — a darker version of the accent itself, so it stays
    // in the brand's hue (the avatar/hero tints can be a separate dark ramp).
    '--accent-strong': `color-mix(in srgb, ${accent} 78%, #000)`,
    '--accent-soft': `color-mix(in srgb, ${accent} 12%, transparent)`,
    '--fg-on-accent': '#FFFFFF',
  } as CSSProperties
}
