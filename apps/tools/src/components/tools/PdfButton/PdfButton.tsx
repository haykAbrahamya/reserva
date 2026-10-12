import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button, useToast } from '@reserva/ui'
import { useT } from '@/i18n'
import { canvasToBlob, downloadFile, renderCanvas } from '@/lib/canvas/exportFile'
import { jpegToPdf } from '@/lib/pdf'
import s from './PdfButton.module.scss'

interface Props {
  /** Pixel size to render at. */
  width: number
  height: number
  /** Print size; the image fills the page. */
  widthMm: number
  heightMm: number
  draw: (ctx: CanvasRenderingContext2D) => void
  prepare?: () => Promise<void>
  fileName: string
}

/**
 * Download the same drawing as a print-ready PDF at a real paper size — for
 * a salon that hands out printed gift cards rather than sending an image.
 * Rendered on demand: a PDF is the occasional export, not the common one.
 */
export function PdfButton({ width, height, widthMm, heightMm, draw, prepare, fileName }: Props) {
  const t = useT()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      await prepare?.()
      const jpegBlob = await canvasToBlob(renderCanvas(width, height, draw), 'image/jpeg', 0.92)
      const jpeg = new Uint8Array(await jpegBlob.arrayBuffer())
      const pdf = jpegToPdf({ jpeg, pixelWidth: width, pixelHeight: height, widthMm, heightMm })
      downloadFile(new File([pdf], fileName, { type: 'application/pdf' }))
      toast(t('export.pdfSaved'))
    } catch {
      toast(t('export.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button className={s.button} disabled={busy} onClick={run}>
      <FileDown size={16} />
      {t('export.pdf')}
    </Button>
  )
}
