/**
 * Flags this browser as Reserva staff (analytics contract §6).
 *
 * Staff open partner pages all day to check them; without the flag every one
 * of those visits would be counted as real interest. The public site reads the
 * cookie and marks its sessions internal, and the console leaves them out
 * unless "Include staff traffic" is on.
 *
 * Set after sign-in and again at start-up with a stored session, so a browser
 * signed in before this existed (or whose cookie ran out) is flagged without a
 * fresh login. Deliberately not cleared on sign-out: the browser still belongs
 * to staff.
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
