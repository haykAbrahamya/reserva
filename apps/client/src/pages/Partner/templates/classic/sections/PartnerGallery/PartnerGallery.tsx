import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { BeforeAfter } from '@/components/BeforeAfter/BeforeAfter'
import { useT } from '@/i18n'
import { Lightbox, type LightboxImage } from '../../../../lib/Lightbox/Lightbox'
import s from './PartnerGallery.module.scss'

interface Props {
  partner: PublicPartner
  /** Which list to render: 'gallery' (Inside) or 'works'. Defaults to gallery. */
  variant?: 'gallery' | 'works'
  tone?: 'cream' | 'plain'
}

export function PartnerGallery({ partner, variant = 'gallery', tone = 'cream' }: Props) {
  const tiles = variant === 'works'
    ? (partner.presentation.works ?? [])
    : partner.presentation.gallery
  const t = useT()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  // Only real photos (with a url) open in the lightbox. Index here is the
  // position WITHIN this photo list, so clicks map correctly.
  const photos: LightboxImage[] = tiles
    .filter((tile): tile is { url: string; label?: string } => !!tile.url)
    .map((tile) => ({ url: tile.url, label: tile.label }))

  // Subtle brand tint laid over photos so the gallery feels cohesive with the
  // salon's color — kept light (not bold) so the photos still read clearly.
  const tint = partner.presentation.heroTints?.[0] ?? partner.accent

  // Nothing to show → hide the whole section (no empty band).
  if (tiles.length === 0) return null

  const title = variant === 'works'
    ? t('partner.works.title')
    : partner.kind === 'single'
      ? t('partner.gallery.titleSingle')
      : t('partner.gallery.title', { name: partner.name })

  return (
    <section className={[s.section, tone === 'plain' ? s.plain : ''].filter(Boolean).join(' ')}>
      <div className={s.inner}>
        <div className={s.head}>
          <h2 className={s.title}>{title}</h2>
        </div>

        <div className={s.grid}>
          {tiles.map((tile, i) => {
            // Before/after tile → render the draggable comparison slider inline.
            if (tile.type === 'beforeAfter' && tile.beforeUrl && tile.afterUrl) {
              return (
                <Reveal
                  key={`ba-${tile.beforeUrl}-${i}`}
                  as="div"
                  delay={(i % 4) * 50}
                  className={[s.tile, s.tileBA].filter(Boolean).join(' ')}
                >
                  <BeforeAfter
                    beforeUrl={tile.beforeUrl}
                    afterUrl={tile.afterUrl}
                    beforeLabel={t('partner.gallery.before')}
                    afterLabel={t('partner.gallery.after')}
                    alt={tile.label || partner.name}
                  />
                  {tile.label && <span className={s.baLabel}>{tile.label}</span>}
                </Reveal>
              )
            }
            // Map this tile to its position in the (photo-only) lightbox list.
            const photoIndex = tile.url ? photos.findIndex((p) => p.url === tile.url) : -1
            const clickable = photoIndex !== -1
            return (
              <Reveal
                key={tile.url ?? `${tile.label ?? 'tile'}-${i}`}
                as="div"
                delay={(i % 4) * 50}
                className={[s.tile, clickable ? s.clickable : ''].filter(Boolean).join(' ')}
              >
                {clickable ? (
                  <button
                    type="button"
                    className={s.tileBtn}
                    onClick={() => setLightboxIndex(photoIndex)}
                    aria-label={t('partner.gallery.openImage')}
                  >
                    <img
                      className={s.image}
                      src={tile.url}
                      alt={tile.label || partner.name}
                      loading="lazy"
                    />
                    {/* Brand-tinted wash — a visible hint of the salon's color in
                        the corners so the gallery feels cohesive. */}
                    <div
                      className={s.tint}
                      style={{
                        background: `linear-gradient(150deg, color-mix(in srgb, ${tint} 45%, transparent) 0%, color-mix(in srgb, ${tint} 10%, transparent) 40%, transparent 60%, color-mix(in srgb, ${tint} 38%, transparent) 100%)`,
                      }}
                    />
                  </button>
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(150deg, ${tile.tone}, color-mix(in srgb, ${tile.tone} 55%, #000))`,
                    }}
                  />
                )}
                <div className={s.sheen} />
                {!tile.url && <span className={s.icon}><ImageIcon size={18} /></span>}
                {tile.label && <span className={s.label}>{tile.label}</span>}
              </Reveal>
            )
          })}
        </div>
      </div>

      {/* Fullscreen lightbox */}
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
