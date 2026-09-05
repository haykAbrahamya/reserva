import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchVacancies } from '@/api/board.api'
import type { VacancyCard as Card } from '@/api/types'
import type { ApiError } from '@/api/client'
import { toSearchParams, type BoardFilters } from './filters'
import { useAsync } from './useAsync'

export interface BoardResults {
  /** Every page fetched so far, in order. */
  items: Card[]
  /** How many listings match, across all pages. */
  total: number
  /** A request is in flight. Pair with `items.length` to tell cold from warm. */
  loading: boolean
  /** Nothing on screen and nothing loaded — show a skeleton, not a dimmed list. */
  coldLoading: boolean
  error: ApiError | null
  hasMore: boolean
  loadMore: () => void
  /** Refetch page one after a failure. */
  retry: () => void
}

/**
 * The board's result list: fetching, paging and accumulation.
 *
 * Extracted from the board page when the landing pages needed exactly this
 * behaviour over a fixed query. Both surfaces show the same list of the same
 * listings with the same "load more"; the only difference is where the filters
 * come from — the URL on the board, a curated entry on a landing page — so the
 * paging belongs here rather than in either page.
 *
 * Pages ACCUMULATE rather than replace, because "load more" is the right
 * gesture for a feed: numbered pagination asks the visitor to remember which
 * page had the good listing.
 */
export function useBoardResults(filters: BoardFilters, pageSize: number): BoardResults {
  const [page, setPage] = useState(1)
  const [accumulated, setAccumulated] = useState<Card[]>([])

  // The identity of the current query. Anything that changes it starts the
  // results over. Derived from the same serializer the URL uses, so a filter
  // added later cannot be missed here.
  const queryKey = useMemo(() => toSearchParams(filters).toString(), [filters])

  /*
   * A new query resets the PAGE but deliberately does NOT clear the results.
   *
   * Emptying the list here produced one render with nothing in it, so the
   * results column collapsed to its minimum height and the browser clamped the
   * scroll position — then the response arrived, the column grew back, and the
   * whole page appeared to jump. Leaving the previous results in place means
   * the swap happens in a single render.
   */
  useEffect(() => {
    setPage(1)
  }, [queryKey])

  const results = useAsync(
    (signal) => fetchVacancies(filters, page, pageSize, signal),
    [queryKey, page, pageSize],
    { keepPrevious: true },
  )

  // Append each page as it lands. Guarded against duplicate ids because a
  // listing published between two page fetches shifts the offset window, and an
  // unguarded append would render the same card twice.
  useEffect(() => {
    const data = results.data
    if (!data) return
    setAccumulated((prev) => {
      if (data.page === 1) return data.items
      const seen = new Set(prev.map((v) => v.id))
      return [...prev, ...data.items.filter((v) => !seen.has(v.id))]
    })
  }, [results.data])

  const total = results.data?.total ?? 0
  const loadMore = useCallback(() => setPage((p) => p + 1), [])
  const retry = useCallback(() => setPage(1), [])

  return {
    items: accumulated,
    total,
    loading: results.loading,
    coldLoading: results.loading && accumulated.length === 0,
    error: results.error,
    hasMore: accumulated.length < total,
    loadMore,
    retry,
  }
}
