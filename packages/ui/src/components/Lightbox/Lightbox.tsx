import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useScrollLock } from '../../hooks/useScrollLock'
import s from './Lightbox.module.scss'

export interface LightboxImage {
  url: string
  label?: string
}

/**
 * Every string this overlay shows. Passed in rather than read from an i18n
 * hook, for the same reason DatePickerLabels is: @reserva/ui is shared by four
 * apps with four translation bundles and no common provider.
 */
export interface LightboxLabels {
  close: string
  prev: string
  next: string
  /** e.g. `(3, 8) => "3 of 8"`. Omit to hide the counter. */
  counter?: (current: number, total: number) => string
}

export interface LightboxProps {
  images: LightboxImage[]
  /** Index of the visible image. The caller owns it, so it survives a re-render. */
  index: number
  onIndex: (index: number) => void
  onClose: () => void
  labels: LightboxLabels
}

/** How far a finger has to travel before it counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD = 50
/** Must match the longest close keyframe in the stylesheet. */
const CLOSE_DURATION = 200

/**
 * A full-screen photo viewer.
 *
 * Moved here from the client app's partner gallery, unchanged in behaviour,
 * because the vacancies app needed the same thing for a specialist's portfolio
 * — and the version it had grown instead was a plain overlay with one image
 * and no way to reach the next one. Every affordance below already existed and
 * had already been tuned; writing a second, worse one would have been the
 * expensive option.
 *
 * What it carries that a bare overlay does not:
 *  · arrows, and arrow KEYS, and swipe — three audiences, three gestures
 *  · a counter, so a gallery of nine does not feel like a gallery of one
 *  · direction-aware slide: navigating right slides in from the right, which is
 *    what makes a sequence feel like a sequence
 *  · an exit animation, so closing is not a hard cut
 *  · scroll lock with scrollbar compensation, so the page behind neither
 *    scrolls nor jolts sideways
 *
 * On a phone the arrows move to the bottom corners, where a thumb is, rather
 * than staying at the vertical centre where they sit under the photo.
 */
export function Lightbox({ images, index, onIndex, onClose, labels }: LightboxProps) {
  /* 0 = first open (a soft fade, no slide), 1 = next, -1 = previous. */
  const [dir, setDir] = useState<0 | 1 | -1>(0)
  const [closing, setClosing] = useState(false)
  const touchStartX = useRef<number | null>(null)

  const count = images.length
  const current = images[index]

  useScrollLock(true)

  const requestClose = useCallback(() => {
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      onClose()
    }, CLOSE_DURATION)
  }, [onClose])

  const go = useCallback(
    (d: 1 | -1) => {
      if (count < 2) return
      setDir(d)
      onIndex((index + d + count) % count)
    },
    [count, index, onIndex],
  )

  // Keyboard: the arrows and Escape, on the document — an overlay that has to
  // hold focus to be operable stops being operable the moment anything else
  // takes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go, requestClose])

  if (!current) return null

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1)
    touchStartX.current = null
  }

  return createPortal(
    <div
      className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')}
      onClick={requestClose}
      role="dialog"
      aria-modal="true"
      aria-label={labels.close}
    >
      <div className={s.topBar} onClick={(e) => e.stopPropagation()}>
        {count > 1 && labels.counter && (
          <span className={s.counter}>{labels.counter(index + 1, count)}</span>
        )}
        <button type="button" className={s.close} onClick={requestClose} aria-label={labels.close}>
          <X size={22} />
        </button>
      </div>

      {count > 1 && (
        <button
          type="button"
          className={[s.nav, s.prev].join(' ')}
          onClick={(e) => {
            // Without this the click reaches the overlay and closes the thing
            // the arrow was navigating.
            e.stopPropagation()
            go(-1)
          }}
          aria-label={labels.prev}
        >
          <ChevronLeft size={26} />
        </button>
      )}

      <div
        className={s.stage}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* `key={index}` remounts the img on every change so the slide keyframe
            re-fires. First open (dir 0) gets no slide — it rides the stage's
            fade/scale entrance; only navigation slides directionally. */}
        <img
          key={index}
          className={[s.image, dir === 1 ? s.fromRight : dir === -1 ? s.fromLeft : '']
            .filter(Boolean)
            .join(' ')}
          src={current.url}
          alt={current.label || ''}
        />
        {current.label && (
          <div key={`cap-${index}`} className={s.caption}>
            {current.label}
          </div>
        )}
      </div>

      {count > 1 && (
        <button
          type="button"
          className={[s.nav, s.next].join(' ')}
          onClick={(e) => {
            e.stopPropagation()
            go(1)
          }}
          aria-label={labels.next}
        >
          <ChevronRight size={26} />
        </button>
      )}
    </div>,
    document.body,
  )
}
