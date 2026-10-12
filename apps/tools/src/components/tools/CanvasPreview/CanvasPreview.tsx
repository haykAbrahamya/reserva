import { useEffect, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { Lightbox } from '@reserva/ui'
import { useT } from '@/i18n'
import { useToolEvents } from '@/lib/analytics/useToolEvents'
import s from './CanvasPreview.module.scss'

interface Props {
  width: number
  height: number
  /** Memoized — a new function means something changed and the image redraws. */
  draw: (ctx: CanvasRenderingContext2D) => void
  /** Loads what `draw` needs (fonts); the preview redraws once it resolves. */
  prepare?: () => Promise<void>
  /** What the image shows, for a screen reader. */
  label: string
}

/**
 * The live result, drawn at full export resolution and scaled down by CSS.
 *
 * The preview runs the SAME draw function as the download, on a canvas of the
 * same size — so what the visitor sees is exactly the file they get, pixel for
 * pixel, rather than an HTML approximation of it. A tap opens it full size in
 * the shared Lightbox, to check the small print before posting.
 */
export function CanvasPreview({ width, height, draw, prepare, label }: Props) {
  const t = useT()
  const events = useToolEvents()
  const ref = useRef<HTMLCanvasElement>(null)
  const [zoomUrl, setZoomUrl] = useState<string | null>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    let cancelled = false

    // Draw now with whatever faces are loaded, then again once the ones this
    // text needs have arrived, so typing never waits on the network.
    draw(ctx)
    prepare?.().then(() => {
      if (!cancelled) draw(ctx)
    })
    return () => {
      cancelled = true
    }
  }, [draw, prepare])

  // A face that finishes loading later (first visit, slow connection) is not
  // something a canvas notices on its own.
  useEffect(() => {
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    if (!fonts) return
    const redraw = () => {
      const ctx = ref.current?.getContext('2d')
      if (ctx) draw(ctx)
    }
    fonts.addEventListener('loadingdone', redraw)
    return () => fonts.removeEventListener('loadingdone', redraw)
  }, [draw])

  // The zoomed image is a snapshot of this canvas, released when it closes.
  useEffect(() => {
    if (!zoomUrl) return
    return () => URL.revokeObjectURL(zoomUrl)
  }, [zoomUrl])

  const openZoom = () => {
    events?.action('zoom')
    ref.current?.toBlob((blob) => {
      if (blob) setZoomUrl(URL.createObjectURL(blob))
    }, 'image/png')
  }

  return (
    <>
      <button
        type="button"
        className={s.frame}
        style={{ aspectRatio: `${width} / ${height}` }}
        onClick={openZoom}
        aria-label={t('preview.open')}
        title={t('preview.open')}
      >
        <canvas ref={ref} width={width} height={height} className={s.canvas} role="img" aria-label={label} />
        <span className={s.zoomHint} aria-hidden="true">
          <Maximize2 size={15} />
        </span>
      </button>

      {zoomUrl && (
        <Lightbox
          images={[{ url: zoomUrl, label }]}
          index={0}
          onIndex={() => {}}
          onClose={() => setZoomUrl(null)}
          labels={{ close: t('preview.close'), prev: t('preview.prev'), next: t('preview.next') }}
        />
      )}
    </>
  )
}
