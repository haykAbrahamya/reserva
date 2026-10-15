// ─────────────────────────────────────────────────────────────
// The Instagram account a result is signed with.
//
// The contact line takes "a phone or an Instagram", so it may hold either:
// "@mane.nails", a profile link, a bare username — or "+374 91 123456",
// which is never read as an account. The line itself also goes along as typed
// (contactText), so the console shows whatever it holds.
// ─────────────────────────────────────────────────────────────

/** Instagram usernames: letters, digits, periods and underscores, at most 30. */
const USERNAME = /^[a-z0-9._]{1,30}$/

/**
 * The account the examples a first visit starts from are signed with. It is
 * nobody's: a result still carrying it was not signed by whoever made it.
 */
export const SAMPLE_INSTAGRAM = 'anna.beauty'

/**
 * The bare, lower-case username in `text`, or undefined when it holds none:
 * a profile link (instagram.com/mane.nails), an "@mane.nails" anywhere — but
 * not an e-mail's "@gmail.com" — or one bare word that is not a number.
 */
export function instagramHandle(text: string): string | undefined {
  const value = text.trim()
  const candidate =
    /instagram\.com\/([A-Za-z0-9._]+)/i.exec(value)?.[1] ??
    /(?:^|[^A-Za-z0-9._])@([A-Za-z0-9._]+)/.exec(value)?.[1] ??
    (/^[A-Za-z0-9._]+$/.test(value) && /[A-Za-z]/.test(value) ? value : undefined)
  // A sentence's full stop is not part of a username; Instagram's never end in one.
  const handle = candidate?.toLowerCase().replace(/\.+$/, '')
  if (!handle || !USERNAME.test(handle) || handle.startsWith('.') || handle.includes('..')) return undefined
  return handle === SAMPLE_INSTAGRAM ? undefined : handle
}

/** The contact line as typed — nothing when it is empty or still the example's. */
export function contactText(text: string): string | undefined {
  const value = text.trim()
  return value && value.toLowerCase() !== `@${SAMPLE_INSTAGRAM}` ? value : undefined
}
