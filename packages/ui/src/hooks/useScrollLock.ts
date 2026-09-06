import { useEffect } from 'react'

/**
 * Freeze the page behind an overlay.
 *
 * Extracted because it was written twice inside Modal.tsx alone (once for the
 * modal, once for the drawer) and a third caller — an image lightbox — was
 * about to write it a fourth time. Scroll locking is one of those things that
 * looks like one line and is not.
 *
 * The part that is not one line: hiding the page's scrollbar reclaims its
 * width, so a fixed-width layout jumps sideways the instant an overlay opens
 * and jumps back when it closes. Compensating with padding keeps everything
 * still. `clientWidth` is measured against `innerWidth` rather than assumed,
 * because overlay scrollbars — every touch device, and macOS by default — take
 * no width at all and would be over-compensated.
 *
 * The previous value is captured and restored rather than reset to `''`, so two
 * overlays open at once (a lightbox над a modal) cannot leave the page
 * permanently scrollable behind the one still open.
 */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return

    const { body, documentElement } = document
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight

    const scrollbar = window.innerWidth - documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbar > 0) {
      // Add to whatever padding the page already had, rather than replacing it.
      const current = parseFloat(getComputedStyle(body).paddingRight) || 0
      body.style.paddingRight = `${current + scrollbar}px`
    }

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
    }
  }, [locked])
}
