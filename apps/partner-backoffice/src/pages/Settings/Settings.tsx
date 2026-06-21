import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, Globe, ExternalLink, Download, Share, CheckCircle, Store } from 'lucide-react'
import { Toggle, Button, Input, useToast } from '@/components/ui'
import { useAppStore } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { partnersService, type PartnerProfileResponse } from '@/services/partners.service'
import { useResource } from '@/store/useResource'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { ApiError } from '@/services/http'
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

  // Fetch the profile fresh on mount — never depends on whether the global
  // DataLoader has run yet, so fields are always populated on direct open.
  const { data: profile, reload } = useResource(() => partnersService.getOwn(), [])

  // Editable field state, re-seeded whenever the loaded value changes (on load
  // + after a successful save) — fills on open and stays in sync after saving.
  const [slug, setSlug] = useState('')
  const [autoConfirm, setAutoConfirm] = useState(false)

  const savedSlug = profile?.slug ?? ''
  const savedAuto = profile?.autoConfirmBookings ?? false

  useEffect(() => { setSlug(savedSlug) }, [savedSlug])
  useEffect(() => { setAutoConfirm(savedAuto) }, [savedAuto])

  const [slugSaving, setSlugSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)

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
      toast(err instanceof ApiError ? err.message : t('settings.address.updateError'))
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
      toast(err instanceof ApiError ? err.message : t('settings.bookings.saveError'))
    } finally {
      setAutoSaving(false)
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

      {/* ── Public address ── */}
      <section className={s.card}>
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

      {/* ── Bookings ── */}
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
          </div>
        </section>
      )}
    </div>
  )
}
