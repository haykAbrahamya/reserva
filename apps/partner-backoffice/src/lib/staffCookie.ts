/**
 * Flags this browser as staff for Reserva's site analytics (analytics contract
 * §6).
 *
 * A salon's own team opens its public page all the time — to check a price, to
 * show a client — and those visits must not read as customer interest. The
 * public site reads this cookie and marks the session internal; the platform
 * console leaves internal sessions out by default.
 *
 * Set after sign-in (and activation, which signs in) and again at start-up with
 * a stored session, so a browser signed in before this existed is flagged
 * without a fresh login. Deliberately not cleared on sign-out: the browser
 * still belongs to staff.
 *
 * On reserva.am the cookie goes on the parent domain so reserva.am and every
 * partner subdomain can read it. On localhost cookies ignore the port, so the
 * dev client on its own port sees it too.
 */
export function markStaffBrowser(): void {
  try {
    const host = window.location.hostname
    const onReserva = host === 'reserva.am' || host.endsWith('.reserva.am')
    document.cookie =
      'rsv_staff=1; Path=/; Max-Age=31536000; SameSite=Lax' + (onReserva ? '; Domain=.reserva.am; Secure' : '')
  } catch {
    // Bookkeeping for analytics must never stand in the way of signing in.
  }
}
