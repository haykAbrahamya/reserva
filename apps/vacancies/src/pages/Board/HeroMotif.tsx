import s from './HeroMotif.module.scss'

/*
 * The heading band's motif: a scattering of the trade's tools, as line art.
 *
 * Inline SVG rather than image files or data URIs, for three reasons that all
 * matter. Each shape inherits `currentColor`, so the whole set re-themes with
 * the tokens instead of needing a second asset for dark mode. It weighs
 * nothing and stays crisp at any density. And it is readable in the diff — a
 * background nobody can inspect is a background nobody dares change.
 *
 * SMALL and SEVERAL, not one large mark. A single big silhouette reads as a
 * logo someone parked in the corner; a sparse constellation reads as pattern,
 * and pattern is what a heading band wants. Sizes, angles and opacities vary
 * per instance so the set never resolves into a grid.
 *
 * Several are deliberately cropped by the band's `overflow: hidden`: a shape
 * that runs off the edge belongs to the composition, where one that fits neatly
 * inside looks placed.
 *
 * All purely decorative, hence `aria-hidden` — a screen reader announcing
 * "scissors, comb, razor" ahead of the page title would be worse than silence.
 */

interface IconProps {
  className: string
}

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** Shears — the anchor shape, and the only one anybody needs to recognise. */
function Scissors({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 240 240" strokeWidth={5} {...STROKE} aria-hidden="true">
      <circle cx="52" cy="196" r="18" />
      <circle cx="104" cy="212" r="18" />
      <path d="M66 184 L212 38" />
      <path d="M116 196 L188 22" />
      <circle cx="160" cy="90" r="4" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Comb. A spine and teeth — the simplest shape in the set, so it can be the
 *  smallest without turning to mush. */
function Comb({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 240 240" strokeWidth={6} {...STROKE} aria-hidden="true">
      <path d="M34 86 H206 a14 14 0 0 1 14 14 v18 H20 v-18 a14 14 0 0 1 14 -14 z" />
      <path d="M44 118 V186 M74 118 V196 M104 118 V186 M134 118 V196 M164 118 V186 M194 118 V196" />
    </svg>
  )
}

/** Straight razor, opened. */
function Razor({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 240 240" strokeWidth={6} {...STROKE} aria-hidden="true">
      <path d="M28 176 L150 54 a26 26 0 0 1 37 37 L118 160 z" />
      <path d="M150 54 L206 34" />
      <circle cx="212" cy="30" r="9" />
    </svg>
  )
}

/** Polish bottle — the one shape that says this board is not only barbers. */
function Bottle({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 240 240" strokeWidth={6} {...STROKE} aria-hidden="true">
      <path d="M96 22 h48 v56 h-48 z" />
      <path d="M78 78 h84 a18 18 0 0 1 18 18 v104 a18 18 0 0 1 -18 18 h-84 a18 18 0 0 1 -18 -18 v-104 a18 18 0 0 1 18 -18 z" />
      <path d="M84 140 h72" />
    </svg>
  )
}

/*
 * Nine shapes, placed by hand.
 *
 * Not generated: the band has two no-go regions — the headline on the left and
 * the distribution panel on the right — and the only reliable way to keep a
 * scattering out of both while still looking scattered is to place each one.
 * A random or evenly-spaced generator puts shapes behind the text, which is
 * exactly what made the first attempt look like a mistake rather than a
 * pattern. The class names are just slots; the geometry lives in the module.
 */
export function HeroMotif() {
  return (
    <div className={s.field} aria-hidden="true">
      <Scissors className={[s.item, s.n1].join(' ')} />
      <Comb className={[s.item, s.n2].join(' ')} />
      <Razor className={[s.item, s.n3].join(' ')} />
      <Bottle className={[s.item, s.n4].join(' ')} />
      <Scissors className={[s.item, s.n5].join(' ')} />
      <Comb className={[s.item, s.n6].join(' ')} />
      <Razor className={[s.item, s.n7].join(' ')} />
      <Scissors className={[s.item, s.n8].join(' ')} />
      <Bottle className={[s.item, s.n9].join(' ')} />
    </div>
  )
}
