import { useEffect, useRef, useState } from 'react'
import {
  Store, Instagram, Facebook, Palette, ImagePlus, Trash2, GripVertical,
  ExternalLink, Loader2, UploadCloud, FileText, Pencil,
} from 'lucide-react'
import { Button, Input, Textarea, useToast } from '@/components/ui'
import { useAppStore } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import {
  partnersService,
  galleryImageUrl,
  type GalleryItem,
  type PartnerProfileResponse,
} from '@/services/partners.service'
import { ApiError } from '@/services/http'
import s from './Storefront.module.scss'

const MAX_TILES = 12
const isUrl = (v: string) => v.trim() === '' || /^https?:\/\/.+/i.test(v.trim())
const isHex = (v: string) => /^#([0-9a-fA-F]{6})$/.test(v)

export function Storefront() {
  const setPartner = useAppStore((st) => st.setPartner)
  const toast = useToast()
  const { data: profile, reload } = useResource(() => partnersService.getOwn(), [])

  if (!profile) {
    return (
      <div className={s.page}>
        <Header />
        <div className={s.skeleton} />
        <div className={s.skeleton} />
      </div>
    )
  }

  return <StorefrontInner profile={profile} reload={reload} setPartner={setPartner} toast={toast} />
}

function Header() {
  return (
    <div className={s.head}>
      <div className={s.headIcon}><Store size={20} /></div>
      <div>
        <h1 className={s.h1}>Storefront</h1>
        <p className={s.sub}>Everything visitors see on your public booking page.</p>
      </div>
    </div>
  )
}

interface InnerProps {
  profile: PartnerProfileResponse
  reload: () => Promise<void>
  setPartner: (p: ReturnType<typeof useAppStore.getState>['partner']) => void
  toast: (m: string) => void
}

