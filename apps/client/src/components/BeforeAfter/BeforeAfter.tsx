import { useCallback, useRef, useState } from 'react'
import { MoveHorizontal } from 'lucide-react'
import s from './BeforeAfter.module.scss'

interface Props {
  beforeUrl: string
  afterUrl: string
  beforeLabel?: string
  afterLabel?: string
  alt?: string
}

/**
 * Draggable before/after comparison slider. Convention: BEFORE on the left,
 * AFTER on the right. The "after" image is the full base layer; the "before"
 * image sits on top, clipped to the left of the handle. Dragging the divider
 * right reveals more "before", left reveals more "after". Works with mouse,
 * touch, and keyboard (← →).
 */
export function BeforeAfter({ beforeUrl, afterUrl, beforeLabel, afterLabel, alt }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50) // % from the left
  const dragging = useRef(false)

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.max(0, Math.min(100, pct)))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    setFromClientX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    setFromClientX(e.clientX)
  }
  const onPointerUp = () => { dragging.current = false }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 4))
    if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 4))
  }

  return (
    <div
      ref={wrapRef}
      className={s.wrap}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* After — full size underneath, fills the RIGHT of the divider. */}
      <img className={s.img} src={afterUrl} alt={alt} draggable={false} loading="lazy" />
      {afterLabel && <span className={`${s.tag} ${s.tagRight}`}>{afterLabel}</span>}

      {/* Before — same full size on top, clipped from the right to the handle
          position so it occupies the LEFT side (clip-path keeps it un-squished
          at any size, no width JS needed). */}
      <img
        className={`${s.img} ${s.after}`}
        src={beforeUrl}
        alt={alt}
        draggable={false}
        loading="lazy"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      {beforeLabel && pos > 12 && <span className={`${s.tag} ${s.tagLeft}`}>{beforeLabel}</span>}

      {/* Divider + handle */}
      <div
        className={s.divider}
        style={{ left: `${pos}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Before / after"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={onKeyDown}
      >
        <span className={s.handle}><MoveHorizontal size={16} /></span>
      </div>
    </div>
  )
}
