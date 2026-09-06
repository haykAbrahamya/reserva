import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Write the query string without the page jumping to the top.
 *
 * Extracted because this app now has two filtered listings — the vacancy board
 * and the specialist directory — and this is the fix for a bug that took
 * trapping `window.scrollTo` to find. Reproducing it from memory in a second
 * place would mean reproducing about half of it.
 *
 * The cause: nothing in the app scrolls on a filter change, and the document
 * does not shrink — it grows. The offset is discarded by the BROWSER,
 * synchronously, while the history entry is written, because
 * `history.scrollRestoration` is `manual` (useScrollRestoration needs manual
 * mode so it can restore POP positions itself once the data has loaded).
 *
 * Because the loss happens inside `setParams`, no React effect can observe the
 * old value: by the time even a layout effect runs, the offset is already 0. So
 * it is captured on the line before the write and re-asserted afterwards.
 *
 * Re-asserted every frame for a short window rather than once, because TWO
 * things move the page across a filter change:
 *
 *  1. the browser discarding the offset during the history write, and
 *  2. the new result set reflowing to a different height a few hundred
 *     milliseconds later, when the request lands.
 *
 * The hold is released the instant the reader shows any intent to scroll
 * themselves — otherwise this would fight them, which is a far worse bug than
 * the one it fixes.
 */
const HOLD_MS = 420

export interface WriteOptions {
  /**
   * Hold the reader's scroll position across the write. True by default,
   * because that is right for a FILTER: the list changes under you and your
   * place in the page should not.
   *
   * Pass false when the write is a deliberate move to somewhere else in the
   * list — turning a page — where holding the position would pin the reader to
   * the pager they just used, looking at the end of results they have not seen
   * the start of. The caller then owns where the page goes instead.
   */
  preserveScroll?: boolean
}

export function useScrollSafeSetParams(): (next: URLSearchParams, options?: WriteOptions) => void {
  const [, setParams] = useSearchParams()

  return useCallback(
    (next: URLSearchParams, options?: WriteOptions) => {
      const y = window.scrollY

      /*
       * `replace`, so dragging a slider does not stack thirty history entries:
       * one Back press should leave the listing, not step back through the
       * reader's own filtering.
       */
      setParams(next, { replace: true })
      if (options?.preserveScroll === false || y === 0) return

      const started = performance.now()
      let raf = 0
      let released = false

      const release = () => {
        if (released) return
        released = true
        cancelAnimationFrame(raf)
        window.removeEventListener('wheel', release)
        window.removeEventListener('touchstart', release)
        window.removeEventListener('keydown', release)
      }

      // Passive, so this can never delay the reader's own scrolling.
      window.addEventListener('wheel', release, { passive: true, once: true })
      window.addEventListener('touchstart', release, { passive: true, once: true })
      window.addEventListener('keydown', release, { once: true })

      const hold = () => {
        if (released) return
        if (Math.abs(window.scrollY - y) > 2) {
          window.scrollTo({ top: y, behavior: 'instant' })
        }
        if (performance.now() - started < HOLD_MS) raf = requestAnimationFrame(hold)
        else release()
      }
      raf = requestAnimationFrame(hold)
    },
    [setParams],
  )
}
