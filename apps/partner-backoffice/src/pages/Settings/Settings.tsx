import { useState } from 'react'
import { CheckCircle2, Lock, Globe } from 'lucide-react'
import { Toggle, Button, Input, useToast } from '@/components/ui'
import { usePartner, useAppStore } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { partnersService } from '@/services/partners.service'
import { ApiError } from '@/services/http'
import s from './Settings.module.scss'

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export function Settings() {
  const partner = usePartner()
  const setPartner = useAppStore((st) => st.setPartner)
  const isAdmin = useIsAdmin()
  const toast = useToast()

  const [saving, setSaving] = useState(false)
  // LOCAL truth for the toggle. Seeded ONCE from the profile (lazy initializer).
  // We deliberately do NOT re-sync from the store afterwards — an effect that
  // mirrored `partner.autoConfirmBookings` was racing the optimistic update and
  // snapping the toggle back to its old value on the first click.
  const [autoConfirm, setAutoConfirm] = useState(
    () => useAppStore.getState().partner?.autoConfirmBookings ?? false,
  )

  // Slug editor state (seeded once from the profile).
  const [slug, setSlug] = useState(() => useAppStore.getState().partner?.slug ?? '')
  const [slugSaving, setSlugSaving] = useState(false)

  if (!partner) return null

  const savedSlug = partner.slug ?? ''
  const slugChanged = slug !== savedSlug
  const slugValid = slug.length === 0 || /^[a-z0-9-]{2,60}$/.test(slug)

  const saveSlug = async () => {
    if (!isAdmin || slugSaving || !slugChanged || !slugValid || slug.length < 2) return
    setSlugSaving(true)
    try {
      const updated = await partnersService.updateProfile({ slug })
      const current = useAppStore.getState().partner
      if (current) setPartner({ ...current, slug: updated.slug })
      setSlug(updated.slug ?? '')
      toast('Your public handle was updated')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not update handle')
    } finally {
      setSlugSaving(false)
    }
  }

  const toggleAutoConfirm = async (next: boolean) => {
    if (!isAdmin || saving) return
    setSaving(true)
    setAutoConfirm(next) // instant visual

    try {
      const updated = await partnersService.updateProfile({ autoConfirmBookings: next })
      const saved = updated.autoConfirmBookings ?? next
      setAutoConfirm(saved)
      // Keep the global profile in sync (merge onto the freshest snapshot).
      const current = useAppStore.getState().partner
      if (current) setPartner({ ...current, autoConfirmBookings: saved })
      toast(next ? 'Bookings will be auto-confirmed' : 'Bookings now require manual confirmation')
    } catch (err) {
      setAutoConfirm(!next) // revert visual
      toast(err instanceof ApiError ? err.message : 'Could not save setting')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={s.page}>
      <div className={s.head}>
        <h1 className={s.h1}>Settings</h1>
        <p className={s.sub}>Manage your public page and how bookings work.</p>
      </div>

      {/* ── Public handle (slug) ── */}
      <section className={s.card}>
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>Public address</h2>
          {!isAdmin && (
            <span className={s.adminOnly}><Lock size={12} /> Admin only</span>
          )}
        </div>

        <div className={s.row}>
          <div className={s.rowIcon}><Globe size={18} /></div>
          <div className={s.rowBody}>
            <div className={s.rowTitle}>Your booking page address</div>
            <div className={s.rowDesc}>
              Choose the handle clients use to reach you. Lowercase letters,
              numbers and hyphens only.
            </div>
            <div className={s.slugRow}>
              <Input
                value={slug}
                disabled={!isAdmin || slugSaving}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="your-salon"
                error={!slugValid ? 'Use lowercase letters, numbers and hyphens' : undefined}
              />
              <span className={s.slugSuffix}>.reserva.am</span>
              <Button
                variant="accent"
                disabled={!isAdmin || !slugChanged || !slugValid || slug.length < 2 || slugSaving}
                onClick={saveSlug}
              >
                {slugSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <div className={s.slugHint}>
              {savedSlug
                ? <>Live at <strong>{savedSlug}.reserva.am</strong></>
                : <>No public address yet — your page is offline until you set one.</>}
            </div>
          </div>
        </div>
      </section>

      <section className={s.card}>
        <div className={s.cardHead}>
          <h2 className={s.cardTitle}>Bookings</h2>
          {!isAdmin && (
            <span className={s.adminOnly}><Lock size={12} /> Admin only</span>
          )}
        </div>

        <div className={s.row}>
          <div className={s.rowIcon}><CheckCircle2 size={18} /></div>
          <div className={s.rowBody}>
            <div className={s.rowTitle}>Auto-confirm online bookings</div>
            <div className={s.rowDesc}>
              When on, bookings made from your public page are confirmed automatically.
              When off, they arrive as <strong>pending</strong> and a staff member confirms
              each one manually.
            </div>
          </div>
          <Toggle
            checked={autoConfirm}
            disabled={!isAdmin || saving}
            onChange={toggleAutoConfirm}
          />
        </div>

        <div className={s.statusLine}>
          {autoConfirm ? (
            <>New online bookings are <strong className={s.on}>auto-confirmed</strong>.</>
          ) : (
            <>New online bookings start as <strong className={s.off}>pending</strong> until confirmed.</>
          )}
        </div>
      </section>
    </div>
  )
}
