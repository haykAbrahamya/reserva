import { useEffect, useState } from 'react'
import { CheckCircle2, Lock, Globe, ExternalLink } from 'lucide-react'
import { Toggle, Button, Input, useToast } from '@/components/ui'
import { useAppStore } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { partnersService, type PartnerProfileResponse } from '@/services/partners.service'
import { useResource } from '@/store/useResource'
import { ApiError } from '@/services/http'
import s from './Settings.module.scss'

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export function Settings() {
  const setPartner = useAppStore((st) => st.setPartner)
  const isAdmin = useIsAdmin()
  const toast = useToast()

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
          <h1 className={s.h1}>Settings</h1>
          <p className={s.sub}>Manage your public address and how bookings work.</p>
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
      toast('Public address updated')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update address')
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
      toast(next ? 'Online bookings will be auto-confirmed' : 'Online bookings now need manual confirmation')
    } catch (err) {
      setAutoConfirm(!next)
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
        <p className={s.sub}>Manage your public address and how bookings work.</p>
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
