import { useRef, useEffect, useState, type ReactNode } from 'react'
import { Camera, Trash2, User } from 'lucide-react'
import { initials } from '@reserva/shared'
import s from './AvatarPicker.module.scss'

/**
 * Client-side guard mirroring the backend (8 MB, image/* only) so the user gets
 * instant feedback instead of a round trip that ends in a rejection.
 */
export const AVATAR_MAX_BYTES = 8 * 1024 * 1024

/**
 * Every string this control shows.
 *
 * Passed in rather than read from an i18n hook because @reserva/ui is shared by
 * four apps with four separate translation bundles and no common provider —
 * the same arrangement DatePickerLabels uses.
 */
export interface AvatarPickerLabels {
  title: string
  hint: string
  upload: string
  change: string
  remove: string
  notImage: string
  tooLarge: string
}

export interface AvatarPickerProps {
  /** Committed photo URL from the server (empty until one is uploaded). */
  currentUrl: string
  /** Name — used for the initials fallback. */
  name: string
  /** Background behind the initials. */
  accent: string
  labels: AvatarPickerLabels
  /** Fires when the user picks a valid new file. */
  onPick: (file: File) => void
  /** Fires when the user clears the photo. */
  onClear: () => void
  /** Validation failures, already turned into a sentence. */
  onError?: (msg: string) => void
  /** Disables both buttons — an upload in flight, say. */
  busy?: boolean
  /** Rendered under the actions: a progress line, an error, a hint. */
  footer?: ReactNode
}

/**
 * Circular avatar with a press-to-change affordance.
 *
 * Stages a File locally and previews it via an object URL; the PARENT decides
 * when (or whether) to upload. That split is what lets one component serve both
 * callers: the specialist modal holds the file until the record is saved,
 * because a specialist being created has no id to upload against yet, while a
 * professional editing their own profile uploads on the spot. A component that
 * uploaded by itself could only ever serve the second.
 */
export function AvatarPicker({
  currentUrl,
  name,
  accent,
  labels,
  onPick,
  onClear,
  onError,
  busy,
  footer,
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  // Reset the local preview whenever the committed URL changes — reopening the
  // control for a different person, or an upload that has now landed.
  useEffect(() => {
    setPreview(null)
  }, [currentUrl])

  // Revoke the object URL when it is replaced or the component unmounts.
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  const shown = preview ?? (currentUrl || null)

  const pick = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onError?.(labels.notImage)
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      onError?.(labels.tooLarge)
      return
    }
    setPreview(URL.createObjectURL(file))
    onPick(file)
  }

  const clear = () => {
    setPreview(null)
    onClear()
    // Without this, choosing the same file again after a clear fires no change
    // event and the control silently does nothing.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={s.panel}>
      <button
        type="button"
        className={s.disc}
        onClick={() => inputRef.current?.click()}
        aria-label={labels.change}
        disabled={busy}
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
        <div className={s.label}>{labels.title}</div>
        <div className={s.hint}>{labels.hint}</div>
        <div className={s.actions}>
          <button
            type="button"
            className={[s.actionBtn, s.primary].join(' ')}
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Camera size={14} />
            {shown ? labels.change : labels.upload}
          </button>
          {shown && (
            <button
              type="button"
              className={[s.actionBtn, s.remove].join(' ')}
              onClick={clear}
              disabled={busy}
            >
              <Trash2 size={14} />
              {labels.remove}
            </button>
          )}
        </div>
        {footer && <div className={s.footer}>{footer}</div>}
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
