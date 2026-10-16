import { useEffect, useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button, useToast } from '@reserva/ui'
import { useT } from '@/i18n'
import type { ExportDetails } from '@/lib/analytics/pulse'
import { useToolEvents } from '@/lib/analytics/useToolEvents'
import { canvasToBlob, downloadFile, renderCanvas } from '@/lib/canvas/exportFile'
import { saveInChrome, takeArrivalSave } from '@/lib/handoff'
import { inApp } from '@/lib/inAppBrowser'
import { jpegsToPdf } from '@/lib/pdf'
import s from './PdfButton.module.scss'

type Draw = (ctx: CanvasRenderingContext2D) => void

interface Props {
  /** Pixel size to render at — every page the same. */
  width: number
  height: number
  /** Print size; the image fills the page. */
  widthMm: number
  heightMm: number
  /** The page, or the pages in order (a business card's front, then its back). */
  draw: Draw | readonly Draw[]
  prepare?: () => Promise<void>
  fileName: string
  /** What the result was made with, for analytics. */
  details?: ExportDetails
}

/**
 * Download the same drawing as a print-ready PDF at a real paper size — for
 * a salon that hands out printed gift cards rather than sending an image.
 * Rendered on demand: a PDF is the occasional export, not the common one. In
 * an app's built-in browser on Android, which keeps no file, it is saved in
 * Chrome instead (lib/handoff).
 */
export function PdfButton({ width, height, widthMm, heightMm, draw, prepare, fileName, details }: Props) {
  const t = useT()
  const toast = useToast()
  const events = useToolEvents()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    if (inApp) {
      events?.toChrome(inApp, 'pdf')
      return saveInChrome('pdf')
    }
    setBusy(true)
    try {
      await prepare?.()
      const draws = typeof draw === 'function' ? [draw] : draw
      const pages = []
      for (const drawPage of draws) {
        const jpegBlob = await canvasToBlob(renderCanvas(width, height, drawPage), 'image/jpeg', 0.92)
        const jpeg = new Uint8Array(await jpegBlob.arrayBuffer())
        pages.push({ jpeg, pixelWidth: width, pixelHeight: height, widthMm, heightMm })
      }
      const pdf = jpegsToPdf(pages)
      downloadFile(new File([pdf], fileName, { type: 'application/pdf' }))
      events?.exported('pdf', details)
      toast(t('export.pdfSaved'))
    } catch {
      events?.failed('pdf')
      toast(t('export.failed'))
    } finally {
      setBusy(false)
    }
  }

  // Opened in Chrome from an app's browser to save the PDF: saved at once.
  useEffect(() => {
    if (takeArrivalSave('pdf')) void run()
  }, [])

  return (
    <Button className={s.button} disabled={busy} onClick={run}>
      <FileDown size={16} />
      {t('export.pdf')}
    </Button>
  )
}
