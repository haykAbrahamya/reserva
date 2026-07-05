import { useState, useMemo, useEffect } from 'react'
import { X } from 'lucide-react'
import type { PublicPartner } from '@/mock/partners'
import { BeforeAfter } from '@/components/BeforeAfter/BeforeAfter'
import { useT } from '@/i18n'
import s from './TabbedGallery.module.scss'

interface Props {
  partner: PublicPartner
}

type Tile = NonNullable<PublicPartner['presentation']['gallery']>[number]

/**
 * Gallery tab: gallery + works tiles in one responsive grid. Before/after tiles
 * render the shared draggable comparison; plain photos open in a lightweight
 * full-screen viewer. Reuses the shared BeforeAfter component.
 */
export function TabbedGallery({ partner }: Props) {
  const t = useT()
  const tiles: Tile[] = useMemo(
    () => [...(partner.presentation.gallery ?? []), ...(partner.presentation.works ?? [])],
    [partner],
  )
  const [openUrl, setOpenUrl] = useState<string | null>(null)

  // Close the viewer on Escape.
  useEffect(() => {
    if (!openUrl) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenUrl(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openUrl])

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
          return (
            <button
              key={`ph-${i}`}
              className={s.tile}
              onClick={() => setOpenUrl(tile.url!)}
              aria-label={t('partner.gallery.openImage')}
            >
              <img src={tile.url} alt={tile.label ?? ''} loading="lazy" />
            </button>
          )
        })}
      </div>

      {openUrl && (
        <div className={s.viewer} onClick={() => setOpenUrl(null)} role="dialog" aria-modal="true">
          <button className={s.viewerClose} onClick={() => setOpenUrl(null)} aria-label={t('common.close')}>
            <X size={22} />
          </button>
          <img src={openUrl} className={s.viewerImg} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </section>
  )
}
