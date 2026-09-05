/**
 * Where a salon signs in, and where the activation email lands.
 *
 * One constant, because the backend builds the magic link from its own
 * BACKOFFICE_URL: if this app pointed somewhere else, a salon would be sent to
 * one host by the page and to another by the email it was about to receive, and
 * end up with two tabs and no session.
 */
export const BACKOFFICE_URL =
  import.meta.env.VITE_BACKOFFICE_URL || 'https://backoffice.reserva.am'
