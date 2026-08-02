import { useRef, useEffect, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import s from './CoverPicker.module.scss'

// Mirror the backend guard (8 MB, image/* only) for instant feedback.
const MAX_BYTES = 8 * 1024 * 1024

interface Props {
  /** Committed cover URL from the server (empty until one is uploaded). */
  currentUrl: string
  /** Fires when the user stages a new file (not yet uploaded). */
  onPick: (file: File) => void
  /** Fires when the user clears the cover. */
  onClear: () => void
  onError?: (msg: string) => void
}

/**
 * Landscape cover-image picker for a course. Stages a File locally and previews
 * it via an object URL; the parent form uploads once the course has an id (a
 * brand-new course has none until saved).
 */
export function CoverPicker({ currentUrl, onPick, onClear, onError }: Props) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => { setPreview(null) }, [currentUrl])
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const shown = preview ?? (currentUrl || null)

  const pick = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { onError?.(t('courses.cover.notImage')); return }
    if (file.size > MAX_BYTES) { onError?.(t('courses.cover.tooLarge')); return }
    setPreview(URL.createObjectURL(file))
    onPick(file)
  }

  const clear = () => {
    setPreview(null)
    onClear()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={[s.frame, shown ? s.hasImage : ''].filter(Boolean).join(' ')}
        onClick={() => inputRef.current?.click()}
        aria-label={shown ? t('courses.cover.change') : t('courses.cover.upload')}
      >
        {shown ? (
          <img src={shown} alt="" className={s.img} />
        ) : (
          <span className={s.empty}>
            <ImagePlus size={26} />
            <span className={s.emptyText}>{t('courses.cover.upload')}</span>
            <span className={s.hint}>{t('courses.cover.hint')}</span>
          </span>
        )}
        {shown && (
          <span className={s.overlay}>
            <ImagePlus size={20} />
            <span>{t('courses.cover.change')}</span>
          </span>
        )}
      </button>

      {shown && (
        <button type="button" className={s.removeBtn} onClick={clear}>
          <Trash2 size={13} /> {t('courses.cover.remove')}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}
