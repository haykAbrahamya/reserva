import { Lightbox as SharedLightbox, type LightboxImage } from '@reserva/ui'
import { useT } from '@/i18n'

export type { LightboxImage }

interface Props {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onIndex: (i: number) => void
}

/**
 * The partner gallery's photo viewer.
 *
 * The viewer itself lives in @reserva/ui now — the vacancies app needs the same
 * one for a specialist's portfolio, and the arrows, the arrow keys, the swipe,
 * the counter and the directional slide are all things that had already been
 * tuned once and did not deserve a second, worse implementation.
 *
 * What stays here is the only part that is genuinely local: this app's
 * translations.
 */
export function Lightbox({ images, index, onClose, onIndex }: Props) {
  const t = useT()
  return (
    <SharedLightbox
      images={images}
      index={index}
      onIndex={onIndex}
      onClose={onClose}
      labels={{
        close: t('common.close'),
        prev: t('partner.gallery.prev'),
        next: t('partner.gallery.next'),
        counter: (current, total) => t('partner.gallery.counter', { current, total }),
      }}
    />
  )
}
