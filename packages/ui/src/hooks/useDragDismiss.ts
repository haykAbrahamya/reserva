import { useRef, useState, useCallback, type TouchEvent as ReactTouchEvent } from 'react'

/**
 * Android/iOS-style "drag the sheet down to dismiss" gesture for mobile bottom
 * sheets — without fighting inner scrolling.
 *
 * How the scroll conflict is avoided:
 *  - A downward drag only "grabs" the sheet when the scrollable content is
 *    already at the very top (scrollTop <= 0). If the user is scrolling a long
 *    body, the native scroll wins and we never start dragging.
 *  - A drag that begins on the grab handle / header (anything NOT inside the
 *    scroll region) always grabs immediately.
 *  - Only downward movement translates the sheet; upward is ignored.
 *  - Release past a distance/velocity threshold dismisses; otherwise it springs
 *    back to its resting position.
 *
 * Usage:
 *   const drag = useDragDismiss({ onDismiss: handleClose, scrollSelector: `.${s.body}` })
 *   <div className={s.sheet} {...drag.handlers} style={drag.style}> … </div>
 */

interface Options {
  /** Called when the user drags far/fast enough to dismiss. */
  onDismiss: () => void
  /**
   * CSS selector (within the sheet) for the scrollable region. A downward drag
   * starting inside it only takes over when that region is scrolled to the top.
   */
  scrollSelector?: string
  /** Min px dragged to dismiss on release (default 110). */
  threshold?: number
  /** Min downward velocity (px/ms) to dismiss regardless of distance (default 0.5). */
  velocity?: number
  /** Disable the gesture entirely (e.g. on desktop). */
  enabled?: boolean
}

export function useDragDismiss({
  onDismiss,
  scrollSelector,
  threshold = 110,
  velocity = 0.5,
  enabled = true,
}: Options) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const startY = useRef(0)
  const startT = useRef(0)
  const lastY = useRef(0)
  const lastT = useRef(0)
  // Whether this gesture is allowed to move the sheet (vs. let content scroll).
  const active = useRef(false)
  // Whether the touch began inside the scroll region.
  const fromScroll = useRef(false)
  const scrollEl = useRef<HTMLElement | null>(null)

  const onTouchStart = useCallback((e: ReactTouchEvent<HTMLElement>) => {
    if (!enabled || e.touches.length !== 1) return
    const t = e.touches[0]
    startY.current = lastY.current = t.clientY
    startT.current = lastT.current = performance.now()

    // Did the touch land inside the scrollable body?
    const sheet = e.currentTarget
    scrollEl.current = scrollSelector ? sheet.querySelector<HTMLElement>(scrollSelector) : null
    fromScroll.current = !!(scrollEl.current && e.target instanceof Node && scrollEl.current.contains(e.target))

    // Outside the scroll region (grab handle / header) → eligible immediately.
    active.current = !fromScroll.current
  }, [enabled, scrollSelector])

  const onTouchMove = useCallback((e: ReactTouchEvent<HTMLElement>) => {
    if (!enabled || e.touches.length !== 1) return
    const t = e.touches[0]
    const dy = t.clientY - startY.current
    lastY.current = t.clientY
    lastT.current = performance.now()

    // If the gesture started in the scroll region, only take over once the
    // content is at the top AND the user is pulling DOWN — otherwise let it scroll.
    if (!active.current) {
      const atTop = (scrollEl.current?.scrollTop ?? 0) <= 0
      if (fromScroll.current && atTop && dy > 6) {
        active.current = true
        startY.current = t.clientY // re-baseline so there's no jump
        setDragging(true)
      } else {
        return
      }
    }

    const move = t.clientY - startY.current
    if (move <= 0) { setOffset(0); return } // ignore upward drag
    // Prevent the page/content from scrolling while we're translating the sheet.
    if (e.cancelable) e.preventDefault()
    setDragging(true)
    setOffset(move)
  }, [enabled])

  const endDrag = useCallback(() => {
    if (!enabled) return
    const moved = offset
    const dt = Math.max(1, lastT.current - startT.current)
    const v = moved / dt
    const shouldDismiss = moved > threshold || (moved > 24 && v > velocity)

    active.current = false
    fromScroll.current = false
    setDragging(false)

    if (shouldDismiss) {
      onDismiss()
      // leave offset; the unmount/closing animation takes over
    } else {
      setOffset(0) // spring back
    }
  }, [enabled, offset, threshold, velocity, onDismiss])

  return {
    /** Spread onto the sheet element. */
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd: endDrag,
      onTouchCancel: endDrag,
    },
    /** Inline transform while dragging (no transition during the drag). */
    style: offset > 0
      ? { transform: `translateY(${offset}px)`, transition: dragging ? 'none' : undefined }
      : undefined,
    dragging,
    offset,
  }
}
