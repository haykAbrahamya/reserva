import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Images, Trash2 } from 'lucide-react'
import { AVATAR_MAX_BYTES, Button, Empty } from '@reserva/ui'
import { resolveImageUrl } from '@/api/client'
import { useProfessionalAuth } from '@/auth/ProfessionalAuth'
import { useT } from '@/i18n'
import s from './PortfolioSection.module.scss'

/** Matches the server's own cap. */
const MAX_PHOTOS = 12

/**
 * Photos of the work.
 *
 * The single most persuasive thing on a profile in this trade — a salon
 * deciding whether to call someone looks at the pictures before it reads the
 * paragraph — so this is a section rather than a field, and the tiles are as
 * large as the column allows.
 *
 * Order is editable because the first tile is the one that appears on the
 * directory card, which makes "which of these is my best photo" a real question
 * with a real consequence. It is done with arrows rather than drag-and-drop:
 * dragging is the nicer gesture on a desktop and an unreliable one on a phone,
 * where most of these photos are taken and uploaded, and arrows are the only
 * version of this that works from a keyboard at all.
 */
export function PortfolioSection() {
  const t = useT()
  const { professional, media } = useProfessionalAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!professional) return null

  const photos = professional.photos
  const full = photos.length >= MAX_PHOTOS

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError('')
    // Mirrors the backend so the rejection is instant rather than a round trip.
    if (!file.type.startsWith('image/')) return setError(t('account.photo.notImage'))
    if (file.size > AVATAR_MAX_BYTES) return setError(t('account.photo.tooLarge'))

    setBusy(true)
    try {
      await media.addPhoto(file)
    } catch {
      setError(t('account.photoFailed'))
    } finally {
      setBusy(false)
      // Without this, choosing the same file again fires no change event.
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async (url: string) => {
    setError('')
    setBusy(true)
    try {
      await media.deletePhoto(url)
    } catch {
      setError(t('account.photoFailed'))
    } finally {
      setBusy(false)
    }
  }

  /** Swap a tile with its neighbour and persist the whole order. */
  const move = async (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= photos.length) return
    const urls = photos.map((p) => p.url)
    ;[urls[index], urls[target]] = [urls[target], urls[index]]
    setError('')
    setBusy(true)
    try {
      await media.reorder(urls)
    } catch {
      setError(t('account.photoFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={s.panel}>
      <header className={s.head}>
        <div>
          <h1 className={s.heading}>{t('account.nav.portfolio')}</h1>
          <p className={s.sub}>{t('account.portfolio.sub', { max: MAX_PHOTOS })}</p>
        </div>
        {/* Hidden while the list is empty: the empty state already carries this
            exact button, and offering the same action twice on one screen makes
            a reader stop to work out whether the two differ. */}
        {photos.length > 0 && (
          <Button variant="accent" onClick={() => inputRef.current?.click()} disabled={busy || full}>
            <ImagePlus size={15} />
            {busy ? t('account.uploading') : t('account.portfolio.add')}
          </Button>
        )}
      </header>

      {error && <p className={s.error}>{error}</p>}
      {full && <p className={s.note}>{t('account.portfolio.full', { max: MAX_PHOTOS })}</p>}

      {photos.length === 0 ? (
        <Empty
          icon={Images}
          title={t('account.portfolio.emptyTitle')}
          description={t('account.portfolio.emptyBody')}
          action={
            <Button variant="accent" onClick={() => inputRef.current?.click()} disabled={busy}>
              <ImagePlus size={15} />
              {t('account.portfolio.add')}
            </Button>
          }
        />
      ) : (
        <ul className={s.grid}>
          {photos.map((photo, i) => (
            <li key={photo.url} className={s.tile}>
              <img className={s.image} src={resolveImageUrl(photo.url) ?? ''} alt={photo.label ?? ''} loading="lazy" />

              {/* The first tile is the one the directory card shows, so it says
                  so — otherwise the order looks arbitrary and nobody touches it. */}
              {i === 0 && <span className={s.coverBadge}>{t('account.portfolio.cover')}</span>}

              <div className={s.tileBar}>
                <button
                  type="button"
                  className={s.tileBtn}
                  onClick={() => void move(i, -1)}
                  disabled={busy || i === 0}
                  aria-label={t('account.portfolio.moveEarlier')}
                >
                  <ArrowLeft size={14} />
                </button>
                <button
                  type="button"
                  className={s.tileBtn}
                  onClick={() => void move(i, 1)}
                  disabled={busy || i === photos.length - 1}
                  aria-label={t('account.portfolio.moveLater')}
                >
                  <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  className={[s.tileBtn, s.tileDanger].join(' ')}
                  onClick={() => void remove(photo.url)}
                  disabled={busy}
                  aria-label={t('account.portfolio.remove')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  )
}
