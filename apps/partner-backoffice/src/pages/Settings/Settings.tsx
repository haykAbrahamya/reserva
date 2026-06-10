import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, Globe, Instagram, Facebook, ExternalLink } from 'lucide-react'
import { Toggle, Button, Input, useToast } from '@/components/ui'
import { useAppStore } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { partnersService, type PartnerProfileResponse } from '@/services/partners.service'
import { useResource } from '@/store/useResource'
import { ApiError } from '@/services/http'
import s from './Settings.module.scss'

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

const isUrl = (v: string) => v.trim() === '' || /^https?:\/\/.+/i.test(v.trim())

export function Settings() {
  const setPartner = useAppStore((st) => st.setPartner)
  const isAdmin = useIsAdmin()
  const toast = useToast()

  // Fetch the profile fresh on mount — never depends on whether the global
  // DataLoader has run yet, so fields are always populated on direct open.
  const { data: profile, reload } = useResource(() => partnersService.getOwn(), [])

  // ── Editable field state, re-seeded whenever the loaded value changes
  //    (on load + after a successful save). This is what fixes "empty on open"
  //    and "save doesn't update local state". ──
  const [slug, setSlug] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [autoConfirm, setAutoConfirm] = useState(false)

  const savedSlug = profile?.slug ?? ''
  const savedIg = profile?.presentation?.instagram ?? ''
  const savedFb = profile?.presentation?.facebook ?? ''
  const savedAuto = profile?.autoConfirmBookings ?? false

  useEffect(() => { setSlug(savedSlug) }, [savedSlug])
  useEffect(() => { setInstagram(savedIg) }, [savedIg])
  useEffect(() => { setFacebook(savedFb) }, [savedFb])
  useEffect(() => { setAutoConfirm(savedAuto) }, [savedAuto])

  const [slugSaving, setSlugSaving] = useState(false)
  const [socialSaving, setSocialSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)

  if (!profile) {
    return (
      <div className={s.page}>
        <div className={s.head}>
          <h1 className={s.h1}>Settings</h1>
          <p className={s.sub}>Manage your public page and how bookings work.</p>
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
        presentation: {
          instagram: updated.presentation?.instagram ?? '',
          facebook: updated.presentation?.facebook ?? '',
        },
      })
    }
    reload() // refresh the useResource copy → re-seeds the fields
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
      toast('Public address updated')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update address')
    } finally {
      setSlugSaving(false)
    }
  }

  // ── Social ──
  const socialChanged = instagram.trim() !== savedIg || facebook.trim() !== savedFb
  const socialValid = isUrl(instagram) && isUrl(facebook)
  const canSaveSocial = isAdmin && socialChanged && socialValid && !socialSaving

  const saveSocials = async () => {
    if (!canSaveSocial) return
    setSocialSaving(true)
    try {
      applyUpdate(
        await partnersService.updateProfile({
          presentation: { instagram: instagram.trim(), facebook: facebook.trim() },
        }),
      )
      toast('Social links updated')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save social links')
    } finally {
      setSocialSaving(false)
    }
  }

  // ── Auto-confirm (optimistic toggle) ──
  const toggleAutoConfirm = async (next: boolean) => {
    if (!isAdmin || autoSaving) return
    setAutoSaving(true)
    setAutoConfirm(next) // instant
    try {
      applyUpdate(await partnersService.updateProfile({ autoConfirmBookings: next }))
      toast(next ? 'Online bookings will be auto-confirmed' : 'Online bookings now need manual confirmation')
    } catch (err) {
      setAutoConfirm(!next) // revert
      toast(err instanceof ApiError ? err.message : 'Could not save setting')
    } finally {
      setAutoSaving(false)
    }
  }

  const adminLock = !isAdmin && (
    <span className={s.adminOnly}><Lock size={11} /> Admin only</span>
  )

  return (
    <div className={s.page}>
      <div className={s.head}>
        <h1 className={s.h1}>Settings</h1>
        <p className={s.sub}>Manage your public page and how bookings work.</p>
      </div>

      {/* ── Public address ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><Globe size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>Public address</h2>
            <p className={s.cardDesc}>Your booking page handle — lowercase letters, numbers and hyphens.</p>
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
                placeholder="your-salon"
                error={!slugValid ? 'Lowercase letters, numbers and hyphens only' : undefined}
              />
              <span className={s.slugSuffix}>.reserva.am</span>
            </div>
            <Button variant="accent" disabled={!canSaveSlug} onClick={saveSlug}>
              {slugSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
          <div className={s.statusLine}>
            {savedSlug ? (
              <a className={s.liveLink} href={`https://${savedSlug}.reserva.am`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={13} /> {savedSlug}.reserva.am
              </a>
            ) : (
              <span className={s.off}>No public address yet — your page is offline until you set one.</span>
            )}
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
          {adminLock}
        </div>

        <div className={s.cardBody}>
          <div className={s.socialField}>
            <span className={s.socialIcon}><Instagram size={16} /></span>
            <Input
              value={instagram}
              disabled={!isAdmin || socialSaving}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/yoursalon"
              error={!isUrl(instagram) ? 'Enter a full URL (https://…)' : undefined}
            />
          </div>
          <div className={s.socialField}>
            <span className={s.socialIcon}><Facebook size={16} /></span>
            <Input
              value={facebook}
              disabled={!isAdmin || socialSaving}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/yoursalon"
              error={!isUrl(facebook) ? 'Enter a full URL (https://…)' : undefined}
            />
          </div>
          <div className={s.actionsRow}>
            <Button variant="accent" disabled={!canSaveSocial} onClick={saveSocials}>
              {socialSaving ? 'Saving…' : 'Save links'}
            </Button>
          </div>
        </div>
      </section>

      {/* ── Bookings ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <span className={s.cardIcon}><CheckCircle2 size={18} /></span>
          <div className={s.cardHeadText}>
            <h2 className={s.cardTitle}>Bookings</h2>
            <p className={s.cardDesc}>How online bookings from your public page are handled.</p>
          </div>
          {adminLock}
        </div>

        <div className={s.cardBody}>
          <div className={s.toggleRow}>
            <div className={s.toggleText}>
              <div className={s.toggleTitle}>Auto-confirm online bookings</div>
              <div className={s.toggleDesc}>
                On → confirmed automatically. Off → arrive as <strong>pending</strong> for staff to confirm.
              </div>
            </div>
            <Toggle checked={autoConfirm} disabled={!isAdmin || autoSaving} onChange={toggleAutoConfirm} />
          </div>
          <div className={s.statusLine}>
            {autoConfirm
              ? <>New online bookings are <strong className={s.on}>auto-confirmed</strong>.</>
              : <>New online bookings start as <strong className={s.off}>pending</strong> until confirmed.</>}
          </div>
        </div>
      </section>
    </div>
  )
}
