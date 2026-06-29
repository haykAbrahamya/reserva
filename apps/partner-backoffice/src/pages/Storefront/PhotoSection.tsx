import { useEffect, useRef, useState } from 'react'
import {
  ImagePlus, Images, Trash2, GripVertical, Loader2, UploadCloud,
} from 'lucide-react'
import { Button, Modal, useToast } from '@/components/ui'
import {
  partnersService,
  galleryImageUrl,
  type GalleryItem,
  type PhotoList,
} from '@/services/partners.service'
import { ApiError } from '@/services/http'
import { useT } from '@/i18n'
import s from './Storefront.module.scss'

const MAX_TILES = 12

interface Props {
  list: PhotoList
  title: string
  description: string
  /** Initial tiles from the loaded profile. */
  initial: GalleryItem[]
  /** Re-seed value (the saved list) — updates when the profile reloads. */
  saved?: GalleryItem[]
  /** Accent (partner brand) for the tile tint, or undefined for default. */
  accent?: string
  /** Whether this section offers the "before / after" upload. */
  allowBeforeAfter?: boolean
  reload: () => Promise<void>
}

/**
 * One independent, self-managing photo list (Inside gallery OR Works). Owns its
 * own upload / drag-reorder / remove + optional before-after modal, so the page
 * renders it twice with zero duplicated logic.
 */
