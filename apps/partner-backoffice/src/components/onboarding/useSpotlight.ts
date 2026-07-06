import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/** Query param carrying the spotlight target key, e.g. `?highlight=addService`. */
export const HIGHLIGHT_PARAM = 'highlight'
/** How long the pulse class stays on before we remove it (matches the CSS). */
const PULSE_MS = 3200
/** Give the target this many frames to appear before giving up (data may load). */
const MAX_ATTEMPTS = 40

/**
 * Deep-link spotlight. A page calls this once; when it's reached with a
 * `?highlight=<key>` query param, the element marked `data-spotlight="<key>"`
 * is smoothly scrolled into view and given a temporary accent glow so the user
 * sees exactly what to do next. The param is stripped from the URL only AFTER
 * the highlight fires, so a refresh/back doesn't replay it.
 *
 * Usage:
 *   useSpotlight()                       // in the page component
 *   <div data-spotlight="addService">…   // on the block to highlight
 */
export function useSpotlight() {
  const { search } = useLocation()
  // Guard so a given key is handled once (defensive against StrictMode double
  // effects / re-renders).
  const handledKey = useRef<string | null>(null)

  useEffect(() => {
    const key = new URLSearchParams(search).get(HIGHLIGHT_PARAM)
    if (!key || handledKey.current === key) return
    handledKey.current = key

    // Strip the param up front WITHOUT a router navigation (history.replaceState
    // doesn't re-render), so removing it can't tear down the highlight we're
    // about to run. A refresh then won't replay it.
    const url = new URL(window.location.href)
    url.searchParams.delete(HIGHLIGHT_PARAM)
    window.history.replaceState(window.history.state, '', url.toString())

    let attempts = 0
    // Timers/rafs intentionally outlive the effect — this is a fire-once visual
    // that shouldn't be cancelled by unrelated re-renders.
    const attempt = () => {
      const el = document.querySelector<HTMLElement>(
        `[data-spotlight="${CSS.escape(key)}"]`,
      )
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Next frame so the scroll starts before the pulse (feels connected).
        requestAnimationFrame(() => {
          el.classList.remove('spotlight-target') // reset if re-triggered
          // Force reflow so re-adding the class restarts the animation.
          void el.offsetWidth
          el.classList.add('spotlight-target')
        })
        setTimeout(() => el.classList.remove('spotlight-target'), PULSE_MS)
        return
      }
      // Target not in the DOM yet (list still loading) — poll a few frames.
      if (attempts++ < MAX_ATTEMPTS) requestAnimationFrame(attempt)
    }
    requestAnimationFrame(attempt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])
}
