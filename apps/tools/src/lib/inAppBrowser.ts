// ─────────────────────────────────────────────────────────────
// The browser built into an app — Instagram, Facebook, TikTok.
//
// A link tapped in a reel or an ad opens there, not in Chrome or Safari. It
// looks like a browser but cannot hand a file to the phone: on Android it has
// no share sheet and a download goes nowhere, without an error. The tools
// detect it so that saving offers what works there, and a way out of it.
// ─────────────────────────────────────────────────────────────

/** Whose browser it is. `other`: a web view we cannot name. */
export type InAppName = 'instagram' | 'facebook' | 'tiktok' | 'other'

export interface InAppBrowser {
  app: InAppName
  os: 'android' | 'ios'
}

const NAMED: ReadonlyArray<[InAppName, RegExp]> = [
  ['instagram', /\bInstagram\b/],
  // Facebook and Messenger mark theirs FBAN/, FBAV/ or FB_IAB/.
  ['facebook', /\bFB(?:AN|AV|_IAB)\//],
  ['tiktok', /BytedanceWebview|musical_ly/i],
]

/** The app's built-in browser this page runs in, or null in a real browser. */
export function detectInAppBrowser(ua: string, standalone = false): InAppBrowser | null {
  const os = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/.test(ua) ? 'ios' : null
  if (!os) return null

  const named = NAMED.find(([, re]) => re.test(ua))?.[0]
  if (named) return { app: named, os }

  // Any other app's web view: Android marks it "; wv)"; on an iPhone it is
  // the missing Safari/ token, which every real iOS browser keeps (Chrome,
  // Firefox and Edge included) — except a web app opened from the home screen.
  const webView = os === 'android' ? /; wv\)/.test(ua) : !/Safari\//.test(ua) && !standalone
  return webView ? { app: 'other', os } : null
}

/** This page's: checked once, since neither the browser nor the app changes during a visit. */
export const inApp: InAppBrowser | null =
  typeof navigator === 'undefined'
    ? null
    : detectInAppBrowser(navigator.userAgent, (navigator as { standalone?: boolean }).standalone === true)

/**
 * Whether a tap can take the visitor straight to Chrome: Android, in an app
 * known to follow intent:// links. An unknown web view may show an error page
 * for one instead, so it gets the menu steps only.
 */
export const canOpenChrome = (b: InAppBrowser): boolean => b.os === 'android' && b.app !== 'other'

/**
 * An intent:// link that opens `url` in Chrome on Android. Should Chrome be
 * missing, Android loads the fallback, which is this same page.
 */
export function chromeIntentUrl(url: string): string {
  const u = new URL(url)
  const scheme = u.protocol.replace(':', '')
  return (
    `intent://${u.host}${u.pathname}${u.search}` +
    `#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`
  )
}
