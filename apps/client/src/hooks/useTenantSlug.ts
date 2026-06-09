import { useParams } from 'react-router-dom'

/** Hostnames that are NOT a tenant — the apex and platform subdomains. */
const RESERVED_SUBDOMAINS = new Set(['www', 'backoffice', 'api', 'admin', 'internal'])

/**
 * Extract a partner slug from the current hostname, if we're on a tenant
 * subdomain like `antheris.reserva.am`. Returns null for the apex (`reserva.am`),
 * reserved subdomains, and local/IP hosts (where there's no real subdomain).
 */
export function slugFromHost(hostname = window.location.hostname): string | null {
  // No subdomain concept on localhost / bare IPs → fall back to the path.
  if (hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null

  const parts = hostname.split('.')
  // Need at least sub.domain.tld (3 labels) for a real subdomain.
  if (parts.length < 3) return null

  const sub = parts[0].toLowerCase()
  if (RESERVED_SUBDOMAINS.has(sub)) return null
  return sub
}

/**
 * The active partner slug for the booking page. Prefers the subdomain
 * (`antheris.reserva.am`) and falls back to the `/p/:slug` path param so both
 * URL styles — and local development — keep working.
 */
export function useTenantSlug(): string | undefined {
  const { slug: pathSlug } = useParams<{ slug: string }>()
  return slugFromHost() ?? pathSlug
}

/**
 * Absolute URL of the marketing site (the apex). On a tenant subdomain
 * (`gohar-beauty.reserva.am`) a relative "/" stays on the tenant page, so the
 * "Powered by Reserva" link must point at the apex explicitly. Derives the apex
 * from the current host (last two labels) so it's domain-agnostic; in local dev
 * (localhost/IP) it just returns "/".
 */
export function marketingSiteUrl(hostname = window.location.hostname): string {
  if (hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return '/'
  const apex = hostname.split('.').slice(-2).join('.') // gohar.reserva.am -> reserva.am
  return `${window.location.protocol}//${apex}`
}
