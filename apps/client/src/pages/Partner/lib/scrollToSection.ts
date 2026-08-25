/**
 * Smooth-scroll to a section of the public partner page.
 *
 * `scrollIntoView()` alone lands the section flush with the viewport top, which
 * on this page means underneath the fixed PartnerNav — the heading you jumped to
 * is the one thing you can't see. So we measure the bar (tagged
 * `data-partner-nav`, no magic number to keep in sync with the SCSS) and stop
 * short of it.
 *
 * No-ops when the section isn't rendered, so callers can wire a jump link
 * without knowing which sections a given partner actually shows.
 */
export function scrollToSection(id: string, gap = 14) {
  const el = document.getElementById(id)
  if (!el) return

  const nav = document.querySelector('[data-partner-nav]')
  const navH = nav ? nav.getBoundingClientRect().height : 0
  const top = el.getBoundingClientRect().top + window.scrollY - navH - gap

  // Honour the OS "reduce motion" setting — a long smooth scroll is exactly the
  // kind of motion it's meant to suppress.
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
}