export function PhotoSection({
  list, title, description, initial, saved, accent, allowBeforeAfter, reload,
}: Props) {
  const toast = useToast()
  const t = useT()
  const [tiles, setTiles] = useState<GalleryItem[]>(initial)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => { if (saved) setTiles(saved) }, [saved])

  const tint = accent && /^#([0-9a-fA-F]{6})$/.test(accent) ? accent : 'var(--accent)'

  // ── Upload simple photos ──
  const handleFiles = async (files: FileList | File[]) => {
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (picked.length === 0) return
    const room = MAX_TILES - tiles.length
    if (room <= 0) { toast(t('storefront.photo.maxImages', { n: MAX_TILES })); return }
    setUploading(true)
    try {
      let next = tiles
      for (const file of picked.slice(0, room)) {
        next = await partnersService.uploadGalleryImage(file, '', list)
      }
      setTiles(next)
      await reload()
      toast(t('storefront.photo.added'))
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('storefront.photo.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  // ── Remove ──
  const removeTile = async (url?: string) => {
    if (!url) return
    const prev = tiles
    setTiles((g) => g.filter((t) => t.url !== url && t.beforeUrl !== url && t.afterUrl !== url))
    try {
      await partnersService.removeGalleryImage(url, list)
      await reload()
      toast(t('storefront.photo.removed'))
    } catch (err) {
      setTiles(prev)
      toast(err instanceof ApiError ? err.message : t('storefront.photo.removeFailed'))
    }
  }

  // ── Drag-to-reorder ──
  const onTileDragStart = (i: number) => setDragIndex(i)
  const onTileDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === i) return
    setTiles((g) => {
      const next = [...g]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(i, 0, moved)
      return next
    })
    setDragIndex(i)
  }
  const onTileDragEnd = async () => {
    setDragIndex(null)
    const urls = tiles.map((g) => g.url ?? g.beforeUrl).filter((u): u is string => !!u)
    try {
      await partnersService.reorderGallery(urls, list)
      reload()
    } catch {
      toast(t('storefront.photo.orderError'))
      reload()
    }
  }

  // ── Before/After modal ──
  const [baOpen, setBaOpen] = useState(false)
  const [baBefore, setBaBefore] = useState<File | null>(null)
  const [baAfter, setBaAfter] = useState<File | null>(null)
  const [baSaving, setBaSaving] = useState(false)
  const baBeforeInput = useRef<HTMLInputElement>(null)
  const baAfterInput = useRef<HTMLInputElement>(null)
  const submitBeforeAfter = async () => {
    if (!baBefore || !baAfter) return
    setBaSaving(true)
    try {
      const next = await partnersService.uploadBeforeAfter(baBefore, baAfter, '', list)
      setTiles(next)
      await reload()
      toast(t('storefront.photo.baAdded'))
      setBaOpen(false); setBaBefore(null); setBaAfter(null)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('storefront.photo.uploadFailed'))
    } finally {
      setBaSaving(false)
    }
  }

  return (
    <section className={s.card}>
      <div className={s.cardHead}>
        <span className={s.cardIcon}><ImagePlus size={18} /></span>
        <div className={s.cardHeadText}>
          <h2 className={s.cardTitle}>{title}</h2>
          <p className={s.cardDesc}>{description}</p>
        </div>
        <span className={s.counter}>{tiles.length}/{MAX_TILES}</span>
      </div>

      <div className={s.cardBody}>
        <div className={s.galleryGrid}>
          {tiles.map((tile, i) => (
            <div
              key={tile.url ?? tile.beforeUrl ?? i}
              className={[s.tile, i === 0 ? s.tileFeatured : '', dragIndex === i ? s.dragging : ''].filter(Boolean).join(' ')}
              draggable
              onDragStart={() => onTileDragStart(i)}
              onDragOver={(e) => onTileDragOver(e, i)}
              onDragEnd={onTileDragEnd}
            >
              {tile.type === 'beforeAfter' && tile.beforeUrl && tile.afterUrl ? (
                <>
                  <div className={s.baSplit}>
                    <img className={s.tileImg} src={galleryImageUrl(tile.beforeUrl)} alt="before" />
                    <img className={s.tileImg} src={galleryImageUrl(tile.afterUrl)} alt="after" />
                  </div>
                  <span className={s.baBadge}>{t('storefront.photo.beforeAfter')}</span>
                </>
              ) : tile.url
                ? <img className={s.tileImg} src={galleryImageUrl(tile.url)} alt={tile.label || ''} />
                : <div className={s.tileTone} style={{ background: tile.tone ?? 'var(--bg-3)' }} />}
              <div
                className={s.tileTint}
                style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${tint} 30%, transparent) 0%, transparent 45%, color-mix(in srgb, ${tint} 22%, transparent) 100%)` }}
              />
              <div className={s.tileOverlay}>
                <span className={s.dragHandle} title={t('storefront.photo.reorder')}><GripVertical size={16} /></span>
                <button className={s.tileDelete} onClick={() => removeTile(tile.url ?? tile.beforeUrl)} title={t('storefront.photo.remove')}>
                  <Trash2 size={15} />
                </button>
              </div>
              {i === 0 && <span className={s.featuredBadge}>{t('storefront.photo.featured')}</span>}
            </div>
          ))}

          {tiles.length < MAX_TILES && (
            <button
              type="button"
              className={[s.dropZone, dragOver ? s.dropActive : ''].filter(Boolean).join(' ')}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              {uploading
                ? <><Loader2 className={s.spin} size={22} /><span>{t('storefront.photo.uploading')}</span></>
                : <>
                    <UploadCloud size={22} />
                    <span className={s.dropFull}>{t('storefront.photo.dragShort')}</span>
                    <span className={s.dropShort}>{t('storefront.photo.dragShort')}</span>
                  </>}
            </button>
          )}
        </div>

        {allowBeforeAfter && tiles.length < MAX_TILES && (
          <button type="button" className={s.baAddBtn} onClick={() => setBaOpen(true)}>
            <Images size={15} /> {t('storefront.photo.addBeforeAfter')}
          </button>
        )}

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {allowBeforeAfter && (
        <Modal
          open={baOpen}
          onClose={() => { if (!baSaving) setBaOpen(false) }}
          title={t('storefront.ba.title')}
          subtitle={t('storefront.ba.subtitle')}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setBaOpen(false)} disabled={baSaving}>{t('storefront.ba.cancel')}</Button>
              <Button variant="accent" onClick={submitBeforeAfter} disabled={!baBefore || !baAfter || baSaving}>
                {baSaving ? t('storefront.ba.adding') : t('storefront.ba.add')}
              </Button>
            </>
          }
        >
          <div className={s.baPickers}>
            <button type="button" className={s.baPicker} onClick={() => baBeforeInput.current?.click()}>
              {baBefore
                ? <img src={URL.createObjectURL(baBefore)} alt="before" className={s.baPreview} />
                : <span className={s.baPickerEmpty}><ImagePlus size={20} /><span>{t('storefront.ba.before')}</span></span>}
              <span className={s.baPickerLabel}>{t('storefront.ba.before')}</span>
            </button>
            <button type="button" className={s.baPicker} onClick={() => baAfterInput.current?.click()}>
              {baAfter
                ? <img src={URL.createObjectURL(baAfter)} alt="after" className={s.baPreview} />
                : <span className={s.baPickerEmpty}><ImagePlus size={20} /><span>{t('storefront.ba.after')}</span></span>}
              <span className={s.baPickerLabel}>{t('storefront.ba.after')}</span>
            </button>
          </div>
          <input ref={baBeforeInput} type="file" accept="image/*" hidden
            onChange={(e) => { setBaBefore(e.target.files?.[0] ?? null); e.target.value = '' }} />
          <input ref={baAfterInput} type="file" accept="image/*" hidden
            onChange={(e) => { setBaAfter(e.target.files?.[0] ?? null); e.target.value = '' }} />
        </Modal>
      )}
    </section>
  )
}
