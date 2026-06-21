import { useRef, useState, useCallback, type TouchEvent as ReactTouchEvent } from 'react'

/**
 * Android/iOS-style "drag the sheet down to dismiss" gesture for mobile bottom
 * sheets — without fighting inner scrolling OR interactive controls.
 *
 * A drag is only ever STARTED from one of two safe places:
 *  1. The grab handle (matched by `handleSelector`) — the obvious affordance.
 *  2. Inside the scrollable body (matched by `scrollSelector`) while it's
 *     scrolled to the very top and the finger is clearly pulling DOWN.
 *
 * Crucially, a touch that lands on any other element (a dropdown trigger, a
 * button, an input, a Select, etc.) NEVER becomes a drag — so tapping controls
 * inside the sheet can't accidentally dismiss it. We also require a real
 * downward movement past a small threshold before engaging, so a plain tap
 * (with tiny finger jitter) is never treated as a drag.
 *
 * Usage:
 *   const drag = useDragDismiss({ onDismiss, scrollSelector: `.${s.body}`, handleSelector: `.${s.grab}` })
 *   <div className={s.sheet} {...drag.handlers} style={drag.style}> … </div>
 */

interface Options {
  /** Called when the user drags far/fast enough to dismiss. */
  onDismiss: () => void
  /** Selector (within the sheet) for the scrollable region. */
  scrollSelector?: string
  /** Selector for the grab handle — a drag may always start here. */
  handleSelector?: string
  /** Min px dragged to dismiss on release (default 120). */
  threshold?: number
  /** Min downward velocity (px/ms) to dismiss regardless of distance (default 0.6). */
  velocity?: number
  /** Px of downward movement before a drag engages — avoids tap jitter (default 10). */
  engageAt?: number
  /** Disable the gesture entirely (e.g. on desktop). */
  enabled?: boolean
}

export function useDragDismiss({
  onDismiss,
  scrollSelector,
  handleSelector,
  threshold = 120,
  velocity = 0.6,
  engageAt = 10,
  enabled = true,
}: Options) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)

  const startY = useRef(0)
  const startT = useRef(0)
  const lastY = useRef(0)
  const lastT = useRef(0)
  // Has this gesture engaged into an actual sheet drag?
  const engaged = useRef(false)
  // Is this gesture even ELIGIBLE to become a drag? (handle, or top-of-scroll)
  const eligible = useRef(false)
  const onHandle = useRef(false)
  const scrollEl = useRef<HTMLElement | null>(null)

  const reset = useCallback(() => {
    engaged.current = false
    eligible.current = false
    onHandle.current = false
    setDragging(false)
  }, [])

  const onTouchStart = useCallback((e: ReactTouchEvent<HTMLElement>) => {
    if (!enabled || e.touches.length !== 1) { eligible.current = false; return }
    const t = e.touches[0]
    startY.current = lastY.current = t.clientY
    startT.current = lastT.current = performance.now()
    engaged.current = false
    setOffset(0)

    const sheet = e.currentTarget
    const target = e.target instanceof Node ? e.target : null

    // Did the touch start on the grab handle?
    const handle = handleSelector ? sheet.querySelector<HTMLElement>(handleSelector) : null
    onHandle.current = !!(handle && target && handle.contains(target))

    // Or inside the scrollable body?
    scrollEl.current = scrollSelector ? sheet.querySelector<HTMLElement>(scrollSelector) : null
    const inScroll = !!(scrollEl.current && target && scrollEl.current.contains(target))

    // Eligible to drag only from the handle, or from within the scroll region.
    // Anywhere else (controls, dropdowns, footer buttons) → never a drag.
    eligible.current = onHandle.current || inScroll
  }, [enabled, scrollSelector, handleSelector])

  const onTouchMove = useCallback((e: ReactTouchEvent<HTMLElement>) => {
    if (!enabled || !eligible.current || e.touches.length !== 1) return
    const t = e.touches[0]
    const dy = t.clientY - startY.current
    lastY.current = t.clientY
    lastT.current = performance.now()

    if (!engaged.current) {
      // Need a clear downward pull past the engage threshold.
      if (dy < engageAt) return
      // From the scroll body, only take over when it's at the very top —
      // otherwise it's a normal content scroll, leave it alone.
      if (!onHandle.current && (scrollEl.current?.scrollTop ?? 0) > 0) return
      engaged.current = true
      startY.current = t.clientY // re-baseline so there's no visual jump
      setDragging(true)
    }

    const move = t.clientY - startY.current
    if (move <= 0) { setOffset(0); return } // ignore upward
    if (e.cancelable) e.preventDefault() // stop content scroll while dragging
    setOffset(move)
  }, [enabled, engageAt])

  const endDrag = useCallback(() => {
    if (!enabled || !engaged.current) { reset(); setOffset(0); return }
    const moved = offset
    const dt = Math.max(1, lastT.current - startT.current)
    const v = moved / dt
    const shouldDismiss = moved > threshold || (moved > 60 && v > velocity)

    reset()
    if (shouldDismiss) {
      onDismiss()
      // keep the offset; the unmount/closing animation takes over
    } else {
      setOffset(0) // spring back
    }
  }, [enabled, offset, threshold, velocity, onDismiss, reset])

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
