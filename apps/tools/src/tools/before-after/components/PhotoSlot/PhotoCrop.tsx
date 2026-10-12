import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { useT } from '@/i18n'
import type { Box } from '../../model'
import { drawPhoto, panFocus, type Framing, type Photo } from '../../photos'
import s from './PhotoSlot.module.scss'

interface Props {
  photo: Photo
  /** The photo's slot in the output — gives the crop its exact shape. */
  box: Box
  onFraming: (framing: Partial<Framing>) => void
}

/** Drawing resolution of the crop view; CSS scales it to the column. */
const VIEW_WIDTH = 480
/** Keyboard nudge, as a share of the slot. */
const NUDGE = 0.04
/** The tallest a crop view may be; a tall slot gets a narrower view instead. */
const MAX_VIEW_HEIGHT = 380

/**
 * The photo in its slot's exact shape, drawn with the same function as the
 * export — so the framing chosen here is the framing that ships. Dragging
 * moves the photo inside the slot; arrow keys do the same for a keyboard.
 */
export function PhotoCrop({ photo, box, onFraming }: Props) {
  const t = useT()
  const ref = useRef<HTMLCanvasElement>(null)
  const last = useRef<{ x: number; y: number } | null>(null)
  const viewHeight = Math.round((VIEW_WIDTH * box.height) / box.width)
  const view = { width: VIEW_WIDTH, height: viewHeight }

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (ctx) drawPhoto(ctx, photo, { x: 0, y: 0, width: VIEW_WIDTH, height: viewHeight })
  }, [photo, viewHeight])

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    last.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!last.current) return
    // Pointer pixels → view pixels, the units panFocus works in.
    const scale = VIEW_WIDTH / e.currentTarget.getBoundingClientRect().width
    const dx = (e.clientX - last.current.x) * scale
    const dy = (e.clientY - last.current.y) * scale
    last.current = { x: e.clientX, y: e.clientY }
    onFraming(panFocus(photo, view, dx, dy))
  }

  const onPointerUp = () => {
    last.current = null
  }

  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const step = {
      ArrowLeft: [NUDGE * VIEW_WIDTH, 0],
      ArrowRight: [-NUDGE * VIEW_WIDTH, 0],
      ArrowUp: [0, NUDGE * viewHeight],
      ArrowDown: [0, -NUDGE * viewHeight],
    }[e.key]
    if (!step) return
    e.preventDefault()
    onFraming(panFocus(photo, view, step[0], step[1]))
  }

  return (
    <div className={s.crop} style={{ maxWidth: `${(MAX_VIEW_HEIGHT * box.width) / box.height}px` }}>
      <canvas
        ref={ref}
        width={VIEW_WIDTH}
        height={viewHeight}
        className={s.cropCanvas}
        tabIndex={0}
        role="img"
        aria-label={t('beforeAfter.photos.drag')}
        title={t('beforeAfter.photos.drag')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}
