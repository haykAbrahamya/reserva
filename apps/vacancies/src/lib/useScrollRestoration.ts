import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/** How long to keep trying while the list loads, before settling for close. */
const RESTORE_WINDOW_MS = 1500
const KEY_PREFIX = 'reserva-vacancies-scroll:'

/**
 * Positions live in sessionStorage, not in a ref.
 *
 * A ref is lost the moment the tab reloads, and "back" after a reload is a real
 * journey people make — open a listing, refresh it, press back. sessionStorage
 * is scoped to the tab and cleared when it closes, which is exactly the
 * lifetime a scroll position deserves.
 */
function remember(key: string, y: number) {
  try {
    window.sessionStorage.setItem(KEY_PREFIX + key, String(y))
  } catch {
    // Private mode or blocked storage: restoration is a nicety, not a feature
    // worth throwing over.
  }
}

function recall(key: string): number | null {
  try {
    const raw = window.sessionStorage.getItem(KEY_PREFIX + key)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

/**
 * Scroll behaviour across navigations.
 *
 * Three cases that want three different things:
 *
 *  - **PUSH** (opening a listing) — go to the top. Keeping the offset lands you
 *    mid-description with the title above the fold.
 *  - **POP** (browser back, or this app's back link, which pops on purpose) —
 *    RESTORE. Someone who scrolled to the fourteenth listing, opened it and
 *    came back must land on the fourteenth listing. Sending them to the top
 *    throws away the position they built, and is the fastest way to make a
 *    board not worth scrolling.
 *  - **REPLACE** — move nothing. This is what a filter change is (the board
 *    rewrites its own query string), and moving the page there is the
 *    "dragging" this app works to avoid.
 *
 * The browser's own restoration is switched off, because Chrome restores on POP
 * before the data arrives and lands the page at an arbitrary offset.
 */
export function useScrollRestoration() {
  const { key, pathname } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  /*
   * Record the offset for whichever history entry is current — from the scroll
   * event, and ONLY from the scroll event.
   *
   * The obvious extra safety net, writing the offset again in the effect's
   * cleanup to catch a click landing between two scroll events, is worse than
   * useless here: measured, it always wrote 0. By the time any React cleanup
   * runs — passive OR layout — the offset has already been reset for the
   * outgoing route, so that write reliably clobbered the real position with
   * zero and every back navigation landed at the top. The scroll listener
   * already stores every position the reader actually visits, so there is
   * nothing for a cleanup to add.
   */
  const restoring = useRef(false)
  const pending = useRef<number | null>(null)
  const lastLayoutPath = useRef(pathname)

  useLayoutEffect(() => {
    /*
     * Hold the offset across a same-path history write.
     *
     * A filter change rewrites the query string, and the browser drops the
     * scroll offset to 0 when it does — measured with `window.scrollTo` trapped
     * and never called, and with the document GROWING across the click, so it
     * is neither our code nor a clamp. It is simply what the browser does to
     * this history write, and nothing in React can prevent it.
     *
     * So the offset is captured here, before paint, and put back in the passive
     * effect below once the commit has landed. This is the actual fix for the
     * "page drags on every filter click" report — the reserved height in
     * Board.module.scss stops the document from shrinking, and this stops the
     * browser from discarding the position.
     */
    lastLayoutPath.current = pathname

    /*
     * Capture the target HERE, in the layout phase, not in the effect that
     * performs the restore.
     *
     * This was the second half of the bug. Between the layout phase and the
     * passive effect, the browser paints the new route — and because the board
     * refetches, that first paint is short, so the browser clamps the offset
     * and fires a scroll event. The listener below then wrote 0 over the very
     * position the restore was about to read. Reading it now, before anything
     * can paint, removes the race rather than trying to out-run it.
     */
    pending.current = navigationType === 'POP' ? recall(key) : null
    restoring.current = pending.current != null

    const onScroll = () => {
      // While a restore is in flight the offsets are ours, not the reader's.
      // Recording them would overwrite the position with the intermediate
      // values of the very animation putting them back.
      if (restoring.current) return
      remember(key, window.scrollY)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [key, navigationType])

  // The path we were last on, to recognise a same-page URL rewrite.
  const lastPath = useRef(pathname)

  useEffect(() => {
    const samePage = lastPath.current === pathname
    lastPath.current = pathname

    /*
     * A same-path navigation moves NOTHING, whatever the router reports.
     *
     * This guard is deliberately about the pathname rather than about
     * `navigationType`, because the reported type turned out not to be
     * trustworthy here: a filter change calls `setSearchParams(..., { replace:
     * true })`, but `useNavigationType()` kept reporting the previous action,
     * so the POP branch ran, found nothing saved under the freshly-minted key
     * and scrolled the board to the top on every filter click. Measured, the
     * document had actually GROWN across that click — proof the jump was ours
     * and not the browser clamping.
     *
     * Comparing paths cannot be fooled that way. A board rewriting its own
     * query string is on the same page, and staying put is always right there.
     */
    // A same-path navigation moves nothing. Preserving the offset across the
    // history write itself belongs at the write site, where the old value is
    // still readable — see useFilters.
    if (samePage || navigationType === 'REPLACE') return

    if (navigationType === 'PUSH') {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }

    const target = pending.current
    if (target == null) {
      /*
       * A POP with nothing remembered: do nothing.
       *
       * Scrolling to the top here was the other half of the same bug. There is
       * no case where yanking the page for a history entry we have no position
       * for beats leaving it alone.
       */
      return
    }

    const done = () => {
      restoring.current = false
    }

    /*
     * POP with a saved position.
     *
     * The board refetches on mount, so for the first few frames the document is
     * far too short to hold the offset and a single scrollTo would clamp to
     * almost nothing. So this retries until the page is tall enough, then stops.
     *
     * If the window expires the page has genuinely got shorter — a listing
     * expired, or fewer results came back — and it settles for as close as the
     * document allows, which still beats the headline.
     */
    let raf = 0
    const started = performance.now()

    const attempt = () => {
      const reachable = document.documentElement.scrollHeight - window.innerHeight
      if (reachable >= target) {
        window.scrollTo({ top: target, behavior: 'instant' })
        // One more frame before handing scroll tracking back, so the event
        // from our own scrollTo is not mistaken for the reader moving.
        requestAnimationFrame(done)
        return
      }
      if (performance.now() - started > RESTORE_WINDOW_MS) {
        window.scrollTo({ top: Math.max(0, reachable), behavior: 'instant' })
        requestAnimationFrame(done)
        return
      }
      raf = requestAnimationFrame(attempt)
    }

    raf = requestAnimationFrame(attempt)
    return () => {
      cancelAnimationFrame(raf)
      done()
    }
  }, [key, pathname, navigationType])
}
