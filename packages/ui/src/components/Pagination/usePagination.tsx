import { useState, useEffect, useMemo } from 'react'

/**
 * Client-side pagination over an in-memory array. Returns the current page's
 * slice plus the props a <Pagination> needs. Page size is stateful so a
 * page-size selector can change it; changing it resets to page 1.
 */
export function usePagination<T>(items: T[], initialPageSize = 5) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))

  // Keep the page in range as the list shrinks/grows (filters, search, etc.).
  useEffect(() => {
    setPage(p => Math.min(p, pageCount))
  }, [pageCount])

  // Reset to the first page whenever the underlying set size changes.
  useEffect(() => { setPage(1) }, [items.length])

  // Changing page size jumps back to the first page so the view isn't empty.
  const setPageSize = (n: number) => { setPageSizeState(n); setPage(1) }

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  )

  const from = items.length === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, items.length)

  return { page, setPage, pageSize, setPageSize, pageCount, pageItems, total: items.length, from, to }
}
