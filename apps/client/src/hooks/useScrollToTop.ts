import { useEffect } from 'react'

/**
 * Scroll the page to the top on mount. Useful for routes that should always
 * start at the top (e.g. the sign-up flow), since SPA navigation preserves the
 * previous scroll position by default.
 */
export function useScrollToTop() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
}
