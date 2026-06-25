import { type Visit } from '@/services/visits.service'

/** Relative time, falling back to an absolute date for older visits. */
export function fmtWhen(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Loopback IPs (local/dev traffic) read clearer as "localhost". */
export function fmtIp(ip: string | null): string {
  if (!ip) return '—'
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.')) return 'localhost'
  return ip
}

export function fmtGeo(v: Visit): string {
  if (v.city && v.country) return `${v.city}, ${v.country}`
  return v.country ?? '—'
}

export function fmtBrowser(v: Visit): string {
  if (!v.browser) return '—'
  return v.browserVer ? `${v.browser} ${v.browserVer}` : v.browser
}

export function fmtOs(v: Visit): string {
  if (!v.os) return '—'
  return v.osVer ? `${v.os} ${v.osVer}` : v.os
}
