import { useEffect, useRef, useState } from 'react'
import { useSpotlight } from '@/components/onboarding/useSpotlight'
import { notifyProfileUpdated } from '@/components/onboarding/useProfileCompletion'
import { CheckCircle2, Lock, Globe, ExternalLink, Download, Share, CheckCircle, Store, Image, Trash2, Upload, CalendarCheck, Copy } from 'lucide-react'
import { Toggle, Button, Input, SegmentedFilter, useToast } from '@/components/ui'
import { useAppStore } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { partnersService, galleryImageUrl, type PartnerProfileResponse } from '@/services/partners.service'
import { useResource } from '@/store/useResource'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { errorMessage } from '@/utils/errors'
import { useT } from '@/i18n'
import s from './Settings.module.scss'

// Live input sanitizer: lowercase, spaces/invalid chars → hyphen. Crucially we
// do NOT strip trailing hyphens here — doing so on every keystroke made it
// impossible to TYPE a hyphen (e.g. "karen-" → "karen"), so "karen-barber"
// could never be entered. Edge hyphens are trimmed on save instead.
const slugifyInput = (v: string) =>
  v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').slice(0, 60)

// Final normalization applied when saving: also strip leading/trailing hyphens.
const normalizeSlug = (v: string) => v.replace(/^-+|-+$/g, '')

