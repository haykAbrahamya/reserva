import { Modal } from '@reserva/ui'
import { useT } from '@/i18n'
import { OpenInBrowser } from '@/components/common/OpenInBrowser/OpenInBrowser'
import type { InAppBrowser } from '@/lib/inAppBrowser'
import { useCurrentTool } from '@/tools/currentTool'
import s from './SaveSheet.module.scss'

interface Props {
  browser: InAppBrowser
  /** The finished image, to press and hold. Null for a PDF, which no web view keeps. */
  imageUrl: string | null
  /** What the image shows, for a screen reader. */
  label?: string
  /** Its photos do not travel to the other browser (before & after). */
  photosStay?: boolean
  onClose: () => void
}

/**
 * Saving inside an app's built-in browser, where a download goes nowhere. The
 * image is shown full size to press and hold — the one way many of these
 * browsers still keep a picture — with the way out to a real browser under it
 * for when that does not work either. A PDF gets only the way out.
 */
export function SaveSheet({ browser, imageUrl, label, photosStay, onClose }: Props) {
  const t = useT()
  const tool = useCurrentTool() ?? undefined

  return (
    <Modal open onClose={onClose} title={t(imageUrl ? 'inApp.saveTitle' : 'inApp.pdfTitle')} size="sm">
      <div className={s.sheet}>
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={label ?? ''} className={s.image} />
            <p className={s.lead}>{t('inApp.saveHold')}</p>
            <p className={s.else}>{t('inApp.saveElse')}</p>
          </>
        ) : (
          <p className={s.lead}>{t('inApp.pdfBody', { app: t(`inApp.app.${browser.app}`) })}</p>
        )}
        <OpenInBrowser browser={browser} from="sheet" tool={tool} />
        {photosStay && <p className={s.note}>{t('inApp.photosStay')}</p>}
      </div>
    </Modal>
  )
}
