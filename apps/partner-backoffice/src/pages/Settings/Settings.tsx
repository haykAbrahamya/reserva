import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Lock, Globe, ExternalLink, Download, Share, CheckCircle, Store, Image, Trash2, Upload, CalendarCheck, Copy } from 'lucide-react'
import { Toggle, Button, Input, useToast } from '@/components/ui'
import { useAppStore } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { partnersService, galleryImageUrl, type PartnerProfileResponse } from '@/services/partners.service'
import { useResource } from '@/store/useResource'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { errorMessage } from '@/utils/errors'
import { useT } from '@/i18n'
import s from './Settings.module.scss'

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

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

  const savedSlug = profile?.slug ?? ''
  const savedAuto = profile?.autoConfirmBookings ?? false
  const savedBookingsOn = profile?.bookingsEnabled ?? true

  useEffect(() => { setSlug(savedSlug) }, [savedSlug])
  useEffect(() => { setAutoConfirm(savedAuto) }, [savedAuto])
  useEffect(() => { setBookingsOn(savedBookingsOn) }, [savedBookingsOn])

  const [slugSaving, setSlugSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [bookingsSaving, setBookingsSaving] = useState(false)

  // ── Brand logo ──
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoBusy, setLogoBusy] = useState(false)
  const logoUrl = profile?.presentation?.logoUrl ?? ''

  const syncLogo = (url: string) => {
    const cur = useAppStore.getState().partner
    if (cur) setPartner({ ...cur, presentation: { ...(cur.presentation ?? {}), logoUrl: url } })
    reload()
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

  // Deep-link from the PublicLinkBar's "set up your link" CTA: scroll the public
  // address card into view and pulse it so the new partner knows what to do.
  const [searchParams, setSearchParams] = useSearchParams()
  const addressRef = useRef<HTMLElement>(null)
  const [highlightAddress, setHighlightAddress] = useState(false)
  useEffect(() => {
    if (searchParams.get('highlight') !== 'address' || !profile) return
    addressRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightAddress(true)
    const t = window.setTimeout(() => setHighlightAddress(false), 4200)
    // Clear the query param so a refresh/re-navigation doesn't re-trigger it.
    searchParams.delete('highlight')
    setSearchParams(searchParams, { replace: true })
    return () => window.clearTimeout(t)
    // Run once, after the profile is available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

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
      })
    }
    reload()
  }

  // ── Slug ──
  const slugChanged = slug !== savedSlug
  const slugValid = slug.length === 0 || /^[a-z0-9-]{2,60}$/.test(slug)
  const canSaveSlug = isAdmin && slugChanged && slugValid && slug.length >= 2 && !slugSaving

  const saveSlug = async () => {
    if (!canSaveSlug) return
    setSlugSaving(true)
    try {
      applyUpdate(await partnersService.updateProfile({ slug }))
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
      <section className={s.card}>
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
      <section
        ref={addressRef}
        className={`${s.card} ${highlightAddress ? s.highlight : ''}`}
      >
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
                onChange={(e) => setSlug(slugify(e.target.value))}
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
