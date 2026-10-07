import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { fmtInt } from './format'
import type { ChartPoint } from './buckets'
import s from './TrafficChart.module.scss'

// Geometry, in CSS pixels. The SVG is drawn at the container's real width
// (viewBox = pixels), so text and strokes never scale with the chart.
const PAD_TOP = 12
const MAIN_H = 180
/** Room between the bands for the bookings caption. */
const BAND_GAP = 26
const BAR_H = 56
const AXIS_H = 24
const HEIGHT = PAD_TOP + MAIN_H + BAND_GAP + BAR_H + AXIS_H
/** Rough advance of one 11px character — enough to reserve label room. */
const CHAR_W = 6.6

/**
 * Integer "nice" ticks from zero (0 / 500 / 1,000 …). Counts are whole
 * numbers, so an axis must never print 2.5 visitors: the step is floored at 1.
 */
function niceTicks(max: number, target: number): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / target
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  const step = Math.max(1, Math.round((n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow))
  const top = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  return ticks
}

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(Math.floor(el.getBoundingClientRect().width))
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

/** A bar with a 4px rounded data end and a square foot on the baseline. */
function barPath(cx: number, w: number, top: number, base: number): string {
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const r = Math.min(4, w / 2, base - top)
  return `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z`
}

/**
 * Visitors and page views (lines, visitors with a soft area) over a separate
 * band of bookings bars — per day, or per week / month for long ranges.
 *
 * Bookings get their own band and their own scale instead of a second y-axis
 * on the same plot: overlaid scales invent a correlation wherever the two
 * axes happen to line up, while stacked bands share only what is really shared
 * — the dates. One crosshair and one tooltip run through both.
 *
 * When the last bucket is cut short (the week or month still in progress), its
 * line segment is dashed and its bar faded, so a half-counted period does not
 * read as a collapse.
 */
