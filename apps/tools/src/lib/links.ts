const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL || 'https://reserva.am'

/**
 * A link into the main Reserva site, tagged so the platform's own analytics
 * credits the visit (and any sign-up after it) to the tools. `content` names
 * which spot on the page sent it, e.g. 'header' or 'footer'.
 */
export function platformUrl(path = '/', content?: string): string {
  const url = new URL(path, PLATFORM_URL)
  url.searchParams.set('utm_source', 'reserva-tools')
  url.searchParams.set('utm_medium', 'referral')
  if (content) url.searchParams.set('utm_content', content)
  return url.toString()
}