export function Settings() {
  const setPartner = useAppStore((st) => st.setPartner)
  const isAdmin = useIsAdmin()
  const toast = useToast()
  const t = useT()
  const { platform, promptInstall } = useInstallPrompt()

  const handleInstall = async () => {
    const outcome = await promptInstall()
    if (outcome === 'accepted') toast(t('settings.install.installedToast'))
  }

  // In-app browsers can't open Safari directly; copying the URL lets the user
  // paste it into Safari, where Add-to-Home-Screen (and push) become available.
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      toast(t('settings.install.linkCopied'))
    } catch {
      toast(t('settings.install.copyFailed'))
    }
  }

  // Fetch the profile fresh on mount — never depends on whether the global
  // DataLoader has run yet, so fields are always populated on direct open.
  const { data: profile, reload } = useResource(() => partnersService.getOwn(), [])

  // Editable field state, re-seeded whenever the loaded value changes (on load
  // + after a successful save) — fills on open and stays in sync after saving.
  const [slug, setSlug] = useState('')
  const [autoConfirm, setAutoConfirm] = useState(false)
  const [bookingsOn, setBookingsOn] = useState(true)
  const [fabMode, setFabMode] = useState<'support' | 'book' | 'hidden'>('support')

  const savedSlug = profile?.slug ?? ''
  const savedAuto = profile?.autoConfirmBookings ?? false
  const savedBookingsOn = profile?.bookingsEnabled ?? true
  const savedFab = profile?.supportWidget ?? 'support'

  useEffect(() => { setSlug(savedSlug) }, [savedSlug])
  useEffect(() => { setAutoConfirm(savedAuto) }, [savedAuto])
  useEffect(() => { setBookingsOn(savedBookingsOn) }, [savedBookingsOn])
  useEffect(() => { setFabMode(savedFab) }, [savedFab])

  const [slugSaving, setSlugSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [bookingsSaving, setBookingsSaving] = useState(false)
  const [fabSaving, setFabSaving] = useState(false)

  // ── Brand logo ──
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const logoUrl = profile?.presentation?.logoUrl ?? ''

  const syncLogo = (url: string) => {
    const cur = useAppStore.getState().partner
    if (cur) setPartner({ ...cur, presentation: { ...(cur.presentation ?? {}), logoUrl: url } })
    reload()
    notifyProfileUpdated()
  }
  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLogoBusy(true)
    try {
      const { logoUrl } = await partnersService.uploadLogo(file)
      syncLogo(logoUrl)
      toast(t('settings.logo.updated'))
    } catch (err) { toast(errorMessage(err, t)) } finally { setLogoBusy(false) }
  }
  const onRemoveLogo = async () => {
    setLogoBusy(true)
    try {
      await partnersService.removeLogo()
      syncLogo('')
      toast(t('settings.logo.removed'))
    } catch (err) { toast(errorMessage(err, t)) } finally { setLogoBusy(false) }
  }

  // Deep-link from the onboarding checklist ("Set your page address"): the shared
  // spotlight scrolls the address card into view and pulses it via the
  // `data-spotlight="slug"` attribute below.
  useSpotlight()

  if (!profile) {
    return (
      <div className={s.page}>
        <div className={s.head}>
          <h1 className={s.h1}>{t('settings.title')}</h1>
          <p className={s.sub}>{t('settings.subtitle')}</p>
        </div>
        <div className={s.skeleton} />
        <div className={s.skeleton} />
      </div>
    )
  }

  /** Apply a patch, then sync both the loaded profile (reload) and the global
   *  store so every screen reflects the new value. */
  const applyUpdate = (updated: PartnerProfileResponse) => {
    const current = useAppStore.getState().partner
    if (current) {
      setPartner({
        ...current,
        slug: updated.slug,
        autoConfirmBookings: updated.autoConfirmBookings,
        bookingsEnabled: updated.bookingsEnabled,
        supportWidget: updated.supportWidget,
      })
    }
    reload()
    // Nudge the onboarding checklist/sidebar to re-check (e.g. slug just set).
    notifyProfileUpdated()
  }

  // ── Quick-button (FAB) preference ──
  const changeFab = async (mode: 'support' | 'book' | 'hidden') => {
    if (!isAdmin || fabSaving || mode === fabMode) return
    setFabSaving(true)
    const prevMode = fabMode
    setFabMode(mode)
    // Reflect in the global store IMMEDIATELY so the FAB/bubble switch live
    // (don't wait on the response — which may omit the field before a backend
    // redeploy, and shouldn't gate the UI anyway).
    const current = useAppStore.getState().partner
    if (current) setPartner({ ...current, supportWidget: mode })
    try {
      await partnersService.updateProfile({ supportWidget: mode })
      toast(t('settings.quickButton.saved'))
    } catch (err) {
      setFabMode(prevMode)
      const cur = useAppStore.getState().partner
      if (cur) setPartner({ ...cur, supportWidget: prevMode })
      toast(errorMessage(err, t))
    } finally {
      setFabSaving(false)
    }
  }

  // ── Slug ──
  const slugChanged = slug !== savedSlug
  const slugValid = slug.length === 0 || /^[a-z0-9-]{2,60}$/.test(slug)
  const canSaveSlug = isAdmin && slugChanged && slugValid && slug.length >= 2 && !slugSaving

  const saveSlug = async () => {
    if (!canSaveSlug) return
    setSlugSaving(true)
    try {
      // Trim any leading/trailing hyphens only now, at save time.
      applyUpdate(await partnersService.updateProfile({ slug: normalizeSlug(slug) }))
      toast(t('settings.address.updated'))
    } catch (err) {
      toast(errorMessage(err, t))
    } finally {
      setSlugSaving(false)
    }
  }

  // ── Auto-confirm (optimistic toggle) ──
  const toggleAutoConfirm = async (next: boolean) => {
    if (!isAdmin || autoSaving) return
    setAutoSaving(true)
    setAutoConfirm(next)
    try {
      applyUpdate(await partnersService.updateProfile({ autoConfirmBookings: next }))
      toast(next ? t('settings.bookings.autoOnToast') : t('settings.bookings.autoOffToast'))
    } catch (err) {
      setAutoConfirm(!next)
      toast(errorMessage(err, t))
    } finally {
      setAutoSaving(false)
    }
  }

  // ── Online booking on/off (optimistic toggle) ──
  const toggleBookings = async (next: boolean) => {
    if (!isAdmin || bookingsSaving) return
    setBookingsSaving(true)
    setBookingsOn(next)
    try {
      applyUpdate(await partnersService.updateProfile({ bookingsEnabled: next }))
      toast(next ? t('settings.online.onToast') : t('settings.online.offToast'))
    } catch (err) {
      setBookingsOn(!next)
      toast(errorMessage(err, t))
    } finally {
      setBookingsSaving(false)
    }
  }

  const adminLock = !isAdmin && (
    <span className={s.adminOnly}><Lock size={11} /> {t('settings.adminOnly')}</span>
  )

  return (
    <div className={s.page}>
      <div className={s.head}>
        <h1 className={s.h1}>{t('settings.title')}</h1>
        <p className={s.sub}>{t('settings.subtitle')}</p>
      </div>

      {/* ── Brand logo ── */}
      <section className={s.card} data-spotlight="logo">
        <div className={s.cardHead}>
          <span className={s.cardIcon}><Image size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('settings.logo.title')}</h2>
            <p className={s.cardDesc}>{t('settings.logo.desc')}</p>
          </div>
          {adminLock}
        </div>
        <div className={s.cardBody}>
          <div className={s.logoRow}>
            <div className={s.logoPreview}>
              {logoUrl
                ? <img src={galleryImageUrl(logoUrl)} alt="" />
                : <span className={s.logoFallback}>{(profile.name?.trim()?.[0] ?? 'R').toUpperCase()}</span>}
            </div>
            <div className={s.logoActions}>
              <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={onPickLogo} />
              <Button variant="accent" disabled={!isAdmin || logoBusy} onClick={() => logoInputRef.current?.click()}>
                <Upload size={15} /> {logoUrl ? t('settings.logo.replace') : t('settings.logo.upload')}
              </Button>
              {logoUrl && (
                <Button variant="ghost" disabled={!isAdmin || logoBusy} onClick={onRemoveLogo}>
                  <Trash2 size={15} /> {t('settings.logo.remove')}
                </Button>
              )}
            </div>
          </div>
          {!logoUrl && <div className={s.statusLine}>{t('settings.logo.fallbackNote')}</div>}
        </div>
      </section>

      {/* ── Public address ── */}
      <section className={s.card} data-spotlight="slug">
        <div className={s.cardHead}>
          <span className={s.cardIcon}><Globe size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('settings.address.title')}</h2>
            <p className={s.cardDesc}>{t('settings.address.desc')}</p>
          </div>
          {adminLock}
        </div>

        <div className={s.cardBody}>
          <div className={s.slugRow}>
            <div className={s.slugInputWrap}>
              <Input
                value={slug}
                disabled={!isAdmin || slugSaving}
                onChange={(e) => setSlug(slugifyInput(e.target.value))}
                placeholder={t('settings.address.placeholder')}
                error={!slugValid ? t('settings.address.invalid') : undefined}
              />
              <span className={s.slugSuffix}>.reserva.am</span>
            </div>
            <Button variant="accent" disabled={!canSaveSlug} onClick={saveSlug}>
              {slugSaving ? t('settings.saving') : t('settings.save')}
            </Button>
          </div>
          <div className={s.statusLine}>
            {savedSlug ? (
              <a className={s.liveLink} href={`https://${savedSlug}.reserva.am`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={13} /> {savedSlug}.reserva.am
              </a>
            ) : (
              <span className={s.off}>{t('settings.address.none')}</span>
            )}
          </div>
        </div>
      </section>

      {/* ── Online booking on/off ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><CalendarCheck size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('settings.online.title')}</h2>
            <p className={s.cardDesc}>{t('settings.online.desc')}</p>
          </div>
          {adminLock}
        </div>
        <div className={s.cardBody}>
          <div className={s.toggleRow}>
            <div className={s.toggleText}>
              <div className={s.toggleTitle}>{t('settings.online.toggleTitle')}</div>
              <div className={s.toggleDesc}>{t('settings.online.toggleDesc')}</div>
            </div>
            <Toggle checked={bookingsOn} disabled={!isAdmin || bookingsSaving} onChange={toggleBookings} />
          </div>
          <div className={s.statusLine}>
            {bookingsOn
              ? <>{t('settings.online.statusOnPre')} <strong className={s.on}>{t('settings.online.statusOnStrong')}</strong>{t('settings.online.statusOnPost')}</>
              : <>{t('settings.online.statusOffPre')} <strong className={s.off}>{t('settings.online.statusOffStrong')}</strong>{t('settings.online.statusOffPost')}</>}
          </div>
        </div>
      </section>

      {/* ── Bookings ── */}
      {bookingsOn && (
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><CheckCircle2 size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('settings.bookings.title')}</h2>
            <p className={s.cardDesc}>{t('settings.bookings.desc')}</p>
          </div>
          {adminLock}
        </div>

        <div className={s.cardBody}>
          <div className={s.toggleRow}>
            <div className={s.toggleText}>
              <div className={s.toggleTitle}>{t('settings.bookings.toggleTitle')}</div>
              <div className={s.toggleDesc}>
                {t('settings.bookings.toggleDescOn')} → {t('settings.bookings.toggleDescConfirmed')}{' '}
                {t('settings.bookings.toggleDescOff')} → {t('settings.bookings.toggleDescArrive')}{' '}
                <strong>{t('settings.bookings.pending')}</strong> {t('settings.bookings.forStaff')}
              </div>
            </div>
            <Toggle checked={autoConfirm} disabled={!isAdmin || autoSaving} onChange={toggleAutoConfirm} />
          </div>
          <div className={s.statusLine}>
            {autoConfirm
              ? <>{t('settings.bookings.statusAutoPre')} <strong className={s.on}>{t('settings.bookings.statusAutoStrong')}</strong>{t('settings.bookings.statusAutoPost')}</>
              : <>{t('settings.bookings.statusPendingPre')} <strong className={s.off}>{t('settings.bookings.statusPendingStrong')}</strong> {t('settings.bookings.statusPendingPost')}</>}
          </div>
        </div>
      </section>
      )}

      {/* ── Quick button (mobile FAB + web bubble) preference ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><CalendarCheck size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('settings.quickButton.title')}</h2>
            <p className={s.cardDesc}>{t('settings.quickButton.desc')}</p>
          </div>
          {adminLock}
        </div>
        <div className={s.cardBody}>
          <SegmentedFilter<'support' | 'book' | 'hidden'>
            value={fabMode}
            onChange={changeFab}
            options={[
              { value: 'book', label: t('settings.quickButton.book') },
              { value: 'support', label: t('settings.quickButton.support') },
              { value: 'hidden', label: t('settings.quickButton.hidden') },
            ]}
          />
          <div className={s.statusLine}>{t(`settings.quickButton.hint_${fabMode}`)}</div>
        </div>
      </section>

      {/* ── Marketplace listing (read-only — curated by Reserva) ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><Store size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>{t('settings.marketplace.title')}</h2>
            <p className={s.cardDesc}>{t('settings.marketplace.desc')}</p>
          </div>
        </div>
        <div className={s.cardBody}>
          <div className={s.statusLine}>
            {profile.marketplaceListed ? (
              <>
                <CheckCircle size={14} className={s.on} />{' '}
                {t('settings.marketplace.featuredPre')} <strong className={s.on}>{t('settings.marketplace.featuredStrong')}</strong> {t('settings.marketplace.featuredPost')}
              </>
            ) : (
              <>{t('settings.marketplace.notFeatured')}</>
            )}
          </div>
        </div>
      </section>

      {/* ── Install app (PWA) ── */}
      {platform !== 'unsupported' && (
        <section className={s.card}>
          <div className={s.cardHead}>
            <span className={s.cardIcon}><Download size={18} /></span>
            <div className={s.cardHeadText}>
              <h2 className={s.cardTitle}>{t('settings.install.title')}</h2>
              <p className={s.cardDesc}>{t('settings.install.desc')}</p>
            </div>
          </div>

          <div className={s.cardBody}>
            {platform === 'installed' && (
              <div className={s.statusLine}>
                <CheckCircle size={14} className={s.on} /> <strong className={s.on}>{t('settings.install.installedPre')}</strong> {t('settings.install.installedPost')}
              </div>
            )}

            {platform === 'installable' && (
              <div className={s.installRow}>
                <Button variant="accent" onClick={handleInstall}>
                  <Download size={15} /> {t('settings.install.button')}
                </Button>
                <span className={s.installHint}>{t('settings.install.hint')}</span>
              </div>
            )}

            {platform === 'ios' && (
              <div className={s.iosSteps}>
                <p className={s.iosLead}>{t('settings.install.iosLead')}</p>
                <ol className={s.iosList}>
                  <li>{t('settings.install.iosStep1Pre')} <Share size={13} className={s.iosIcon} /> <strong>{t('settings.install.iosStep1Strong')}</strong> {t('settings.install.iosStep1Post')}</li>
                  <li>{t('settings.install.iosStep2Pre')} <strong>{t('settings.install.iosStep2Strong')}</strong>{t('settings.install.iosStep2Post')}</li>
                  <li>{t('settings.install.iosStep3Pre')} <strong>{t('settings.install.iosStep3Strong')}</strong> {t('settings.install.iosStep3Post')}</li>
                </ol>
              </div>
            )}

            {/* iOS in-app browser (opened from Telegram/Instagram/etc.): there's no
                Share→Add-to-Home-Screen here, so guide them to real Safari first. */}
            {platform === 'ios-inapp' && (
              <div className={s.iosSteps}>
                <p className={s.iosLead}>{t('settings.install.inAppLead')}</p>
                <ol className={s.iosList}>
                  <li>{t('settings.install.inAppStep1')}</li>
                  <li>{t('settings.install.inAppStep2Pre')} <Share size={13} className={s.iosIcon} /> <strong>{t('settings.install.iosStep1Strong')}</strong> {t('settings.install.iosStep1Post')}</li>
                </ol>
                <button className={s.copyLinkBtn} onClick={handleCopyLink}>
                  <Copy size={14} /> {t('settings.install.copyLink')}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
