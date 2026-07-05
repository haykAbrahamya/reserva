import { useState, useMemo } from 'react'
import type { PublicPartner } from '@/mock/partners'
import { BeforeAfter } from '@/components/BeforeAfter/BeforeAfter'
import { Lightbox, type LightboxImage } from '../../../../lib/Lightbox/Lightbox'
import { useT } from '@/i18n'
import s from './TabbedGallery.module.scss'

interface Props {
  partner: PublicPartner
}

type Tile = NonNullable<PublicPartner['presentation']['gallery']>[number]

/**
 * Gallery tab: gallery + works tiles in one responsive grid. Before/after tiles
 * render the shared draggable comparison; plain photos open in the SAME shared
 * Lightbox the classic template uses (identical design + nav/swipe/counter),
 * so there's one gallery viewer across templates — no duplication.
 */
export function TabbedGallery({ partner }: Props) {
  const t = useT()
  const tiles: Tile[] = useMemo(
    () => [...(partner.presentation.gallery ?? []), ...(partner.presentation.works ?? [])],
    [partner],
  )
  // Flat list of openable photos (with a url), in render order — the Lightbox
  // navigates over THIS list, so indices match what the grid opens.
  const photos: LightboxImage[] = useMemo(
    () => tiles.filter((tile) => !!tile.url).map((tile) => ({ url: tile.url as string, label: tile.label })),
    [tiles],
  )
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (tiles.length === 0) return null

  return (
    <section className={s.section}>
      <div className={s.grid}>
        {tiles.map((tile, i) => {
          if (tile.type === 'beforeAfter' && tile.beforeUrl && tile.afterUrl) {
            return (
              <div key={`ba-${i}`} className={[s.tile, s.tileWide].join(' ')}>
                <BeforeAfter
                  beforeUrl={tile.beforeUrl}
                  afterUrl={tile.afterUrl}
                  beforeLabel={t('partner.gallery.before')}
                  afterLabel={t('partner.gallery.after')}
                />
              </div>
            )
          }
          if (!tile.url) return null
          const photoIndex = photos.findIndex((ph) => ph.url === tile.url)
          return (
            <button
              key={`ph-${i}`}
              className={s.tile}
              onClick={() => setLightboxIndex(photoIndex)}
              aria-label={t('partner.gallery.openImage')}
            >
              <img src={tile.url} alt={tile.label ?? ''} loading="lazy" />
            </button>
          )
        })}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndex={setLightboxIndex}
        />
      )}
    </section>
  )
}
