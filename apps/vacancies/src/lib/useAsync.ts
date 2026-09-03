import { useEffect, useRef, useState } from 'react'
import { ApiError, isAbort } from '@/api/client'

export interface AsyncState<T> {
  data: T | null
  error: ApiError | null
  loading: boolean
}

interface Options {
  /**
   * Keep the previous result on screen while the next one loads.
   *
   * This is the difference between a filter panel that feels instant and one
   * that flashes. Dropping to a spinner on every keystroke makes the page
   * height collapse and the scroll position jump; holding the old list and
   * dimming it keeps the visitor's place while the new one arrives.
   */
  keepPrevious?: boolean
  /** Skip fetching entirely (a detail page with no id yet). */
  skip?: boolean
}

/**
 * Run an async function when its dependencies change, with cancellation.
 *
 * Deliberately not a cache. A board's list is the thing the visitor is looking
 * at right now, and every keystroke changes it — caching would spend memory on
 * result sets nobody returns to. `fetchMeta` is the one call worth caching and
 * it is cached by HTTP, at the layer that can actually serve it from a CDN.
 *
 * The abort is the important part: a request whose filters are already stale
 * must not land after the current one and overwrite it. That out-of-order
 * write is the classic filter bug where the list shows results for the query
 * you typed two keystrokes ago.
 */
export function useAsync<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  options: Options = {},
): AsyncState<T> {
  const { keepPrevious = false, skip = false } = options

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    error: null,
    loading: !skip,
  })

  // Held in a ref so `keepPrevious` does not need `state` in the effect's
  // dependency list, which would re-run the fetch on every result.
  const previous = useRef<T | null>(null)

  // The callback identity changes on every render for an inline arrow, so the
  // effect keys off `deps` and reads the latest fn from a ref.
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (skip) {
      setState({ data: null, error: null, loading: false })
      return
    }

    const controller = new AbortController()
    setState({
      data: keepPrevious ? previous.current : null,
      error: null,
      loading: true,
    })

    fnRef
      .current(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return
        previous.current = data
        setState({ data, error: null, loading: false })
      })
      .catch((err: unknown) => {
        // An abort is this hook doing its job, not a failure to report.
        if (isAbort(err) || controller.signal.aborted) return
        setState({
          data: keepPrevious ? previous.current : null,
          error: err instanceof ApiError ? err : new ApiError('UNKNOWN', String(err), 0),
          loading: false,
        })
      })

    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip, keepPrevious])

  return state
}

/**
 * Debounce a value.
 *
 * Used for the search box only. Filter clicks fire immediately — a chip that
 * waits 300ms feels broken — but a text field must not issue a request per
 * character.
 */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(id)
  }, [value, ms])
  return debounced
}