function StorefrontInner({ profile, reload, setPartner, toast }: InnerProps) {
  // ── Gallery state (kept locally so reorder/upload feel instant) ──
  const [gallery, setGallery] = useState<GalleryItem[]>(profile.presentation?.gallery ?? [])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Re-seed when the loaded profile changes (after reload).
  const savedGallery = profile.presentation?.gallery
  useEffect(() => { setGallery(savedGallery ?? []) }, [savedGallery])

  // ── About + brand + socials ──
  const [about, setAbout] = useState(profile.presentation?.about ?? '')
  const [accent, setAccent] = useState(profile.accent ?? '#A8784B')
  const [instagram, setInstagram] = useState(profile.presentation?.instagram ?? '')
  const [facebook, setFacebook] = useState(profile.presentation?.facebook ?? '')
  const savedAbout = profile.presentation?.about ?? ''
  const savedAccent = profile.accent ?? '#A8784B'
  const savedIg = profile.presentation?.instagram ?? ''
  const savedFb = profile.presentation?.facebook ?? ''
  useEffect(() => { setAbout(savedAbout) }, [savedAbout])
  useEffect(() => { setAccent(savedAccent) }, [savedAccent])
  useEffect(() => { setInstagram(savedIg) }, [savedIg])
  useEffect(() => { setFacebook(savedFb) }, [savedFb])

  const [aboutSaving, setAboutSaving] = useState(false)
  const [brandSaving, setBrandSaving] = useState(false)
  const [socialSaving, setSocialSaving] = useState(false)

  const syncStore = (updated: PartnerProfileResponse) => {
    const current = useAppStore.getState().partner
    if (current) {
      setPartner({
        ...current,
        accent: updated.accent,
        presentation: {
          ...current.presentation,
          about: updated.presentation?.about ?? '',
          instagram: updated.presentation?.instagram ?? '',
          facebook: updated.presentation?.facebook ?? '',
          heroTints: updated.presentation?.heroTints,
          gallery: updated.presentation?.gallery,
        },
      })
    }
  }

  // ── Upload ──
  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) return
    const room = MAX_TILES - gallery.length
    if (room <= 0) { toast(`You can upload up to ${MAX_TILES} images`); return }

    setUploading(true)
    try {
      let next = gallery
      for (const file of list.slice(0, room)) {
        next = await partnersService.uploadGalleryImage(file)
      }
      setGallery(next)
      await reload()
      toast('Image added')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files)
  }

  const removeTile = async (url?: string) => {
    if (!url) return
    const prev = gallery
    setGallery((g) => g.filter((t) => t.url !== url)) // optimistic
    try {
      await partnersService.removeGalleryImage(url)
      await reload()
      toast('Image removed')
    } catch (err) {
      setGallery(prev) // revert
      toast(err instanceof ApiError ? err.message : 'Could not remove image')
    }
  }

  // ── Drag-to-reorder ──
  const onTileDragStart = (i: number) => setDragIndex(i)
  const onTileDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === i) return
    setGallery((g) => {
      const next = [...g]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(i, 0, moved)
      return next
    })
    setDragIndex(i)
  }
  const onTileDragEnd = async () => {
    setDragIndex(null)
    const urls = gallery.map((g) => g.url).filter((u): u is string => !!u)
    try {
      await partnersService.reorderGallery(urls)
      reload()
    } catch {
      toast('Could not save the new order')
      reload()
    }
  }

  // ── Saves ──
  const aboutChanged = about.trim() !== savedAbout.trim()
  const saveAbout = async () => {
    if (!aboutChanged || aboutSaving) return
    setAboutSaving(true)
    try {
      const updated = await partnersService.updateProfile({ presentation: { about: about.trim() } })
      syncStore(updated); await reload()
      toast('About text updated')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save about text')
    } finally { setAboutSaving(false) }
  }

  const accentChanged = accent.toLowerCase() !== savedAccent.toLowerCase()
  const accentValid = isHex(accent)
  const saveBrand = async () => {
    if (!accentChanged || !accentValid || brandSaving) return
    setBrandSaving(true)
    try {
      const updated = await partnersService.updateProfile({ accent })
      syncStore(updated); await reload()
      toast('Brand color updated')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save brand color')
    } finally { setBrandSaving(false) }
  }

  const socialChanged = instagram.trim() !== savedIg || facebook.trim() !== savedFb
  const socialValid = isUrl(instagram) && isUrl(facebook)
  const saveSocials = async () => {
    if (!socialChanged || !socialValid || socialSaving) return
    setSocialSaving(true)
    try {
      const updated = await partnersService.updateProfile({
        presentation: { instagram: instagram.trim(), facebook: facebook.trim() },
      })
      syncStore(updated); await reload()
      toast('Social links updated')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save social links')
    } finally { setSocialSaving(false) }
  }

  return (
    <div className={s.page}>
      <Header />

      {/* ── Gallery ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><ImagePlus size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>Photo gallery</h2>
            <p className={s.cardDesc}>
              Shown in the “Inside …” section of your page. Drag to reorder — the first photo is featured large. Up to {MAX_TILES} images.
            </p>
          </div>
          <span className={s.counter}>{gallery.length}/{MAX_TILES}</span>
        </div>

        <div className={s.cardBody}>
          <div className={s.galleryGrid}>
            {gallery.map((tile, i) => (
              <div
                key={tile.url ?? i}
                className={[s.tile, i === 0 ? s.tileFeatured : '', dragIndex === i ? s.dragging : ''].filter(Boolean).join(' ')}
                draggable
                onDragStart={() => onTileDragStart(i)}
                onDragOver={(e) => onTileDragOver(e, i)}
                onDragEnd={onTileDragEnd}
              >
                {tile.url
                  ? <img className={s.tileImg} src={galleryImageUrl(tile.url)} alt={tile.label || ''} />
                  : <div className={s.tileTone} style={{ background: tile.tone ?? 'var(--bg-3)' }} />}
                {/* Brand-tinted gradient wash over each photo for a cohesive look. */}
                <div
                  className={s.tileTint}
                  style={{
                    background: `linear-gradient(160deg, color-mix(in srgb, ${accentValid ? accent : 'var(--accent)'} 30%, transparent) 0%, transparent 45%, color-mix(in srgb, ${accentValid ? accent : 'var(--accent)'} 22%, transparent) 100%)`,
                  }}
                />
                <div className={s.tileOverlay}>
                  <span className={s.dragHandle} title="Drag to reorder"><GripVertical size={16} /></span>
                  <button className={s.tileDelete} onClick={() => removeTile(tile.url)} title="Remove">
                    <Trash2 size={15} />
                  </button>
                </div>
                {i === 0 && <span className={s.featuredBadge}>Featured</span>}
              </div>
            ))}

            {gallery.length < MAX_TILES && (
              <button
                type="button"
                className={[s.dropZone, dragOver ? s.dropActive : ''].filter(Boolean).join(' ')}
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                {uploading
                  ? <><Loader2 className={s.spin} size={22} /><span>Uploading…</span></>
                  : <>
                      <UploadCloud size={22} />
                      <span className={s.dropFull}>Drag photos here<br />or click to browse</span>
                      <span className={s.dropShort}>Add photo</span>
                    </>}
              </button>
            )}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = '' }}
          />
        </div>
      </section>

      {/* ── About ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><FileText size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>About</h2>
            <p className={s.cardDesc}>The short story shown in the “About” section of your public page.</p>
          </div>
        </div>
        <div className={s.cardBody}>
          <Textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Tell visitors what makes your salon special — your story, your team, what to expect…"
            rows={5}
            maxLength={4000}
          />
          <div className={s.aboutFoot}>
            <span className={s.charCount}>{about.length}/4000</span>
            <Button variant="accent" disabled={!aboutChanged || aboutSaving} onClick={saveAbout}>
              {aboutSaving ? 'Saving…' : 'Save about'}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Brand color ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><Palette size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>Brand color</h2>
            <p className={s.cardDesc}>Your accent color — used for buttons, highlights and the hero gradient.</p>
          </div>
        </div>
        <div className={s.cardBody}>
          <div className={s.brandRow}>
            <label className={s.swatch} style={{ background: accentValid ? accent : 'var(--bg-3)' }} title="Click to pick a color">
              <input
                type="color"
                value={accentValid ? accent : '#A8784B'}
                onChange={(e) => setAccent(e.target.value.toUpperCase())}
              />
              <span className={s.swatchPen}><Pencil size={14} /></span>
            </label>
            <div className={s.brandInput}>
              <Input
                value={accent}
                onChange={(e) => setAccent(e.target.value.toUpperCase())}
                placeholder="#A8784B"
                error={!accentValid ? 'Use a #RRGGBB hex color' : undefined}
              />
            </div>
            <Button variant="accent" disabled={!accentChanged || !accentValid || brandSaving} onClick={saveBrand}>
              {brandSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <div className={s.previewBar} style={{ background: `linear-gradient(120deg, ${accentValid ? accent : '#A8784B'}, color-mix(in srgb, ${accentValid ? accent : '#A8784B'} 55%, #000))` }}>
            <span>Hero gradient preview</span>
          </div>
        </div>
      </section>

      {/* ── Social links ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><Instagram size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>Social links</h2>
            <p className={s.cardDesc}>Shown as icons on your public page. Paste a full URL, or leave blank to hide.</p>
          </div>
        </div>
        <div className={s.cardBody}>
          <div className={s.socialField}>
            <span className={s.socialIcon}><Instagram size={16} /></span>
            <Input value={instagram} onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/yoursalon"
              error={!isUrl(instagram) ? 'Enter a full URL (https://…)' : undefined} />
            {savedIg && <a className={s.openLink} href={savedIg} target="_blank" rel="noopener noreferrer" title="Open"><ExternalLink size={15} /></a>}
          </div>
          <div className={s.socialField}>
            <span className={s.socialIcon}><Facebook size={16} /></span>
            <Input value={facebook} onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/yoursalon"
              error={!isUrl(facebook) ? 'Enter a full URL (https://…)' : undefined} />
            {savedFb && <a className={s.openLink} href={savedFb} target="_blank" rel="noopener noreferrer" title="Open"><ExternalLink size={15} /></a>}
          </div>
          <div className={s.actionsRow}>
            <Button variant="accent" disabled={!socialChanged || !socialValid || socialSaving} onClick={saveSocials}>
              {socialSaving ? 'Saving…' : 'Save links'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
