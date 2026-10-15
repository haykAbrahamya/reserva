// ─────────────────────────────────────────────────────────────
// The browser built into an app — Instagram, Facebook, TikTok.
//
// A link tapped in a reel or an ad opens there, not in Chrome. On Android it
// cannot hand a file to the phone: there is no share sheet, and a download
// goes nowhere, without an error. So there, saving goes through Chrome
// (lib/handoff): one tap opens the page in Chrome, which saves the result.
// ─────────────────────────────────────────────────────────────

/** Whose browser it is. */
export type InAppName = 'instagram' | 'facebook' | 'tiktok'

const NAMED: ReadonlyArray<[InAppName, RegExp]> = [
  ['instagram', /\bInstagram\b/],
  // Facebook and Messenger mark theirs FBAN/, FBAV/ or FB_IAB/.
  ['facebook', /\bFB(?:AN|AV|_IAB)\//],
  ['tiktok', /BytedanceWebview|musical_ly/i],
]

/**
 * The app whose built-in browser this page runs in, on Android — the apps
 * known to follow an intent:// link to Chrome — or null anywhere else.
 */
export function androidInApp(ua: string): InAppName | null {
  if (!/Android/i.test(ua)) return null
  return NAMED.find(([, re]) => re.test(ua))?.[0] ?? null
}

/** This page's: checked once, since neither the browser nor the app changes during a visit. */
export const inApp: InAppName | null = typeof navigator === 'undefined' ? null : androidInApp(navigator.userAgent)

/**
 * An intent:// link that opens `url` in Chrome. Should Chrome be missing,
 * Android loads `fallback` instead, back in the app's browser.
 */
export function chromeIntentUrl(url: string, fallback: string): string {
  const u = new URL(url)
  return (
    `intent://${u.host}${u.pathname}${u.search}` +
    `#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(fallback)};end`
  )
}
