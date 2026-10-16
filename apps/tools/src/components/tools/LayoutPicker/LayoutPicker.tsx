import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { Check } from 'lucide-react'
import s from './LayoutPicker.module.scss'

/** Quiet time after an edit before the thumbnails redraw, so typing stays smooth. */
const DELAY = 140

export interface LayoutOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: readonly LayoutOption<T>[]
  onChange: (value: T) => void
  /** The drawing's full size; each thumbnail is it at `scale` — sharp at the width it shows, cheap to redraw. */
  width: number
  height: number
  scale: number
  /** Draws the result in a layout — the very function the preview and the download use. Memoized. */
  draw: (ctx: CanvasRenderingContext2D, layout: T) => void
  /** Loads the faces `draw` needs. Memoized. */
  prepare: () => Promise<void>
  /** Names the group for a screen reader — the section title. */
  label: string
}

/**
 * The layout choice, each option a live miniature of the visitor's own
 * result in that layout — their words, their colours — so choosing is
 * comparing finished pieces, not imagining them.
 *
 * Native radio inputs, like the style picker: arrow keys move between them
 * and a screen reader announces "2 of 4".
 */
export function LayoutPicker<T extends string>({ value, options, onChange, width, height, scale, draw, prepare, label }: Props<T>) {
  const name = useId()
  const wide = width > height
  // Up to four in a row, the rows even: six go three and three, not four and two.
  const columns = Math.ceil(options.length / Math.ceil(options.length / 4))

  return (
    <div className={s.container}>
      <div
        className={s.grid}
        data-wide={wide || undefined}
        style={{ '--thumb-aspect': `${width} / ${height}`, '--columns': columns } as CSSProperties}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => (
          <label key={option.value} className={s.option}>
            <input
              type="radio"
              name={name}
              className={s.input}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span className={s.frame}>
              <Thumbnail
                layout={option.value}
                width={width}
                height={height}
                scale={scale}
                draw={draw}
                prepare={prepare}
              />
              <span className={s.check} aria-hidden="true">
                <Check size={12} strokeWidth={3} />
              </span>
            </span>
            <span className={s.name}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function Thumbnail<T extends string>({
  layout,
  width,
  height,
  scale,
  draw,
  prepare,
}: Pick<Props<T>, 'width' | 'height' | 'scale' | 'draw' | 'prepare'> & { layout: T }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const painted = useRef(false)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    let cancelled = false
    const paint = () => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      draw(ctx, layout)
    }

    // The first paint is immediate; later ones wait for the typing to pause.
    const timer = window.setTimeout(
      () => {
        paint()
        painted.current = true
        prepare().then(() => {
          if (!cancelled) paint()
        })
      },
      painted.current ? DELAY : 0,
    )
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [draw, prepare, layout, scale])

  return (
    <canvas
      ref={ref}
      width={Math.round(width * scale)}
      height={Math.round(height * scale)}
      className={s.canvas}
      aria-hidden="true"
    />
  )
}
