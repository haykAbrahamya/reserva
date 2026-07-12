import { useRef, useEffect, useState } from 'react'
import { Camera, Trash2, User } from 'lucide-react'
import { initials } from '@reserva/shared'
import { useI18n } from '@/i18n'
import s from './AvatarPicker.module.scss'

// Client-side guard mirroring the backend (8 MB, image/* only) so the user gets
// instant feedback instead of a round-trip rejection.
const MAX_BYTES = 8 * 1024 * 1024

interface Props {
  /** Committed photo URL from the server (empty until one is uploaded). */
  currentUrl: string
  /** Name — used for the initials fallback and the accent color seed. */
  name: string
  accent: string
  /** Fires when the user picks a new file (staged, not yet uploaded). */
  onPick: (file: File) => void
  /** Fires when the user clears the photo (staged remove). */
  onClear: () => void
  /** Error text to surface (e.g. "too large"). */
  onError?: (msg: string) => void
}

/**
 * Circular avatar with a hover/press-to-change affordance. Stages a File locally
 * and previews it via an object URL — the parent form decides when to actually
 * upload (needed for the "new specialist" case, which has no id until saved).
 */
export function AvatarPicker({ currentUrl, name, accent, onPick, onClear, onError }: Props) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Reset the local preview whenever the committed URL changes (e.g. reopening
  // the modal for a different specialist).
  useEffect(() => {
    setPreview(null)
  }, [currentUrl])

  // Revoke the object URL when it's replaced or the component unmounts.
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const shown = preview ?? (currentUrl || null)

  const pick = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError?.(t('specialists.modal.avatar.notImage'))
      return
    }
    if (file.size > MAX_BYTES) {
      onError?.(t('specialists.modal.avatar.tooLarge'))
      return
    }
    setPreview(URL.createObjectURL(file))
    onPick(file)
  }

  const clear = () => {
    setPreview(null)
    onClear()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={s.panel}>
      <button
        type="button"
        className={s.disc}
        onClick={() => inputRef.current?.click()}
        aria-label={t('specialists.modal.avatar.change')}
        style={{ background: shown ? undefined : accent }}
      >
        {shown ? (
          <img src={shown} alt={name} className={s.img} />
        ) : name.trim() ? (
          <span className={s.initials}>{initials(name)}</span>
        ) : (
          <User size={28} className={s.placeholder} />
        )}
        <span className={s.overlay}>
          <Camera size={20} />
        </span>
      </button>

      <div className={s.body}>
        <div className={s.label}>{t('specialists.modal.avatar.title')}</div>
        <div className={s.hint}>{t('specialists.modal.avatar.hint')}</div>
        <div className={s.actions}>
          <button type="button" className={[s.actionBtn, s.primary].join(' ')} onClick={() => inputRef.current?.click()}>
            <Camera size={14} />
            {shown ? t('specialists.modal.avatar.change') : t('specialists.modal.avatar.upload')}
          </button>
          {shown && (
            <button type="button" className={[s.actionBtn, s.remove].join(' ')} onClick={clear}>
              <Trash2 size={14} />
              {t('specialists.modal.avatar.remove')}
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  )
}
