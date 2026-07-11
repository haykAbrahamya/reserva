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

/** Orientation bucket derived from an image's natural aspect ratio. Drives how
 *  many grid rows/cols the tile spans so photos aren't square-cropped. */
type Shape = 'portrait' | 'landscape' | 'square'
function shapeFor(ratio: number): Shape {
  if (ratio <= 0.8) return 'portrait'   // clearly tall (e.g. 4:5, 9:16 selfies)
  if (ratio >= 1.3) return 'landscape'  // clearly wide
  return 'square'                        // near-square → keep square
}

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
  // Per-tile shape, measured from the loaded image's natural dimensions. Keyed
  // by the tile's url so it's stable across re-renders.
  const [shapes, setShapes] = useState<Record<string, Shape>>({})

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
          const shape = shapes[tile.url] ?? 'square'
          return (
            <button
              key={`ph-${i}`}
              className={[s.tile, s[shape]].join(' ')}
              onClick={() => setLightboxIndex(photoIndex)}
              aria-label={t('partner.gallery.openImage')}
            >
              <img
                src={tile.url}
                alt={tile.label ?? ''}
                loading="lazy"
                onLoad={(e) => {
                  const img = e.currentTarget
                  if (!img.naturalWidth || !img.naturalHeight) return
                  const next = shapeFor(img.naturalWidth / img.naturalHeight)
                  setShapes((prev) => (prev[tile.url as string] === next ? prev : { ...prev, [tile.url as string]: next }))
                }}
              />
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
