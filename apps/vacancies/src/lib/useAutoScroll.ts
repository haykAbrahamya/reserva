import { useEffect, type RefObject } from 'react'

/** Pixels per second. Slow enough to read a label as it passes. */
const SPEED = 22

/** Cap the frame delta so a backgrounded tab does not resume with a jump. */
const MAX_FRAME_MS = 64

/**
 * Drift a horizontal scroller back and forth on its own.
 *
 * For a strip of links that overflows on a phone: without motion, most readers
 * never learn there is anything to the right of the fold, and the fade alone is
 * a weak hint. A slow drift shows the row is longer than the screen, which is
 * the entire message.
 *
 * Four things keep it from being annoying, which is the usual fate of anything
 * that moves by itself:
 *
 *  - it STOPS for good the moment the reader touches it. Motion that resumes
 *    after you have grabbed something is fighting you.
 *  - it pauses on hover and on focus. A link that slides away from a cursor, or
 *    from a keyboard user tabbing through, is worse than a static list.
 *  - it only runs while the strip is actually on screen.
 *  - it does not run at all under prefers-reduced-motion, where self-starting
 *    movement is exactly what has been asked not to happen.
 *
 * It bounces at each end rather than looping. A seamless loop needs the content
 * duplicated in the DOM, and duplicating a set of links means every one of them
 * appears on the page twice — which is untidy for a screen reader and pointless
 * for a crawler.
 *
 * A no-op when the element does not overflow, so the wide layout (where the row
 * wraps instead) costs nothing.
 */
export function useAutoScroll(ref: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let last = 0
    let direction = 1
    let paused = false
    let visible = true
    let stopped = false

    const step = (now: number) => {
      if (stopped) return
      const delta = last ? Math.min(MAX_FRAME_MS, now - last) : 0
      last = now

      const max = el.scrollWidth - el.clientWidth
      if (max > 1 && !paused && visible) {
        let next = el.scrollLeft + (direction * SPEED * delta) / 1000
        if (next >= max) {
          next = max
          direction = -1
        } else if (next <= 0) {
          next = 0
          direction = 1
        }
        el.scrollLeft = next
      }

      raf = requestAnimationFrame(step)
    }

    /*
     * The reader taking over ends this permanently.
     *
     * Keyed off INPUT events rather than the scroll event, because the loop
     * above writes scrollLeft on every frame — a scroll listener could not tell
     * the reader's gesture from the animation's own output, and would stop
     * itself on the first frame.
     */
    const stop = () => {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(raf)
      for (const [type, fn] of listeners) el.removeEventListener(type, fn)
      observer?.disconnect()
    }

    const pause = () => { paused = true }
    const resume = () => { paused = false }

    const listeners: Array<[string, EventListener]> = [
      ['pointerdown', stop],
      ['touchstart', stop],
      ['wheel', stop],
      ['keydown', stop],
      ['mouseenter', pause],
      ['mouseleave', resume],
      ['focusin', pause],
      ['focusout', resume],
    ]
    for (const [type, fn] of listeners) {
      el.addEventListener(type, fn, { passive: true })
    }

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting
            },
            { threshold: 0.2 },
          )
    observer?.observe(el)

    raf = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(raf)
      for (const [type, fn] of listeners) el.removeEventListener(type, fn)
      observer?.disconnect()
    }
  }, [ref, enabled])
}
