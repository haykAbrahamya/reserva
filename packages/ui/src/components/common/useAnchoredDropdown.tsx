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
    const widenBy = minWidth && minWidth > pos.width ? minWidth - pos.width : 0
    // When widening, anchor to the trigger's right edge so it grows leftward.
    const left = Math.max(8, pos.left - widenBy)
    const style: React.CSSProperties = {
      position: 'fixed',
      left,
      width: pos.width,
      minWidth,
      zIndex: 4000,
      ...(pos.openUp
        ? { bottom: window.innerHeight - pos.top + 4 }
        : { top: pos.top + 4 }),
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
