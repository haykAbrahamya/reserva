import { useEffect, useRef, useState } from 'react'

interface RevealOptions {
  /** 0–1 fraction of the element visible before it triggers. */
  threshold?: number
  /** Only animate once (default true). */
  once?: boolean
  /** Delay in ms before marking visible (for staggering). */
  rootMargin?: string
}

/**
 * Returns a ref + `visible` flag that flips true when the element
 * scrolls into view. Pair with CSS that transitions from a hidden
 * to a visible state for scroll-reveal animations.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0,
  once = true,
  // Trigger as soon as the element's top edge enters the viewport bottom,
  // so the reveal plays naturally on the way in.
  rootMargin = '0px 0px -80px 0px',
}: RevealOptions = {}) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect reduced-motion: show immediately.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) obs.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, once, rootMargin])

  return { ref, visible }
}
