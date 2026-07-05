import { useEffect, useState } from 'react'
import {
  Store, Instagram, Facebook, Palette, ExternalLink, FileText, Pencil,
  LayoutTemplate, Check,
} from 'lucide-react'
import { Button, Input, Textarea, useToast, WhatsappIcon } from '@/components/ui'
import { useAppStore } from '@/store/app.store'
import { useResource } from '@/store/useResource'
import {
  partnersService,
  type PartnerProfileResponse,
} from '@/services/partners.service'
import { ApiError } from '@/services/http'
import { useT } from '@/i18n'
import s from './Storefront.module.scss'
import { PhotoSection } from './PhotoSection'

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
  const t = useT()
  return (
    <div className={s.head}>
      <div className={s.headIcon}><Store size={20} /></div>
      <div>
        <h1 className={s.h1}>{t('storefront.title')}</h1>
        <p className={s.sub}>{t('storefront.subtitle')}</p>
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
  const t = useT()
  // ── About + brand + socials ──
  const [about, setAbout] = useState(profile.presentation?.about ?? '')
  const [accent, setAccent] = useState(profile.accent ?? '#A8784B')
  const [instagram, setInstagram] = useState(profile.presentation?.instagram ?? '')
  const [facebook, setFacebook] = useState(profile.presentation?.facebook ?? '')
  const [whatsapp, setWhatsapp] = useState(profile.presentation?.whatsapp ?? '')
  const savedAbout = profile.presentation?.about ?? ''
  const savedAccent = profile.accent ?? '#A8784B'
  const savedIg = profile.presentation?.instagram ?? ''
  const savedFb = profile.presentation?.facebook ?? ''
  const savedWa = profile.presentation?.whatsapp ?? ''
  useEffect(() => { setAbout(savedAbout) }, [savedAbout])
  useEffect(() => { setAccent(savedAccent) }, [savedAccent])
  useEffect(() => { setInstagram(savedIg) }, [savedIg])
  useEffect(() => { setFacebook(savedFb) }, [savedFb])
  useEffect(() => { setWhatsapp(savedWa) }, [savedWa])

  // ── Page template ──
  const savedTemplate = profile.template ?? 'classic'
  const [template, setTemplate] = useState<'classic' | 'tabbed'>(savedTemplate)
  useEffect(() => { setTemplate(savedTemplate) }, [savedTemplate])

  const [aboutSaving, setAboutSaving] = useState(false)
  const [brandSaving, setBrandSaving] = useState(false)
  const [socialSaving, setSocialSaving] = useState(false)
  const [templateSaving, setTemplateSaving] = useState(false)

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
          whatsapp: updated.presentation?.whatsapp ?? '',
          heroTints: updated.presentation?.heroTints,
          gallery: updated.presentation?.gallery,
        },
      })
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
      toast(t('storefront.about.saved'))
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('storefront.about.error'))
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
      toast(t('storefront.brand.saved'))
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('storefront.brand.error'))
    } finally { setBrandSaving(false) }
  }

  // WhatsApp is digits only (we strip formatting); 7–15 per E.164, or empty.
  const waDigits = whatsapp.replace(/\D/g, '')
  const waValid = waDigits === '' || (waDigits.length >= 7 && waDigits.length <= 15)
  const socialChanged =
    instagram.trim() !== savedIg || facebook.trim() !== savedFb || waDigits !== savedWa
  const socialValid = isUrl(instagram) && isUrl(facebook) && waValid
  const saveSocials = async () => {
    if (!socialChanged || !socialValid || socialSaving) return
    setSocialSaving(true)
    try {
      const updated = await partnersService.updateProfile({
        presentation: { instagram: instagram.trim(), facebook: facebook.trim(), whatsapp: waDigits },
      })
      syncStore(updated); await reload()
      toast(t('storefront.social.saved'))
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('storefront.social.error'))
    } finally { setSocialSaving(false) }
  }

  const templateChanged = template !== savedTemplate
  const saveTemplate = async () => {
    if (!templateChanged || templateSaving) return
    setTemplateSaving(true)
    try {
      const updated = await partnersService.updateProfile({ template })
      // Reflect the new template in the store so any live preview updates.
      const current = useAppStore.getState().partner
      if (current) setPartner({ ...current, template: updated.template })
      await reload()
      toast(t('storefront.template.saved'))
    } catch (err) {
      toast(err instanceof ApiError ? err.message : t('storefront.template.error'))
    } finally { setTemplateSaving(false) }
  }

  const TEMPLATE_OPTIONS: { value: 'classic' | 'tabbed'; titleKey: string; descKey: string }[] = [
    { value: 'classic', titleKey: 'storefront.template.classic', descKey: 'storefront.template.classicDesc' },
    { value: 'tabbed', titleKey: 'storefront.template.tabbed', descKey: 'storefront.template.tabbedDesc' },
  ]

  return (
    <div className={s.page}>
      <Header />

      {/* ── Inside (gallery) — simple photos of the place ── */}
      <PhotoSection
        list="gallery"
        title={t('storefront.gallery.title')}
        description={t('storefront.gallery.desc')}
        initial={profile.presentation?.gallery ?? []}
        saved={profile.presentation?.gallery}
        accent={accent}
        reload={reload}
      />

      {/* ── Works — photos of the work; simple or before/after ── */}
      <PhotoSection
        list="works"
        title={t('storefront.works.title')}
        description={t('storefront.works.desc')}
        initial={profile.presentation?.works ?? []}
        saved={profile.presentation?.works}
        accent={accent}
        allowBeforeAfter
        reload={reload}
      />

      {/* ── About ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><FileText size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('storefront.about.title')}</h2>
            <p className={s.cardDesc}>{t('storefront.about.desc')}</p>
          </div>
        </div>
        <div className={s.cardBody}>
          <Textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder={t('storefront.about.placeholder')}
            rows={5}
            maxLength={4000}
          />
          <div className={s.aboutFoot}>
            <span className={s.charCount}>{about.length}/4000</span>
            <Button variant="accent" disabled={!aboutChanged || aboutSaving} onClick={saveAbout}>
              {aboutSaving ? t('storefront.about.saving') : t('storefront.about.save')}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Brand color ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><Palette size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('storefront.brand.title')}</h2>
            <p className={s.cardDesc}>{t('storefront.brand.desc')}</p>
          </div>
        </div>
        <div className={s.cardBody}>
          <div className={s.brandRow}>
            <label className={s.swatch} style={{ background: accentValid ? accent : 'var(--bg-3)' }} title={t('storefront.brand.pick')}>
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
                error={!accentValid ? t('storefront.brand.invalid') : undefined}
              />
            </div>
            <Button variant="accent" disabled={!accentChanged || !accentValid || brandSaving} onClick={saveBrand}>
              {brandSaving ? t('storefront.brand.saving') : t('storefront.brand.save')}
            </Button>
          </div>
          <div className={s.previewBar} style={{ background: `linear-gradient(120deg, ${accentValid ? accent : '#A8784B'}, color-mix(in srgb, ${accentValid ? accent : '#A8784B'} 55%, #000))` }}>
            <span>{t('storefront.brand.preview')}</span>
          </div>
        </div>
      </section>

      {/* ── Page template ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><LayoutTemplate size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('storefront.template.title')}</h2>
            <p className={s.cardDesc}>{t('storefront.template.desc')}</p>
          </div>
        </div>
        <div className={s.cardBody}>
          <div className={s.templateGrid}>
            {TEMPLATE_OPTIONS.map((opt) => {
              const selected = template === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={[s.templateOption, selected ? s.templateOptionSelected : ''].filter(Boolean).join(' ')}
                  onClick={() => setTemplate(opt.value)}
                  aria-pressed={selected}
                >
                  <span className={[s.templatePreview, s[`preview_${opt.value}`]].join(' ')} aria-hidden="true" />
                  <span className={s.templateInfo}>
                    <span className={s.templateName}>
                      {t(opt.titleKey)}
                      {selected && <Check size={15} className={s.templateCheck} />}
                    </span>
                    <span className={s.templateOptDesc}>{t(opt.descKey)}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className={s.templateFoot}>
            <Button variant="accent" disabled={!templateChanged || templateSaving} onClick={saveTemplate}>
              {templateSaving ? t('storefront.template.saving') : t('storefront.template.save')}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Social links ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><Instagram size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('storefront.social.title')}</h2>
            <p className={s.cardDesc}>{t('storefront.social.desc')}</p>
          </div>
        </div>
        <div className={s.cardBody}>
          <div className={s.socialField}>
            <span className={s.socialIcon}><Instagram size={16} /></span>
            <Input value={instagram} onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/yoursalon"
              error={!isUrl(instagram) ? t('storefront.social.urlError') : undefined} />
            {savedIg && <a className={s.openLink} href={savedIg} target="_blank" rel="noopener noreferrer" title={t('storefront.social.open')}><ExternalLink size={15} /></a>}
          </div>
          <div className={s.socialField}>
            <span className={s.socialIcon}><Facebook size={16} /></span>
            <Input value={facebook} onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/yoursalon"
              error={!isUrl(facebook) ? t('storefront.social.urlError') : undefined} />
            {savedFb && <a className={s.openLink} href={savedFb} target="_blank" rel="noopener noreferrer" title={t('storefront.social.open')}><ExternalLink size={15} /></a>}
          </div>
          <div className={s.socialField}>
            <span className={s.socialIcon}><WhatsappIcon size={16} /></span>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+374 91 234567"
              error={!waValid ? t('storefront.social.whatsappError') : undefined} />
            {savedWa && <a className={s.openLink} href={`https://wa.me/${savedWa}`} target="_blank" rel="noopener noreferrer" title={t('storefront.social.open')}><ExternalLink size={15} /></a>}
          </div>
          <div className={s.actionsRow}>
            <Button variant="accent" disabled={!socialChanged || !socialValid || socialSaving} onClick={saveSocials}>
              {socialSaving ? t('storefront.social.saving') : t('storefront.social.save')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
