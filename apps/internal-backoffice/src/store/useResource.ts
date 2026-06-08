import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Fetch-on-mount data hook. No caching — every time a component mounts the data
 * is fetched fresh, so the UI always shows current server state. Returns the
 * data plus a `reload()` to refetch after a mutation.
 *
 * `deps` controls when to refetch (same semantics as a useEffect dep array).
 */
export function useResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  initial: T,
): { data: T; loading: boolean; error: unknown; reload: () => Promise<void> }
export function useResource<T>(
  fetcher: () => Promise<T>,
  deps?: React.DependencyList,
): { data: T | null; loading: boolean; error: unknown; reload: () => Promise<void> }
export function useResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  initial: T | null = null,
) {
  const [data, setData] = useState<T | null>(initial)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcherRef.current()
      setData(result)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    fetcherRef
      .current()
      .then((result) => active && setData(result))
      .catch((e) => active && setError(e))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, reload: load }
}
