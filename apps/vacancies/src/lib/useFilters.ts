import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  clearFilters,
  countActiveFilters,
  parseFilters,
  toSearchParams,
  toggleValue,
  type BoardFilters,
  type ListKey,
  type Range,
  type RangeKey,
} from './filters'

export interface UseFilters {
  filters: BoardFilters
  /** How many filters are active — for the mobile button and "clear all". */
  activeCount: number
  /** Replace the whole selection. */
  set: (next: BoardFilters) => void
  /** Patch one or more fields. */
  patch: (part: Partial<BoardFilters>) => void
  /** Add or remove one value from a list filter. */
  toggle: (key: ListKey, value: string) => void
  /** Set or unset a money range (null clears it). */
  setRange: (key: RangeKey, range: Range) => void
  clear: () => void
}

/**
 * Filter state, read from and written to the URL.
 *
 * Writes use `replace` so dragging a slider does not stack thirty entries in
 * the history — after exploring a board, one Back press should return to
 * whatever the visitor was doing before, not step backwards through their own
 * filtering. The Back button still works across page navigations, which is the
 * behaviour people actually rely on.
 */
export function useFilters(): UseFilters {
  const [params, setParams] = useSearchParams()

  // Derived from the URL rather than mirrored in state: one source of truth, so
  // a link opened in a new tab and a click on a filter chip produce byte-
  // identical results.
  const filters = useMemo(() => parseFilters(params), [params])

  /*
   * Writes preserve the scroll position across the history update.
   *
   * This is the real cause of the "page drags on every filter click" report,
   * and it took trapping `window.scrollTo` to find. Nothing in the app scrolls
   * on a filter change, and the document does not shrink — it actually grows.
   * The offset is discarded by the BROWSER, synchronously, while the history
   * entry is written, because `history.scrollRestoration` is set to `manual`
   * (see useScrollRestoration, which needs manual mode so it can restore POP
   * positions itself after the data loads).
   *
   * Because the loss happens inside `setParams`, no React effect can see the
   * old value: by the time even a layout effect runs, the offset is already 0.
   * So it is captured here, on the line before the write, and put back on the
   * next frame — after the commit, once the results have re-rendered at the
   * same height.
   *
   * `replace`, so dragging a slider does not stack thirty history entries: one
   * Back press should leave the board, not step back through your own filtering.
   */
  const set = useCallback(
    (next: BoardFilters) => {
      const y = window.scrollY
      setParams(toSearchParams(next), { replace: true })
      if (y === 0) return

      /*
       * Hold the position until the new results have settled.
       *
       * Two separate things move the page across a filter change, which is why
       * a single correction was not enough:
       *
       *  1. the browser discards the offset while writing the history entry —
       *     verified with `window.scrollTo` trapped and never called, and with
       *     the document GROWING across the click, so it is neither our code
       *     nor a clamp. It happens because `history.scrollRestoration` is
       *     `manual` (useScrollRestoration needs manual mode to restore POP
       *     positions after data loads).
       *  2. the new result set reflows to a slightly different height a few
       *     hundred milliseconds later, when the request lands.
       *
       * So the offset is re-asserted every frame for a short window rather than
       * once. The window is released the instant the reader shows any intent to
       * scroll themselves — otherwise this would fight them, which would be a
       * far worse bug than the one it fixes.
       */
      const HOLD_MS = 420
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

      // Passive so this can never delay the reader's own scrolling.
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

  const patch = useCallback(
    (part: Partial<BoardFilters>) => set({ ...filters, ...part }),
    [filters, set],
  )

  const toggle = useCallback(
    (key: ListKey, value: string) => {
      // The cast is contained here: every list filter is a string list at
      // runtime, and the codec has already discarded anything unrecognized.
      const list = filters[key] as string[]
      patch({ [key]: toggleValue(list, value) } as Partial<BoardFilters>)
    },
    [filters, patch],
  )

  const setRange = useCallback(
    (key: RangeKey, range: Range) => patch({ [key]: range } as Partial<BoardFilters>),
    [patch],
  )

  const clear = useCallback(() => set(clearFilters(filters)), [filters, set])

  const activeCount = useMemo(() => countActiveFilters(filters), [filters])

  return { filters, activeCount, set, patch, toggle, setRange, clear }
}