export function TrafficChart({ points, label }: { points: ChartPoint[]; label: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const width = useWidth(wrapRef)
  const [active, setActive] = useState<number | null>(null)
  const n = points.length

  const geo = useMemo(() => {
    if (width <= 0 || n === 0) return null
    const mainTicks = niceTicks(Math.max(...points.map((p) => Math.max(p.visitors, p.pageViews))), 4)
    const barTicks = niceTicks(Math.max(...points.map((p) => p.bookings)), 2)
    const yTop = mainTicks[mainTicks.length - 1]
    const bTop = barTicks[barTicks.length - 1]

    const last = points[n - 1]
    const gutter = Math.max(...[...mainTicks, ...barTicks].map((t) => fmtInt(t).length))
    const endChars = Math.max(fmtInt(last.visitors).length, fmtInt(last.pageViews).length)
    const axisChars = Math.max(...points.map((p) => p.axis.length))
    const left = 12 + gutter * CHAR_W
    // Right of the last point sit its end labels; half the last x label must fit too.
    const right = Math.max(14 + endChars * CHAR_W, (axisChars * CHAR_W) / 2 + 4, 24)
    const plotW = Math.max(40, width - left - right)

    const barW = Math.max(2, Math.min(20, (plotW / n) * 0.62))
    const pad = n === 1 ? plotW / 2 : barW / 2 + 4
    const step = n === 1 ? 0 : (plotW - 2 * pad) / (n - 1)
    const mainBase = PAD_TOP + MAIN_H
    const barTop = mainBase + BAND_GAP
    const barBase = barTop + BAR_H

    const x = (i: number) => left + pad + i * step
    const y = (v: number) => mainBase - (v / yTop) * MAIN_H
    const by = (v: number) => barBase - (v / bTop) * BAR_H

    // X labels anchored on the LAST point (always labelled), every k-th back.
    const slot = axisChars * CHAR_W + 18
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / slot))))
    const xLabels: number[] = []
    for (let i = n - 1; i >= 0; i -= every) xLabels.push(i)

    const dashLast = n > 1 && last.partial
    const solidTo = dashLast ? n - 1 : n
    const path = (key: 'visitors' | 'pageViews', fromI: number, toI: number) =>
      points.slice(fromI, toI).map((p, j) => `${j ? 'L' : 'M'}${x(fromI + j).toFixed(1)},${y(p[key]).toFixed(1)}`).join('')
    const area =
      `${path('visitors', 0, n)}L${x(n - 1).toFixed(1)},${mainBase}L${x(0).toFixed(1)},${mainBase}Z`

    // End labels only when they cannot collide; otherwise the legend, tooltip
    // and table carry the values (nudging them apart would detach them).
    const yv = y(last.visitors)
    const yp = y(last.pageViews)
    const endLabels = Math.abs(yv - yp) >= 13
      ? [{ y: yp, value: last.pageViews }, { y: yv, value: last.visitors }]
      : [{ y: yv, value: last.visitors }]

    return {
      mainTicks, barTicks, left, plotW, barW, pad, step, mainBase, barTop, barBase, x, y, by, xLabels, area, endLabels,
      dashLast,
      visitorsLine: path('visitors', 0, solidTo),
      viewsLine: path('pageViews', 0, solidTo),
      visitorsTail: dashLast ? path('visitors', n - 2, n) : '',
      viewsTail: dashLast ? path('pageViews', n - 2, n) : '',
    }
  }, [width, points, n])

  // A tap pins the tooltip on touch screens (there is no hover to end it), so
  // tapping anywhere else clears it.
  useEffect(() => {
    if (active == null) return
    const onDown = (e: Event) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setActive(null)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active])

  // A different range can have fewer points than the one being hovered.
  useEffect(() => { setActive(null) }, [points])

  const pick = (e: PointerEvent<SVGRectElement>) => {
    if (!geo || !svgRef.current) return
    const px = e.clientX - svgRef.current.getBoundingClientRect().left
    const i = n === 1 ? 0 : Math.round((px - geo.left - geo.pad) / geo.step)
    setActive(Math.min(n - 1, Math.max(0, i)))
  }

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, (a: number) => number> = {
      ArrowLeft: (a) => Math.max(0, a - 1),
      ArrowRight: (a) => Math.min(n - 1, a + 1),
      Home: () => 0,
      End: () => n - 1,
    }
    if (e.key === 'Escape') { setActive(null); return }
    const move = keys[e.key]
    if (!move) return
    e.preventDefault()
    setActive((a) => move(a ?? n - 1))
  }

  const point = active != null ? points[active] : null
  const flip = geo && active != null ? geo.x(active) > width * 0.6 : false

  return (
    <div
      ref={wrapRef}
      className={s.root}
      style={{ height: HEIGHT }}
      tabIndex={0}
      role="group"
      aria-label={`${label}. Use the arrow keys to read each point.`}
      onKeyDown={onKey}
      onFocus={() => setActive((a) => a ?? n - 1)}
      onBlur={() => setActive(null)}
    >
      {geo && (
        <svg ref={svgRef} width={width} height={HEIGHT} viewBox={`0 0 ${width} ${HEIGHT}`} className={s.svg} aria-hidden="true">
          {/* Main band: grid + ticks */}
          {geo.mainTicks.map((t) => (
            <g key={`m${t}`}>
              <line
                x1={geo.left} x2={geo.left + geo.plotW} y1={geo.y(t)} y2={geo.y(t)}
                className={t === 0 ? s.baseline : s.grid}
              />
              <text x={geo.left - 8} y={geo.y(t)} className={s.tick} textAnchor="end" dominantBaseline="middle">{fmtInt(t)}</text>
            </g>
          ))}

          {/* Bookings band: its own scale, captioned so nobody reads it against the axis above */}
          <text x={geo.left} y={geo.barTop - 9} className={s.caption}>Bookings</text>
          {geo.barTicks.map((t) => (
            <g key={`b${t}`}>
              <line
                x1={geo.left} x2={geo.left + geo.plotW} y1={geo.by(t)} y2={geo.by(t)}
                className={t === 0 ? s.baseline : s.grid}
              />
              <text x={geo.left - 8} y={geo.by(t)} className={s.tick} textAnchor="end" dominantBaseline="middle">{fmtInt(t)}</text>
            </g>
          ))}

          {/* Visitors wash under both lines, then page views, then visitors on top */}
          <path d={geo.area} className={s.area} />
          <path d={geo.viewsLine} className={s.lineViews} />
          <path d={geo.visitorsLine} className={s.lineVisitors} />
          {geo.dashLast && (
            <>
              <path d={geo.viewsTail} className={`${s.lineViews} ${s.tail}`} />
              <path d={geo.visitorsTail} className={`${s.lineVisitors} ${s.tail}`} />
            </>
          )}

          {points.map((p, i) => p.bookings > 0 && (
            <path
              key={p.start}
              d={barPath(geo.x(i), geo.barW, geo.by(p.bookings), geo.barBase)}
              className={s.bar}
              style={
                active != null && active !== i ? { opacity: 0.4 }
                  : geo.dashLast && i === n - 1 ? { opacity: 0.55 }
                    : undefined
              }
            />
          ))}

          {/* X axis: real days / buckets only */}
          {geo.xLabels.map((i) => (
            <text
              key={`x${i}`}
              x={geo.x(i)}
              y={geo.barBase + 17}
              textAnchor="middle"
              className={i === n - 1 ? s.xTickLast : s.xTick}
            >
              {points[i].axis}
            </text>
          ))}

          {/* Crosshair, or — at rest — the latest point emphasised */}
          {active != null && point ? (
            <g>
              <line x1={geo.x(active)} x2={geo.x(active)} y1={PAD_TOP} y2={geo.barBase} className={s.cross} />
              <circle cx={geo.x(active)} cy={geo.y(point.pageViews)} r={4} className={`${s.dot} ${s.dotViews}`} />
              <circle cx={geo.x(active)} cy={geo.y(point.visitors)} r={4} className={`${s.dot} ${s.dotVisitors}`} />
            </g>
          ) : (
            <g>
              <circle cx={geo.x(n - 1)} cy={geo.y(points[n - 1].pageViews)} r={4} className={`${s.dot} ${s.dotViews}`} />
              <circle cx={geo.x(n - 1)} cy={geo.y(points[n - 1].visitors)} r={4.5} className={`${s.dot} ${s.dotVisitors}`} />
              {geo.endLabels.map((l) => (
                <text key={l.y} x={geo.x(n - 1) + 9} y={l.y} dominantBaseline="middle" className={s.endLabel}>
                  {fmtInt(l.value)}
                </text>
              ))}
            </g>
          )}

          {/* Hit layer: the whole plot, so the pointer only has to be nearest a point */}
          <rect
            x={geo.left}
            y={0}
            width={geo.plotW}
            height={geo.barBase}
            className={s.hit}
            onPointerDown={pick}
            onPointerMove={pick}
            onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null) }}
          />
        </svg>
      )}

      {geo && point && active != null && (
        <div
          className={s.tooltip}
          style={{ left: geo.x(active), transform: flip ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)' }}
        >
          <div className={s.ttDate}>
            {point.title}
            {point.note && <span className={s.ttNote}>{point.note}</span>}
          </div>
          <div className={s.ttRow}><span className={`${s.key} ${s.keyVisitors}`} /><b>{fmtInt(point.visitors)}</b><span>Visitors</span></div>
          <div className={s.ttRow}><span className={`${s.key} ${s.keyViews}`} /><b>{fmtInt(point.pageViews)}</b><span>Page views</span></div>
          <div className={s.ttRow}><span className={s.key} /><b>{fmtInt(point.sessions)}</b><span>Sessions</span></div>
          <div className={s.ttRow}><span className={`${s.key} ${s.keyBookings}`} /><b>{fmtInt(point.bookings)}</b><span>Bookings</span></div>
        </div>
      )}
    </div>
  )
}

/** Mirrors the marks: a stroke for each line, a block for the bars. */
export function TrafficLegend() {
  return (
    <div className={s.legend}>
      <span className={s.legendItem}><span className={`${s.legendLine} ${s.keyVisitors}`} />Visitors</span>
      <span className={s.legendItem}><span className={`${s.legendLine} ${s.keyViews}`} />Page views</span>
      <span className={s.legendItem}><span className={s.legendBar} />Bookings</span>
    </div>
  )
}
