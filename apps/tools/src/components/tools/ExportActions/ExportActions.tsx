import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Download, Share2 } from 'lucide-react'
import { Button, useToast } from '@reserva/ui'
import { useT } from '@/i18n'
import { SaveSheet } from '@/components/tools/SaveSheet/SaveSheet'
import type { ExportDetails } from '@/lib/analytics/pulse'
import { useToolEvents } from '@/lib/analytics/useToolEvents'
import { canShareFiles, downloadFile, shareFile } from '@/lib/canvas/exportFile'
import { inApp } from '@/lib/inAppBrowser'
import s from './ExportActions.module.scss'

interface Props {
  /** From useCanvasFile — resolves with the current image. */
  getFile: () => Promise<File>
  /** False until the first image has rendered. */
  ready: boolean
  /** Title handed to the share sheet. */
  shareTitle: string
  /** Size line under the buttons, e.g. "1080 × 1920 · PNG". */
  format: string
  /** What the result was made with, for analytics: its style, layout, row count. */
  details?: ExportDetails
  /** Before & after: in an app's built-in browser, say that its photos stay behind there. */
  photosStay?: boolean
  /** More ways out, under the main two — e.g. a print-ready PDF. */
  children?: ReactNode
}

type Action = 'share' | 'download'

/**
 * Share (where the phone can — that sheet is where Instagram Stories lives)
 * and Download. On a browser that cannot share files, Download is the primary.
 * Inside an app's built-in browser a download goes nowhere, so Download shows
 * the image to press and hold instead, with the way out to a real browser.
 */
export function ExportActions({ getFile, ready, shareTitle, format, details, photosStay, children }: Props) {
  const t = useT()
  const toast = useToast()
  const events = useToolEvents()
  const [busy, setBusy] = useState<Action | null>(null)
  /** The image in the save sheet, as an object URL; null while it is closed. */
  const [held, setHeld] = useState<string | null>(null)
  const sharable = useMemo(canShareFiles, [])

  useEffect(() => {
    if (!held) return
    return () => URL.revokeObjectURL(held)
  }, [held])

  const run = async (action: Action) => {
    setBusy(action)
    try {
      const file = await getFile()
      if (action === 'share') {
        // A dismissed share sheet is no export, and no error either.
        if (await shareFile(file, shareTitle)) events?.exported('share', details)
      } else if (inApp) {
        setHeld(URL.createObjectURL(file))
        events?.exported('hold', details)
      } else {
        downloadFile(file)
        events?.exported('download', details)
        toast(t('export.saved'))
      }
    } catch {
      events?.failed(action)
      toast(t('export.failed'))
    } finally {
      setBusy(null)
    }
  }

  const disabled = !ready || busy !== null

  return (
    <div className={s.actions}>
      <div className={s.buttons}>
        {sharable && (
          <Button variant="accent" className={s.button} disabled={disabled} onClick={() => run('share')}>
            <Share2 size={16} />
            {t('export.share')}
          </Button>
        )}
        <Button
          variant={sharable ? 'default' : 'accent'}
          className={s.button}
          disabled={disabled}
          onClick={() => run('download')}
        >
          <Download size={16} />
          {t('export.download')}
        </Button>
      </div>
      {children && <div className={s.more}>{children}</div>}
      <p className={s.format}>{format}</p>

      {held && inApp && (
        <SaveSheet
          browser={inApp}
          imageUrl={held}
          label={shareTitle}
          photosStay={photosStay}
          onClose={() => setHeld(null)}
        />
      )}
    </div>
  )
}
