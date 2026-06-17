import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '@/i18n'
import s from './Lightbox.module.scss'

export interface LightboxImage {
  url: string
  label?: string
}

interface Props {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onIndex: (i: number) => void
}

const SWIPE_THRESHOLD = 50 // px to count as a swipe

export function Lightbox({ images, index, onClose, onIndex }: Props) {
  const t = useT()
  const [closing, setClosing] = useState(false)
  // Nav direction: 0 = first open (no slide, just a soft fade-in), 1 = next
  // (slide from right), -1 = prev (slide from left).
  const [dir, setDir] = useState<0 | 1 | -1>(0)
  const touchStartX = useRef<number | null>(null)

  const count = images.length
  const current = images[index]
  const go = (d: 1 | -1) => { setDir(d); onIndex((index + d + count) % count) }

  const animatedClose = () => {
    setClosing(true)
    setTimeout(onClose, 180)
  }

  // Keyboard: Esc closes, arrows navigate.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') animatedClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count])

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (!current) return null

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1)
    touchStartX.current = null
  }

  return (
    <div
      className={[s.overlay, closing ? s.closing : ''].filter(Boolean).join(' ')}
      onClick={animatedClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Top bar: counter + close */}
      <div className={s.topBar} onClick={(e) => e.stopPropagation()}>
        {count > 1 && <span className={s.counter}>{t('partner.gallery.counter', { current: index + 1, total: count })}</span>}
        <button className={s.close} onClick={animatedClose} aria-label={t('common.close')}>
          <X size={22} />
        </button>
      </div>

      {/* Prev (hidden for single image) */}
      {count > 1 && (
        <button
          className={[s.nav, s.prev].join(' ')}
          onClick={(e) => { e.stopPropagation(); go(-1) }}
          aria-label={t('partner.gallery.prev')}
        >
          <ChevronLeft size={26} />
        </button>
      )}

      {/* Image stage */}
      <div
        className={s.stage}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* `key={index}` remounts the img each change so the slide keyframe
            re-fires. First open (dir 0) gets no slide — it rides the stage's soft
            fade/scale entrance; only navigation slides directionally. */}
        <img
          key={index}
          className={[s.image, dir === 1 ? s.fromRight : dir === -1 ? s.fromLeft : ''].filter(Boolean).join(' ')}
          src={current.url}
          alt={current.label || ''}
        />
        {current.label && <div key={`cap-${index}`} className={s.caption}>{current.label}</div>}
      </div>

      {/* Next */}
      {count > 1 && (
        <button
          className={[s.nav, s.next].join(' ')}
          onClick={(e) => { e.stopPropagation(); go(1) }}
          aria-label={t('partner.gallery.next')}
        >
          <ChevronRight size={26} />
        </button>
      )}
    </div>
  )
}
