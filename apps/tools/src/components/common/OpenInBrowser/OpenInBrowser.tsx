import { Copy, ExternalLink } from 'lucide-react'
import { Button, useToast } from '@reserva/ui'
import { useT } from '@/i18n'
import { track, type BrowserOpenFrom } from '@/lib/analytics/pulse'
import { copyText } from '@/lib/clipboard'
import { handoffUrl } from '@/lib/handoff'
import { canOpenChrome, chromeIntentUrl, type InAppBrowser } from '@/lib/inAppBrowser'
import type { ToolId } from '@/tools/registry'
import s from './OpenInBrowser.module.scss'

interface Props {
  browser: InAppBrowser
  /** Where it sits, for analytics. */
  from: BrowserOpenFrom
  tool?: ToolId
  /** The Chrome button alone, without the app-menu alternative under it. */
  compact?: boolean
}

/**
 * The way out of an app's built-in browser, carrying the visit along (see
 * lib/handoff). On Android, one tap opens Chrome; elsewhere the app's own menu
 * does it, and the link can be copied to paste into any browser.
 */
export function OpenInBrowser({ browser, from, tool, compact = false }: Props) {
  const t = useT()
  const toast = useToast()

  const note = (how: 'chrome' | 'copy') =>
    track('browser_open', { app: browser.app, from, how, ...(tool ? { tool } : {}) })

  if (canOpenChrome(browser)) {
    const openChrome = () => {
      note('chrome')
      // Built on the tap, so it carries the draft as it is now.
      window.location.href = chromeIntentUrl(handoffUrl('query'))
    }
    return (
      <div className={s.way}>
        <Button variant="accent" className={s.button} onClick={openChrome}>
          <ExternalLink size={15} />
          {t('inApp.openChrome')}
        </Button>
        {!compact && <p className={s.hint}>{t('inApp.orMenu')}</p>}
      </div>
    )
  }

  const copy = async () => {
    if (!(await copyText(handoffUrl('hash')))) return
    note('copy')
    toast(t('inApp.copied'))
  }

  return (
    <div className={s.way}>
      <p className={s.hint}>{t(browser.os === 'ios' ? 'inApp.menuIos' : 'inApp.menuAndroid')}</p>
      <Button className={s.button} onClick={copy}>
        <Copy size={15} />
        {t('inApp.copyLink')}
      </Button>
    </div>
  )
}
