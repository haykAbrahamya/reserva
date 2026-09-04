import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Shared behaviour for popover-style controls (Select, TimePicker, DatePicker).
 *
 * The dropdown is rendered in a PORTAL on document.body with `position: fixed`,
 * anchored to the trigger. This is what lets it escape `overflow: auto`/`hidden`
 * ancestors (e.g. the scrolling Modal body) that would otherwise clip it.
 *
 * Outside-click closes the panel, counting BOTH the trigger and the portalled
 * panel as "inside" (the panel is no longer a DOM child of the trigger). We
 * listen on `mousedown` in the capture phase so selection clicks inside the
 * panel still register before any close.
 */
export function useAnchoredDropdown(panelWidth?: number | 'trigger') {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; width: number; openUp: boolean }>(
    { left: 0, top: 0, width: 0, openUp: false },
  )
  const triggerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    // Open upward when there's little room below and more room above.
    const openUp = spaceBelow < 280 && r.top > spaceBelow
    const width = panelWidth === 'trigger' || panelWidth == null ? r.width : panelWidth
    setPos({ left: r.left, top: openUp ? r.top : r.bottom, width, openUp })
  }, [panelWidth])

  // Recalculate position when opening, and on scroll/resize while open.
  useEffect(() => {
    if (!open) return
    reposition()
    const onScroll = () => reposition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open, reposition])

  // Outside-click + Escape close.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  /** Render `children` in a fixed-positioned portal anchored to the trigger.
   *  `minWidth` lets the panel grow wider than a small trigger (e.g. a compact
   *  sort control) so option labels aren't truncated; it's also right-aligned to
   *  the trigger in that case so it doesn't overflow the viewport edge. */
  const renderPanel = useCallback((children: ReactNode, className?: string, minWidth?: number): ReactNode => {
    if (!open) return null

    /*
     * Fit the panel inside the viewport on BOTH axes of the horizontal.
     *
     * The left edge was clamped and the right edge was not, which is invisible
     * on a desktop and broken on a phone: a fixed-width panel (the 288px
     * calendar) anchored to a trigger in the right half of a 375px screen
     * rendered straight off the edge, and the second field of a from–to pair is
     * ALWAYS in the right half. Half the calendar — the later days of the month
     * — simply could not be reached.
     *
     * clientWidth, not innerWidth: innerWidth includes the classic scrollbar, so
     * on desktop it would push the panel a scrollbar's width past the edge.
     */
    const viewport = document.documentElement.clientWidth
    const MARGIN = 8

    // A panel can never be wider than the screen it has to fit on.
    const width = Math.min(Math.max(pos.width, minWidth ?? 0), viewport - MARGIN * 2)
    // When widening past the trigger, grow leftward so the right edge stays put.
    const widenBy = Math.max(0, width - pos.width)
    const left = Math.min(
      Math.max(MARGIN, pos.left - widenBy),
      // max() guards the degenerate case of a viewport narrower than the panel.
      Math.max(MARGIN, viewport - width - MARGIN),
    )

    /*
     * And fit it vertically, by capping the height to the space on that side.
     *
     * Without this a tall panel simply grows past the edge it opened towards:
     * the date-range panel (nine presets, two headings, a divider) is ~420px,
     * so on a 667px phone with the trigger mid-page it overhung the top by 52px
     * and ate its own first option — "Today", the one people reach for most.
     * Clipped at the TOP is the nastier direction too: a panel cut off at the
     * bottom at least looks unfinished, while one cut off at the top looks
     * complete and is quietly missing its beginning.
     *
     * A cap rather than a reposition, because the panel scrolls: everything
     * stays reachable, and no option is hidden by geometry.
     */
    const gap = 4
    const available = pos.openUp
      ? pos.top - gap - MARGIN
      : window.innerHeight - pos.top - gap - MARGIN

    const style: React.CSSProperties = {
      position: 'fixed',
      left,
      width,
      // Panels set their own preferred max-height in CSS; this only ever
      // tightens it, so a short list is never stretched to fill the screen.
      maxHeight: Math.max(120, available),
      zIndex: 4000,
      ...(pos.openUp
        ? { bottom: window.innerHeight - pos.top + gap }
        : { top: pos.top + gap }),
    }
    return createPortal(
      <div ref={panelRef} style={style} className={className} data-open-up={pos.openUp || undefined}>
        {children}
      </div>,
      document.body,
    )
  }, [open, pos])

  return { open, setOpen, triggerRef, panelRef, renderPanel, openUp: pos.openUp }
}
