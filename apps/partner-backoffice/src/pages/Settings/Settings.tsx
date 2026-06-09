import { useState, useEffect } from 'react'
import { CheckCircle2, Lock } from 'lucide-react'
import { Toggle, useToast } from '@/components/ui'
import { usePartner, useAppStore } from '@/store/app.store'
import { useIsAdmin } from '@/store/auth.hooks'
import { partnersService } from '@/services/partners.service'
import { ApiError } from '@/services/http'
import s from './Settings.module.scss'

export function Settings() {
  const partner = usePartner()
  const setPartner = useAppStore((st) => st.setPartner)
  const isAdmin = useIsAdmin()
  const toast = useToast()

  const [saving, setSaving] = useState(false)
  // Drive the toggle from LOCAL state so the visual flips instantly and never
  // depends on a global-store re-render round-trip (the previous source of the
  // "toast fired but toggle didn't move" bug). Seed + resync from the profile.
  const [autoConfirm, setAutoConfirm] = useState(partner?.autoConfirmBookings ?? false)
  useEffect(() => {
    setAutoConfirm(partner?.autoConfirmBookings ?? false)
  }, [partner?.autoConfirmBookings])

  if (!partner) return null

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
        <p className={s.sub}>Manage how your salon handles bookings.</p>
      </div>

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
