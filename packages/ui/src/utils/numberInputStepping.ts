let installed = false

const isNumberInput = (el: EventTarget | null): el is HTMLInputElement =>
  el instanceof HTMLInputElement && el.type === 'number'

/** The nearest ancestor that can still scroll the way the wheel turned. */
function scrollTargetFor(el: Element, dy: number): Element | null {
  for (let n = el.parentElement; n; n = n.parentElement) {
    const { overflowY } = getComputedStyle(n)
    if (overflowY !== 'auto' && overflowY !== 'scroll') continue
    const room = dy > 0 ? n.scrollHeight - n.clientHeight - n.scrollTop : n.scrollTop
    if (room > 0) return n
  }
  return document.scrollingElement
}

/**
 * Makes `<input type="number">` change by typing only.
 *
 * Browsers step a focused number field on the mouse wheel and on ↑/↓, so
 * someone who types a price and then scrolls the form to check something else
 * silently changes the price. This blocks both, page-wide, and scrolls the
 * page / modal the wheel was meant for instead — the field keeps its focus.
 * The spinner arrows are hidden in tokens.css. Covers the shared `Input` and
 * every raw number input alike. Call once at app start; repeats are no-ops.
 */
export function disableNumberInputStepping(): void {
  if (installed || typeof document === 'undefined') return
  installed = true

  document.addEventListener(
    'wheel',
    (e) => {
      // Only a focused field steps — over any other the wheel already just
      // scrolls. Ctrl+wheel is the browser's zoom (and trackpad pinch): leave it.
      if (!isNumberInput(e.target) || e.target !== document.activeElement || e.ctrlKey) return
      // Stops the step, and with it the native scroll — so scroll by hand.
      e.preventDefault()
      const unit =
        e.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16
          : e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight
            : 1
      scrollTargetFor(e.target, e.deltaY)?.scrollBy({ top: e.deltaY * unit, left: e.deltaX * unit })
    },
    { passive: false, capture: true },
  )

  document.addEventListener(
    'keydown',
    (e) => {
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && isNumberInput(e.target)) e.preventDefault()
    },
    { capture: true },
  )
}
