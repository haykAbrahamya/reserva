import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ImageOff, X } from 'lucide-react'
import { Button } from '@reserva/ui'
import { useT } from '@/i18n'
import { OpenInBrowser } from '@/components/common/OpenInBrowser/OpenInBrowser'
import { useToolAtPath } from '@/lib/analytics/useToolAtPath'
import { canShareFiles } from '@/lib/canvas/exportFile'
import { inApp } from '@/lib/inAppBrowser'
import { VISIT_PATH } from '@/tools/appointment-card/visitLink'
import s from './InAppNotice.module.scss'

const CLOSED_KEY = 'reserva-tools-inapp-closed'

/**
 * Says so before any work is done: inside an app's built-in browser that can
 * neither share nor download a file, an image made here has no way out. Where
 * the share sheet works (Instagram on an iPhone) there is nothing to say.
 *
 * Never on the visit page — that is a client reading their appointment, not
 * someone about to save an image. Closed, it stays closed for the visit; the
 * save button still explains, at the moment it matters.
 */
export function InAppNotice() {
  const t = useT()
  const { pathname } = useLocation()
  const tool = useToolAtPath()
  const [closed, setClosed] = useState(wasClosed)

  if (!inApp || canShareFiles() || closed || pathname === VISIT_PATH) return null

  const close = () => {
    setClosed(true)
    try {
      window.sessionStorage.setItem(CLOSED_KEY, '1')
    } catch {
      // Blocked storage: closed for this page only.
    }
  }

  return (
    <div className={s.notice}>
      <section className={s.card} aria-labelledby="in-app-notice">
        <span className={s.icon} aria-hidden="true">
          <ImageOff size={18} />
        </span>
        <div className={s.text}>
          <h2 id="in-app-notice" className={s.title}>
            {t('inApp.notice', { app: t(`inApp.app.${inApp.app}`) })}
          </h2>
          <p className={s.body}>{t('inApp.carry')}</p>
        </div>
        <div className={s.actions}>
          {/* The menu alternative waits in the save sheet: here it would only push the tool down. */}
          <OpenInBrowser browser={inApp} from="notice" tool={tool} compact />
        </div>
        <Button variant="ghost" size="sm" icon className={s.close} onClick={close} aria-label={t('inApp.close')}>
          <X size={15} />
        </Button>
      </section>
    </div>
  )
}

function wasClosed(): boolean {
  try {
    return window.sessionStorage.getItem(CLOSED_KEY) === '1'
  } catch {
    return false
  }
}
