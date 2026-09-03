import s from './Logo.module.scss'

/**
 * Reserva logo mark — the "Petal R": an R whose bowl is a soft petal.
 *
 * Lives in the design system because it is the SAME mark in every app and was
 * already token-driven: it paints itself from `--accent`, so the client page
 * renders it in a salon's brand colour, the backoffice in the partner's, and
 * the vacancies board in that product's violet — with no per-app copy to keep
 * in step.
 * Theme-aware: filled (accent tile, white R) in light mode, outline (accent
 * stroke on transparent) in dark mode — toggled purely via CSS on
 * <html data-theme>, so a single component covers both everywhere.
 *
 * Colors come from the `--accent` CSS var, so the mark still re-skins per tenant.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span className={s.mark} style={{ width: size, height: size }}>
      <svg
        className={s.markSvg}
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
      >
        {/* Filled tile (light mode) */}
        <rect className={s.tileFill} x="2" y="2" width="44" height="44" rx="14" />
        {/* Outline tile (dark mode) */}
        <rect className={s.tileOutline} x="3" y="3" width="42" height="42" rx="14" strokeWidth="2.4" />

        {/* Petal-R strokes — `.rStroke` is recolored per theme (white on the
            filled tile, accent on the outline tile). */}
        <g className={s.rStroke} strokeWidth="3.2" strokeLinecap="round" fill="none">
          <path d="M17 36V12" />
          <path d="M17 12c10 0 16 4 16 11s-7 8-16 8" />
          <path d="M24 31l10 5" />
        </g>
      </svg>
    </span>
  )
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className={s.logo}>
      <LogoMark size={size} />
      <span className={s.name}>Reserva</span>
    </span>
  )
}
