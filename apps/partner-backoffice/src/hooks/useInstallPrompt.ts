import { useEffect, useState } from 'react'

/** The `beforeinstallprompt` event (not in standard TS lib types). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Platform = 'installable' | 'ios' | 'installed' | 'unsupported'

interface InstallState {
  /** What the UI should offer:
   *  - 'installable': we have a deferred prompt → show a one-click Install button
   *  - 'ios': iOS Safari (no programmatic API) → show Share→Add-to-Home steps
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
  else if (isIos()) platform = 'ios'

  const promptInstall = async () => {
    if (!deferred) return 'unavailable' as const
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null) // a deferred prompt can only be used once
    return outcome
  }

  return { platform, promptInstall }
}
