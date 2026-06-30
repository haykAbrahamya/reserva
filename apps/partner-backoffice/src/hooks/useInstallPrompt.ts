import { useEffect, useState } from 'react'

/** The `beforeinstallprompt` event (not in standard TS lib types). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'installable' | 'ios' | 'ios-inapp' | 'installed' | 'unsupported'

interface InstallState {
  /** What the UI should offer:
   *  - 'installable': we have a deferred prompt → show a one-click Install button
   *  - 'ios': iOS Safari (no programmatic API) → show Share→Add-to-Home steps
   *  - 'ios-inapp': iOS inside an in-app browser (Telegram/Instagram/etc.) where
   *    Add-to-Home-Screen doesn't exist → tell them to open in Safari first
   *  - 'installed': already running as / installed app → hide
   *  - 'unsupported': desktop/other browser with no prompt → hide */
  platform: Platform
  /** Fire the native install dialog (only when platform === 'installable'). */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS 13+ reports as Mac; detect by touch.
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari exposes this non-standard flag when launched from the home screen.
  (navigator as unknown as { standalone?: boolean }).standalone === true

/**
 * Detect an in-app browser (web view embedded in another app) where the Safari
 * Share menu — and therefore "Add to Home Screen" — is unavailable. Common ones
 * our partners arrive through: Telegram, Instagram, Facebook, FB Messenger.
 * These webviews carry a tell-tale UA token; "real" Safari has none of them.
 */
const isInAppBrowser = () => {
  const ua = navigator.userAgent
  // Telegram (often no Safari Share), Instagram, Facebook/Messenger, generic webviews.
  if (/\b(FBAN|FBAV|FB_IAB|Instagram|Line|MicroMessenger|GSA)\b/i.test(ua)) return true
  if (/Telegram/i.test(ua)) return true
  // iOS in-app web views are WKWebView: an iOS UA *without* the "Safari" token is
  // a strong signal it's not real Safari (real Safari always includes "Safari").
  const iOS = /iphone|ipad|ipod/i.test(ua)
  if (iOS && !/Safari/i.test(ua)) return true
  return false
}

/**
 * Drives a custom "Install app" button. Captures Chrome/Edge's
 * `beforeinstallprompt` so we can trigger the install on a user click, and
 * detects iOS (no API) + already-installed so the UI can adapt.
 */
export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone())

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault() // stop Chrome's mini-infobar; we drive the prompt ourselves
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  let platform: Platform = 'unsupported'
  if (installed) platform = 'installed'
  else if (deferred) platform = 'installable'
  else if (isIos()) platform = isInAppBrowser() ? 'ios-inapp' : 'ios'

  const promptInstall = async () => {
    if (!deferred) return 'unavailable' as const
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null) // a deferred prompt can only be used once
    return outcome
  }

  return { platform, promptInstall }
}
