import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useScrollSafeSetParams } from './useScrollSafeParams'
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
  const [params] = useSearchParams()

  // Derived from the URL rather than mirrored in state: one source of truth, so
  // a link opened in a new tab and a click on a filter chip produce byte-
  // identical results.
  const filters = useMemo(() => parseFilters(params), [params])

  /*
   * Writes preserve the scroll position across the history update, and are
   * `replace` so dragging a slider does not stack thirty history entries.
   *
   * Both of those live in useScrollSafeParams, which the specialist directory
   * uses too — the scroll behaviour there is a browser quirk about
   * `history.scrollRestoration`, not something specific to this board, and it
   * cost enough to diagnose that it should exist exactly once.
   */
  const writeParams = useScrollSafeSetParams()
  const set = useCallback((next: BoardFilters) => writeParams(toSearchParams(next)), [writeParams])

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
