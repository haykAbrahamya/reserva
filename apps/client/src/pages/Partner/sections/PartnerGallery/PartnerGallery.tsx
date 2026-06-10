import { ImageIcon } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { Reveal } from '@/components/Reveal/Reveal'
import { useT } from '@/i18n'
import s from './PartnerGallery.module.scss'

interface Props {
  partner: PublicPartner
}

export function PartnerGallery({ partner }: Props) {
  const tiles = partner.presentation.gallery
  const t = useT()

  // Subtle brand tint laid over photos so the gallery feels cohesive with the
  // salon's color — kept light (not bold) so the photos still read clearly.
  const tint = partner.presentation.heroTints?.[0] ?? partner.accent

  // Nothing to show → hide the whole section (no empty "Inside …" band).
  if (tiles.length === 0) return null

  return (
    <section className={s.section}>
      <div className={s.inner}>
        <div className={s.head}>
          <h2 className={s.title}>{t('partner.gallery.title', { name: partner.name })}</h2>
        </div>

        <div className={s.grid}>
          {tiles.map((tile, i) => (
            <Reveal
              key={tile.url ?? `${tile.label ?? 'tile'}-${i}`}
              as="div"
              delay={(i % 4) * 50}
              className={s.tile}
            >
              {tile.url ? (
                <>
                  <img
                    className={s.image}
                    src={tile.url}
                    alt={tile.label || partner.name}
                    loading="lazy"
                  />
                  {/* Brand-tinted wash — a visible hint of the salon's color in
                      the corners so the gallery feels cohesive, while the photo
                      stays clear through the middle. */}
                  <div
                    className={s.tint}
                    style={{
                      background: `linear-gradient(150deg, color-mix(in srgb, ${tint} 45%, transparent) 0%, color-mix(in srgb, ${tint} 10%, transparent) 40%, transparent 60%, color-mix(in srgb, ${tint} 38%, transparent) 100%)`,
                    }}
                  />
                </>
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
          ))}
        </div>
      </div>
    </section>
  )
}
