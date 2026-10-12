import { useMemo, useState, type ReactNode } from 'react'
import { Download, Share2 } from 'lucide-react'
import { Button, useToast } from '@reserva/ui'
import { useT } from '@/i18n'
import { canShareFiles, downloadFile, shareFile } from '@/lib/canvas/exportFile'
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
  /** More ways out, under the main two — e.g. a print-ready PDF. */
  children?: ReactNode
}

type Action = 'share' | 'download'

/**
 * Share (where the phone can — that sheet is where Instagram Stories lives)
 * and Download. On a browser that cannot share files, Download is the primary.
 */
export function ExportActions({ getFile, ready, shareTitle, format, children }: Props) {
  const t = useT()
  const toast = useToast()
  const [busy, setBusy] = useState<Action | null>(null)
  const sharable = useMemo(canShareFiles, [])

  const run = async (action: Action) => {
    setBusy(action)
    try {
      const file = await getFile()
      if (action === 'share') {
        await shareFile(file, shareTitle)
      } else {
        downloadFile(file)
        toast(t('export.saved'))
      }
    } catch {
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
    </div>
  )
}
