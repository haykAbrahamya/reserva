import { useRef, useState, type DragEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { Button, useToast } from '@reserva/ui'
import { useT } from '@/i18n'
import s from './LogoField.module.scss'

interface Props {
  /** The current logo as a data URL; null without one. */
  url: string | null
  onPick: (file: File) => Promise<void>
  onRemove: () => void
}

/**
 * The school's logo — optional. Picked or dropped, read on the device and
 * remembered in this browser; shown on a checkerboard, so a transparent
 * logo can be seen to be one. Without it, the certificate uses the school's
 * initials.
 */
export function LogoField({ url, onPick, onRemove }: Props) {
  const t = useT()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const take = (file: File | undefined) => {
    if (!file) return
    onPick(file).catch(() => toast(t('courseCertificate.logo.failed')))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    take(e.dataTransfer.files[0])
  }

  return (
    <div className={s.field}>
      <span className={s.label}>{t('courseCertificate.logo.label')}</span>
      {url ? (
        <div className={s.current}>
          <span className={s.thumb}>
            <img src={url} alt={t('courseCertificate.logo.label')} />
          </span>
          <div className={s.actions}>
            <Button size="sm" onClick={() => input.current?.click()}>
              {t('courseCertificate.logo.replace')}
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove}>
              {t('courseCertificate.logo.remove')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={[s.drop, dragging ? s.dragging : ''].filter(Boolean).join(' ')}
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className={s.icon} aria-hidden="true">
            <ImagePlus size={20} strokeWidth={1.8} />
          </span>
          <span className={s.dropText}>
            <span className={s.dropTitle}>{t('courseCertificate.logo.upload')}</span>
            <span className={s.dropHint}>{t('courseCertificate.logo.hint')}</span>
          </span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className={s.file}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          take(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
