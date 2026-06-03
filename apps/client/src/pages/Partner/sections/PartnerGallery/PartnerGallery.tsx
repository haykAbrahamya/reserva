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

  return (
    <section className={s.section}>
      <div className={s.inner}>
        <div className={s.head}>
          <h2 className={s.title}>{t('partner.gallery.title', { name: partner.name })}</h2>
          <span className={s.hint}>{t('partner.gallery.hint')}</span>
        </div>

        <div className={s.grid}>
          {tiles.map((tile, i) => (
            <Reveal
              key={tile.label}
              as="div"
              delay={(i % 4) * 50}
              className={s.tile}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(150deg, ${tile.tone}, color-mix(in srgb, ${tile.tone} 55%, #000))`,
                }}
              />
              <div className={s.sheen} />
              <span className={s.icon}><ImageIcon size={18} /></span>
              <span className={s.label}>{tile.label}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
