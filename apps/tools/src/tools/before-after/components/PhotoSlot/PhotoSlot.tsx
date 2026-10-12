import { useRef, useState, type DragEvent } from 'react'
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@reserva/ui'
import { useT } from '@/i18n'
import type { Box } from '../../model'
import type { Framing, Photo } from '../../photos'
import { PhotoCrop } from './PhotoCrop'
import s from './PhotoSlot.module.scss'

interface Props {
  /** "Before" or "After", as the image will say it. */
  title: string
  photo: Photo | null
  box: Box
  onPick: (file: File) => void
  onFraming: (framing: Partial<Framing>) => void
  onRemove: () => void
}

/**
 * One of the two photos. Empty, it is a drop zone that also opens the
 * gallery or camera on a phone; filled, it is the crop view with zoom,
 * replace and remove.
 */
export function PhotoSlot({ title, photo, box, onPick, onFraming, onRemove }: Props) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const pickFrom = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onPick(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setOver(false)
    pickFrom(e.dataTransfer.files)
  }

  return (
    <div className={s.slot}>
      <span className={s.title}>{title}</span>

      {photo ? (
        <>
          <PhotoCrop photo={photo} box={box} onFraming={onFraming} />
          <label className={s.zoom}>
            <span>{t('beforeAfter.photos.zoom')}</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={photo.zoom}
              onChange={(e) => onFraming({ zoom: Number(e.target.value) })}
            />
          </label>
          <div className={s.actions}>
            <Button size="sm" className={s.action} onClick={() => input.current?.click()}>
              <RefreshCw size={13} />
              {t('beforeAfter.photos.replace')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon
              onClick={onRemove}
              aria-label={t('beforeAfter.photos.remove')}
              title={t('beforeAfter.photos.remove')}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          className={[s.drop, over ? s.over : ''].filter(Boolean).join(' ')}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <ImagePlus size={26} strokeWidth={1.6} />
          <span className={s.dropTitle}>{t('beforeAfter.photos.add')}</span>
          <span className={s.dropHint}>{t('beforeAfter.photos.addHint')}</span>
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pickFrom(e.target.files)
          // Picking the same file again must still fire a change.
          e.target.value = ''
        }}
      />
    </div>
  )
}
